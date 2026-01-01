import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createLike=asyncHandler(async(req,res)=>{
    const {mediaType,postId} = req?.params
    const likedBy=req?.user._id

    if(mediaType !== "Video" && mediaType!=="Tweet" && mediaType !=="Comment"){
        throw new ApiError(400, "malformed request, use correct media type")
    }

    if(!mongoose.Types.ObjectId.isValid(postId)){
        throw new ApiError(400,"malformed request, invalid postId")
    }

    const isPostliked=await Like.findOne(
        {
            likedBy,
            mediaType,
            postId
        }
    )

    if(isPostliked){
        throw new ApiError(401,"post is already liked")
    }

    
    const like=await Like.create(
        {
            likedBy,
            mediaType,
            postId
        }
    )

    if(!like){
        throw new ApiError(500," something went wrong, like is not added")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,like,"like is added successfully"))

})

const deleteLike=asyncHandler(async(req,res)=>{
    const {likeId}=req.params

    if(!mongoose.Types.ObjectId.isValid(likeId)){
        throw new ApiError(400,"malformed request, invalid likeId")
    }

    const like=await Like.findByIdAndDelete(likeId)

    if(!like){
        throw new ApiError(404,"like is not present")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,{},"like removed successfully")) 
})

const getPostLike = asyncHandler(async (req, res) => {
    //TODO: is liked by user or not and total like
    const {mediaType,postId} = req?.params
    const likedBy=req?.user._id

    if(mediaType !== "Video" && mediaType!=="Tweet" && mediaType !=="Comment"){
        throw new ApiError(400, "malformed request, use correct media type")
    }

    if(!mongoose.Types.ObjectId.isValid(postId)){
        throw new ApiError(400,"malformed request, invalid postId")
    }

    const isPostLiked=await Like.findOne(
        {
            likedBy,
            mediaType,
            postId
        }
    )

    const totalPostLike= await Like.countDocuments({mediaType,postId})
    
    
    let likeStatus
    if(isPostLiked){
        likeStatus=true
    } else{
        likeStatus=false
    }


    let response={
        likeStatus,
        isPostLiked,
        totalPostLike
        
    }



    if(isPostLiked){
        response.likeStatus=true
    } else{
        response.likeStatus=false
    }


    console.log(response)

    return res
    .status(200)
    .json(new ApiResponse(200,response,"get post like successfully"))



})

export {
    createLike,
    deleteLike,
    getPostLike
}