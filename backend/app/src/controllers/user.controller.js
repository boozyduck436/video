import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";
import { deleteByPrefixOnS3, generatePresignedUploadUrl, stsOnS3 } from "../services/s3.service.js";
import { generateUserProfileImageKey,generateUserCoverImageKey, generateUrl,  } from "../utils/s3KeyGenerators.js";
import prisma from "../config/postgres.config.js";
import { console } from "inspector";



const cookieOptions={
    httpOnly: true,
    secure: true
}

const generateStsCredentials=asyncHandler(async (req,res) => {
    const response= await stsOnS3()

    res
    .status(200)
    .json(new ApiResponse(200,{response},"sts credentials generated succesfully"))
})

const generateAccessAndRefreshToken=async(userId)=>{
    try {
        const user=await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave: false})

        return{accessToken,refreshToken}
        
    } catch (error) {
        throw new ApiError(500," Something went wrong while genrating refresh and access token")
        
    }
}




const regsiterUser=asyncHandler(async(req,res)=>{
    
    // get user detail from frontend 
    const {username,email,fullName,password,profileFileType,coverFileType}=req.body

    //validation - not empty
    if([username,email,fullName,password,profileFileType].some((field)=>field?.trim()==="")){ 
        // field is just use to pass argument you can use any other name
        throw new ApiError(400,"required data is missing, fill required information")
    }

    // check if username contain @ then throw error
    if(username.includes("@")){
        throw new ApiError(400,"@ is not allow in username")
    }

    if(!email.includes("@")){
        throw new ApiError(400,"@ is required is email")
    }

    if(profileFileType!="image/jpeg" && profileFileType!="image/png"){
        throw new ApiError(400, "wrong content type, only jpeg and png are allowed")
    }


    if(coverFileType!="image/jpeg" && coverFileType!="image/png" && coverFileType!= " "){
        throw new ApiError(400, "wrong content type, only jpeg and png are allowed")
    }
        


    //check if user is alredy exist based on username or email
    const existedUser=await User.findOne({
        $or:[{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409,"user with this username or email already exist")
        
    }

    let user=await User.create({
        fullName,       
        username: username.toLowerCase(),
        avatar: "not found", 
        coverImage: "not found",
        email,
        password
    })


    // check for user creation
    if(!user){
        throw new ApiError(500,"something went wrong, user is not registred")
    }

    const avatarKey= generateUserProfileImageKey(user._id,profileFileType)
    const avatarUrl= generateUrl(avatarKey)
    const avatarUploadUrl = await generatePresignedUploadUrl(profileFileType,avatarKey)
    
    if(!avatarUploadUrl){
        throw new ApiError(500, "something went wrong , avatar presigned url is not genrated")
    }
    
    
    

    let coverUploadUrl,coverKey,coverUrl;
    if(coverFileType!= " "){
        coverKey= generateUserCoverImageKey(user._id,coverFileType)
        coverUploadUrl= await generatePresignedUploadUrl(coverFileType,coverKey)
        coverUrl= generateUrl(coverKey)
        if(!coverUploadUrl){
            throw new ApiError(500, "something went wrong, coverimage is not upload")
        }
        

    }

    user= await User.findByIdAndUpdate(
        user._id,
        {
        avatar: avatarUrl, // to using s3 path
        coverImage: coverUrl ||"", // to using s3 path or none
        },
        {new:true}
    )
    .select( // remove password and refresh tokenfield from response
        "-password -refreshToken"
    )


    const userBalance= await prisma.user.create(
        {
            data:{
                userid:user._id,
            }
        }
    )
    
    
    
    
    const response= {
        ...user._doc,
        balance:userBalance.balance,
        avatarUploadUrl,
        coverUploadUrl

    }
    



    //return res
    return res.status(201).json(
        new ApiResponse(200,response,"User registred sucessfully")
    )

})

const loginUser=asyncHandler(async (req,res)=>{
    
    // take username/email and password from req.body(front-end)
    console.log(req.body)
    const{identifier,password}=req.body
    
    //validation:- check fields are non empty
    if([identifier,password].some((field)=>field?.trim()==="")){
        throw new ApiError(400, "fill email/username and password")
    }

    // check is email/username exist
    const user=await User.findOne({
        $or:[{username:identifier},{email:identifier}]
    })

    if(!user)throw new ApiError(404,"username/email not exist")

    // valdate password corresponding to that username/email
    let isPasswordValid = await user.isPasswordCorrect(password)
    
    if(!isPasswordValid)throw new ApiError(401,"Invalid Password")

    // create refresh token and access token
    const{accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id)
    
    // create new object for send as response and create cokkie option(set gobally in this file)
    const loggedInUser=await User.findById(user._id)
    .select("-password -refreshToken")

    const userBalance= await prisma.user.findUnique(
        {
            where:{
                userid:user._id
            }
        }
    )

    const response={
        ...loggedInUser._doc,
        balance: userBalance.balance,
        accessToken,
        refreshToken
        
    }
    
    //send res with cokkie
    return res
    .status(200)
    .cookie("accessToken",accessToken,cookieOptions)
    .cookie("refreshToken",refreshToken,cookieOptions)
    .json(new ApiResponse(200,{response},"User logged in successfully"))


})

const logoutUser=asyncHandler(async(req,res)=>{

    const userBefore = await User.findById(req.user._id);
    console.log('Current refreshToken:', userBefore.refreshToken);

    const updatedUser=await User.findByIdAndUpdate(req.user._id,{$unset:{refreshToken:1}},{new:true})
    
    console.log('Updated refreshToken:', updatedUser.refreshToken);

    return res
    .status(200)
    .clearCookie("accessToken",cookieOptions)
    .clearCookie("refreshToken",cookieOptions)
    .json(new ApiResponse(200,{},"user logged out "))
})

const refreshToken=asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized Request")
    }
    
    try {
        const decodedRefreshToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    
        const user= await User.findById(decodedRefreshToken?._id)
    
        if(!user){
            throw new ApiError(401,"invalid refresh token")
        }
    
        if(incomingRefreshToken!==user?.refreshToken){
            /* TASK: trgier logout route here as user can not able tot acesss secure route 
            but user is still login */
            // also look futher if we add this functionality other way
    
            throw new ApiError(401,"refresh token is expired or used")
        }
    
        const{newAccessToken,newRefreshToken}= await generateAccessAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",newAccessToken,cookieOptions)
        .cookie("refreshToken",newRefreshToken,cookieOptions)
        .json(
            new ApiResponse(
                200,
                {accessToken:newAccessToken,refreshToken:newRefreshToken},
                "Accesstoken and Refresh token are refreshed "
            )
        )
    
    } catch (error) {
        throw new ApiError(401,error?.message||"invalid refresh token")
        
    }
    


})

const changeCurrentPassword=asyncHandler(async(req,res)=>{

    const {currentPassword,newPassword}=req.body
    
    const user= await User.findById(req.user?._id)

    if(!user){
        throw new ApiError(401,"invalid access token")
    }

    const isPasswordCorrect=await user.isPasswordCorrect(currentPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"current password is invalid")
    }

    user.password=newPassword
    await user.save({validateBeforeSave:false})


    return res
    .status(200)
    .json(new ApiResponse(200,{},"password is changed successfully"))

})

const getCurrentUser=asyncHandler(async(req,res)=>{

    let user=req.user

    const userBalance= await prisma.user.findUnique(
        {
            where:{
                userid:user._id
            }
        }
    )

    const response={
        ...user._doc,
        balance: userBalance.balance
        
    }

    

    return res
    .status(200)
    .json(new ApiResponse(200,response,"current user fetched successfully"))
})

const updateUserDetails=asyncHandler(async(req,res)=>{
    const{email,fullName}=req.body
    if(!email || !fullName){
        throw new ApiError(400,"all fields are required")
    }
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email
            }

        },
        {new:true}
    ).select("-password -refreshToken")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"account detail updated successfully"))

    
    
})

const updateUserAvatar=asyncHandler(async(req,res)=>{
    
    const {profileFileType}=req.body
    const owner= req.user?._id

    if(profileFileType!="image/jpeg" && profileFileType!="image/png"){
        throw new ApiError(400, "wrong content type, only jpeg and png are allowed")
    }

    const avatarKey= generateUserProfileImageKey(owner,profileFileType)
    
    const avatarUploadUrl = await generatePresignedUploadUrl(profileFileType,avatarKey)
    
    const avatarUrl= generateUrl(avatarKey)
    
    if(!avatarUploadUrl){
        throw new ApiError(500, "something went wrong , avatar presigned url is not genrated")
    }




    const user=await User.findByIdAndUpdate(
        owner,
        {
            $set:{
                avatar:avatarUrl
            }
        },
        {new:true})
        .select("-password -refreshToken")

    return res
    .status(200)
    .json(new ApiResponse(200,{user,avatarUploadUrl},"avatar image updated successfully"))

    
})

const updateUserCoverImage=asyncHandler(async(req,res)=>{
    
    const {coverFileType}=req.body
    const owner= req?.user?._id

        const coverKey= generateUserCoverImageKey(owner,coverFileType)
        const coverUploadUrl= await generatePresignedUploadUrl(coverFileType,coverKey)
        const coverUrl= generateUrl(coverKey)
        if(!coverUploadUrl){
            throw new ApiError(500, "something went wrong, coverimage is not upload")
        }



    const user= await User.findByIdAndUpdate(
        owner,
        {
            $set:{
                coverImage: coverUrl
            }
        },
        {new:true})
        .select("-password -refreshToken")

    return res
    .status(200)
    .json(new ApiResponse(200,{user,coverUploadUrl},"cover image updated successfully"))

    
})


const deleteUser= asyncHandler(async (req,res)=>{

    const userId= req.user?._id

    const user= await User.findByIdAndDelete(userId)
    if(!user){
        throw new ApiError(404,"user not found")
    }
    console.log(userId)

    const userBalance = await prisma.user.delete(
        {
            where: {userid:userId}
        }
    )
    
    const Prefix= `users/${userId}/`
    await deleteByPrefixOnS3(Prefix)

    return res
    .status(200)
    .json(new ApiResponse(200,{},`username: ${user.username} is deleted`))


})

const getUserChannelProfile= asyncHandler(async(req,res)=>{
    const {username}=req.params
    
    if(!username?.trim()){
        throw new ApiError(400,"username is missing")
    }

    const channel=await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()//it will find id on bases of username
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                foreignField: "channel",
                localField: "_id",
                as:"subscribers"// to get no. of subscriber of channel
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                foreignField: "subscriber",
                localField: "_id",
                as:"subscribedTo"// to get no. of channel owner subcription
            }
        },
        {
            $addFields:{
                subscriberCount:{
                    $size:"$subscribers"
                },
                channelSubscribeToCount:{
                    $size:"$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if:{$in:[req.body?._id,"$subscribers.subscriber"]},
                        /*here $subscribers refer to alredy selected collection  of object for 
                        specific channelid(technically it is userid) from subscriber database*/
                        then:true,
                        else:false
                    }
                }
            }

        },
        {
            $project:{
                fullName:1,
                username:1,
                email:1,
                avatar:1,
                coverImage:1,
                subscriberCount:1,
                channelSubscribeToCount:1,  
                isSubscribed:1


            }
        }
 
    ])
    
    console.log(channel)//testing
    
    if(!channel.length){
        throw new ApiError(404,"channel does not exist")
    }


    return res
    .status(200)
    .json(new ApiResponse(200,channel[0],"user channel fetched successfully"))
    
})

const getWatchHistory =asyncHandler(async(req,res)=>{
    if(!req.user._id){throw new ApiError(400,"user not found")}
    
    const user= await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"video",
                foreignField: "_id",
                localField:"watchHistory",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"user",
                            foreignField:"_id",
                            localField:"owner",
                            as:"owner",
                            pipeline:[
                                {
                                    $project:{
                                        fullName:1,
                                        username:1,
                                        avatar:1                                   
                                    }
                                }
                            ]
                        }
                    }
                ]
            }

        },
        {
            $addFields:{
                owner:{
                    $first:"$owner"
                }
            }
        }
        
    ])

    return res
    .status(200)
    .json(new ApiResponse(200,user[0],"watch history fetched successfully"))
    
})



export {
    regsiterUser,
    loginUser,
    logoutUser,
    getCurrentUser,
    refreshToken,
    changeCurrentPassword,
    updateUserDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
    deleteUser,
    generateStsCredentials
}