import mongoose from 'mongoose'
import { Video } from '../models/video.model.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import {
  generateThumbnailKey,
  generateTempVideoKey,
  generateVideoKey,
  generateUrl,
} from '../utils/s3KeyGenerators.js'
import { deleteByPrefixOnS3, generatePresignedUploadUrl } from '../services/s3.service.js'
import validator from 'validator'

const getAllVideos = asyncHandler(async (req, res) => {
  // get all videos based on query, sort, pagination
  //it can use default feed and search and also search inside channel

  const {
    query,
    channelId,
    sortBy = 'createdAt',
    sortType = 'desc',
    page = 1,
    limit = 10,
  } = req.query
  const queryObject = {}

  if (channelId) {
    if (mongoose.Types.ObjectId.isValid(channelId)) {
      queryObject.owner = channelId
    } else {
      throw new ApiError(400, 'invalid channelId')
    }
  }

  if (query) {
    queryObject.$or = [
      { title: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
    ]
  }

  if (sortType.toLowerCase() !== 'asc' && sortType.toLowerCase() !== 'desc') {
    throw new ApiError(400, 'use valid sorting method')
  }

  const sortStr = (sortType.toLowerCase() == 'desc' ? '-' : '') + sortBy

  const pageNo = Number(page)
  const limitNo = Number(limit)
  const skipNo = (pageNo - 1) * limitNo

  const videos = await Video.find(queryObject)
    .populate('owner', 'username fullName avatar')
    .skip(skipNo)
    .limit(limitNo)
    .sort(sortStr)

  return res.status(200).json(new ApiResponse(200, videos, 'all video fetched'))
})

const publishAVideo = asyncHandler(async (req, res) => {
  const owner = req.user._id
  const {
    title,
    description,
    isPublished,
    videoContentType,
    videoContentLength,
    videoChecksumSHA256,
    thumbnailContentType,
    thumbnailContentLength,
    thumbnailChecksumSHA256,
  } = req.body

  if (
    !title ||
    !description ||
    !videoContentType ||
    !videoContentLength ||
    !videoChecksumSHA256 ||
    !thumbnailContentLength ||
    !thumbnailChecksumSHA256 ||
    !thumbnailContentType ||
    !isPublished
  ) {
    throw new ApiError(400, 'required data is missing, fill required information')
  }

  let video = await Video.create({
    title,
    description,
    video: 'not found',
    thumbnail: 'not found',
    owner,
    isPublished,
  })

  const allowedThumbnailContentType = ['image/jpeg', 'image/png']

  if (!allowedThumbnailContentType.includes(thumbnailContentType)) {
    throw new ApiError(400, 'unsupported image format')
  }

  const THUMBNAIL_MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
  if (thumbnailContentLength > THUMBNAIL_MAX_IMAGE_SIZE) {
    throw new ApiError(400, 'thumbnail should not be more than 10MB')
  }

  if (!validator.isHash(thumbnailChecksumSHA256, 'sha256')) {
    throw new ApiError(400, 'Invalid Thumbnail SHA256 checksum')
  }

  const allowedVideoContentTypes = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/x-matroska',
    'video/x-mkv',
    'video/quicktime',
    'video/x-msvideo',
    'video/mpeg',
    'video/3gpp',
    'video/3gpp2',
    'video/x-flv',
  ]
  if (!allowedVideoContentTypes.includes(videoContentType)) {
    throw new ApiError(400, 'unsupported video format')
  }

  const VIDEO_MAX_IMAGE_SIZE = 5 * 1024 * 1024 * 1024 // 5GB
  if (videoContentLength > VIDEO_MAX_IMAGE_SIZE) {
    throw new ApiError(400, `VIDEO image should not be more than ${VIDEO_MAX_IMAGE_SIZE}`)
  }

  if (!validator.isHash(videoChecksumSHA256, 'sha256')) {
    throw new ApiError(400, 'Invalid Video SHA256 checksum')
  }

  const thumbnailKey = generateThumbnailKey(owner, video._id, thumbnailContentType)
  const thumbnailUrl = generateUrl(thumbnailKey)
  const thumbnailUploadUrl = await generatePresignedUploadUrl(
    thumbnailContentType,
    thumbnailContentLength,
    thumbnailChecksumSHA256,
    thumbnailKey
  )
  if (!thumbnailUploadUrl) {
    throw new ApiError(500, 'something went wrong, thumbnail upload presigned url is not generated')
  }

  const videoKey = generateTempVideoKey(owner, video._id, videoContentType)
  const videoUploadUrl = await generatePresignedUploadUrl(
    videoContentType,
    videoContentLength,
    videoChecksumSHA256,
    videoKey
  )

  if (!videoUploadUrl) {
    throw new ApiError(500, 'something went wrong, video upload presigned url is not generated ')
  }

  const transcodedVideoKey = generateVideoKey(owner, video._id) + 'master_video.m3u8'
  const transcodedVideoUrl = generateUrl(transcodedVideoKey)

  video = await Video.findByIdAndUpdate(
    video._id,
    {
      video: transcodedVideoUrl,
      thumbnail: thumbnailUrl,
    },
    { new: true }
  )

  return res
    .status(200)
    .json(new ApiResponse(200, { video, videoUploadUrl, thumbnailUploadUrl }, 'video is published'))
})

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params
  //TODO: get video by id
  const video = await Video.findById(videoId)

  if (!video) {
    throw new ApiError(404, 'video not found')
  }

  return res.status(200).json(new ApiResponse(200, video, 'video fetched successfully'))
})

const updateVideo = asyncHandler(async (req, res) => {
  //update video details like title, description, thumbnail
  const owner = req.user?._id
  const { videoId } = req.params
  const {
    title,
    description,
    isPublished,
    thumbnailContentType,
    thumbnailContentLength,
    thumbnailChecksumSHA256 /*view*/,
  } = req.body

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, 'malformed request, invalid userid')
  }

  let video = await Video.findById(videoId)

  let updateFields = {}
  if (title) updateFields.title = title
  if (description) updateFields.description = description
  updateFields.isPublished = isPublished
  //if(view)updateFields.view=view // updating views for testing purpose only

  let thumbnailUploadUrl
  if (thumbnailContentType) {
    if (thumbnailContentType != 'image/jpeg' && thumbnailContentType != 'image/png') {
      throw new ApiError(400, 'wrong content type, only image is supported')
    }

    const THUMBNAIL_MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
    if (thumbnailContentLength > THUMBNAIL_MAX_IMAGE_SIZE) {
      throw new ApiError(400, 'thumbnail should not be more than 10MB')
    }

    if (!validator.isHash(videoChecksumSHA256, 'sha256')) {
      throw new ApiError(400, 'Invalid Thumbnail SHA256 checksum')
    }

    const thumbnailKey = generateThumbnailKey(owner, video.title)
    const thumbnailUrl = generateUrl(thumbnailKey)
    thumbnailUploadUrl = await generatePresignedUploadUrl(
      thumbnailContentType,
      thumbnailContentLength,
      thumbnailChecksumSHA256,
      thumbnailKey
    )
    if (!thumbnailUploadUrl) {
      throw new ApiError(
        500,
        'something went wrong, thumbnail upload presigned url is not generated'
      )
    }

    updateFields.thumbnail = thumbnailUrl
  }

  if (Object.keys(updateFields).length == 0) {
    throw new ApiError(400, 'update data for video does not receive, enter anyone or more fields')
  }

  video = await Video.findByIdAndUpdate(videoId, updateFields, { new: true })

  if (video == null) {
    throw new ApiError(400, 'updated data is null so check video id')
  }
  return res
    .status(200)
    .json(new ApiResponse(200, { video, thumbnailUploadUrl }, 'video updated successfully'))
})

const deleteVideo = asyncHandler(async (req, res) => {
  //TODO: delete video
  const { videoId } = req.params

  const video = await Video.findByIdAndDelete(videoId)

  if (!video) {
    throw new ApiError(404, 'video not found')
  }

  const Prefix = `users/${video.owner}/${videoId}`

  await deleteByPrefixOnS3(Prefix)

  return res.status(200).json(new ApiResponse(200, {}, `Title: ${video.title} is deleted`))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params

  if (!videoId) {
    throw new ApiError(400, 'video does not found')
  }

  const video = await Video.findByIdAndUpdate(
    videoId,
    [{ $set: { isPublished: { $not: '$isPublished' } } }],
    { new: true }
  )

  return res.status(200).json(new ApiResponse(200, video, 'publish status is toggled successfully'))
})

export { getAllVideos, publishAVideo, getVideoById, updateVideo, deleteVideo, togglePublishStatus }
