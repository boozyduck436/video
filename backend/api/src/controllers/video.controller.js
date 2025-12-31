import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { generateThumbnailKey, generateTempVideoKey, generateUrl } from "../utils/s3KeyGenerators.js"
import { deleteByPrefixOnS3, generatePresignedUploadUrl } from "../services/s3.service.js"


const getAllVideos = asyncHandler(async (req, res) => {
    //TODO: get all videos based on query, sort, pagination
    //it can use default feed and search and also search inside channel

    const {query,channelId, sortBy="createdAt", sortType="desc", page = 1, limit = 10 } = req.query
    console.log(query)
    const queryObject={}
    
    if (channelId) {
            if(mongoose.Types.ObjectId.isValid(channelId)){
                queryObject.owner=channelId
            } else{
                throw new ApiError(400,"invalid channelId")
            }
    }

    if (query) {
        queryObject.$or=[
            {title:{$regex:query,$options:"i"}},
            {description:{$regex:query,$options:"i"}}
        ]
        
    }



    if(sortType.toLowerCase()!=="asc" && sortType.toLowerCase()!=="desc"){
        throw new ApiError(400,"use vaild sorting method")
    }
    
    const sortStr=(sortType.toLowerCase()=="desc"?"-":"")+sortBy
    
    const pageNo=Number(page)
    const limitNo=Number(limit)
    const skipNo=(pageNo-1)*limitNo

    const videos= await Video.find(queryObject)
    .populate("owner","username fullName avatar")
    .skip(skipNo)
    .limit(limitNo)
    .sort(sortStr)
    
    return res
    .status(200)
    .json(new ApiResponse(200,videos,"all video feched"))
})

const publishAVideo = asyncHandler(async (req, res) => {
    // TODO: get video, upload to cloudinary, create video
    const owner=req.user._id
    const {title, description,isPublished,videoFileType,thumbnailFileType} = req.body


    if(!title || !description || !videoFileType || !thumbnailFileType || !isPublished){
        throw new ApiError(400,"required data is missing, fill required information")
    }

    let video = await Video.create(
        {
            title,
            description,
            video:"not found",
            thumbnail:"not found",
            owner,
            isPublished
        }
    )
    
    const allowedThumbnailType=["image/jpeg","image/png"]

    if(!allowedThumbnailType.includes(thumbnailFileType)){
        throw new ApiError(400, "unsupported image format")
    }
    


    const allowedVideoTypes = [
        "video/mp4",
        "video/webm",
        "video/ogg",
        "video/x-matroska",
        "video/x-mkv",
        "video/quicktime",
        "video/x-msvideo",
        "video/mpeg",
        "video/3gpp",
        "video/3gpp2",
        "video/x-flv"
    ];

    if (!allowedVideoTypes.includes(videoFileType)){
        throw new ApiError(400, "unsupported video format")

    }

    const thumbnailKey=generateThumbnailKey(owner,video._id,thumbnailFileType)
    const thumbnailUrl=generateUrl(thumbnailKey)
    const thumbnailUploadUrl= await generatePresignedUploadUrl(thumbnailFileType,thumbnailKey)
    if(!thumbnailUploadUrl){
        throw new ApiError(500,"something went wrong, thumbnail upload presigned url is not generated")
    }

    
    const videoKey= generateTempVideoKey(owner,video._id,videoFileType)
    const videoUrl= generateUrl(videoKey)
    const videoUploadUrl= await generatePresignedUploadUrl(videoFileType,videoKey)

    if(!videoUploadUrl){
        throw new ApiError(500,"something went wrong, video upload presigned url is not genreated ")
    }

    video=await Video.findByIdAndUpdate(
        video._id,
        {
            video:videoUrl,
            thumbnail:thumbnailUrl
            
        },
        {new:true}

    )
    



    console.log(video)
    return res
    .status(200)
    .json(new ApiResponse(200,{video,videoUploadUrl,thumbnailUploadUrl},"video is published"))
    
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    const video= await Video.findById(videoId)

    if(!video){
        throw new ApiError(404,"video not found")
    }
    
    return res
    .status(200)
    .json(new ApiResponse(200,video,"video fetched successfully"))
    
})

const updateVideo = asyncHandler(async (req, res) => {
    //TODO: update video details like title, description, thumbnail  
    const owner = req.user?._id  
    const { videoId } = req.params
    const {title,description,isPublished,thumbnailFileType,/*view*/}=req.body

    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400,"malformed request, invalid userid")
    }

    let video= await Video.findById(videoId)


    let updateFields={}
    if(title)updateFields.title=title
    if(description)updateFields.description=description
    updateFields.isPublished=isPublished
    //if(view)updateFields.view=view // updating views for testing purpose only

    let thumbnailUploadUrl
    if(thumbnailFileType){

        if(thumbnailFileType!="image/jpeg" && thumbnailFileType!="image/png"){
            throw new ApiError(400, "wrong content type, only image is supported")
        }

        const thumbnailKey=generateThumbnailKey(owner,video.title)
        const thumbnailUrl=generateUrl(thumbnailKey)
        thumbnailUploadUrl= await generatePresignedUploadUrl(thumbnailFileType,thumbnailKey)
        if(!thumbnailUploadUrl){
            throw new ApiError(500,"something went wrong, thumbnail upload presigned url is not generated")
        }

        updateFields.thumbnail=thumbnailUrl

    }


    if(Object.keys(updateFields).length==0){
        throw new ApiError(400,"update data for video does not receive, enter anyone or more fields")
        
    }

    video=await Video.findByIdAndUpdate(
        videoId,
        updateFields,
        {new:true}
    )
    


    if(video==null){
        throw new ApiError(400,"updated data is null so check video id")
    }
    return res
    .status(200)
    .json(new ApiResponse(200,{video,thumbnailUploadUrl},"video updated successfully"))

})

const deleteVideo = asyncHandler(async (req, res) => {
    //TODO: delete video
    const { videoId } = req.params

    const video=await Video.findByIdAndDelete(videoId)

    if(!video){
        throw new ApiError(404,"video not found")
    }

    const Prefix= `users/${video.owner}/${videoId}`

    await deleteByPrefixOnS3(Prefix)

    


    return res
    .status(200)
    .json(new ApiResponse(200,{},`Title: ${video.title} is deleted`))

    
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!videoId){
        throw ApiError(400,"video does not found")
    }
    
    const video=await Video.findByIdAndUpdate(videoId,
        [{$set:{isPublished:{$not:"$isPublished"}}}],
        {new:true}
    )
    console.log(video)
    
    return res
    .status(200)
    .json(new ApiResponse(200,video,"publish status is toggled sucessfully"))

})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
