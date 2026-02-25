import mongoose from 'mongoose'
import { Comment } from '../models/comment.model.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { Video } from '../models/video.model.js'

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const owner = req?.user._id
  const { content } = req?.body
  const { postId, mediaType } = req?.params

  if (
    !owner ||
    !content ||
    !postId ||
    (mediaType !== 'Video' && mediaType !== 'Tweet' && mediaType !== 'Comment')
  ) {
    throw new ApiError(400, 'malformed comment')
  }

  const comment = await Comment.create({
    owner,
    content,
    postId,
    mediaType,
  })

  if (!comment) {
    throw ApiError(500, 'something went wrong, comment is not posted')
  }

  return res.status(200).json(new ApiResponse(200, comment, 'comment posted successfully'))
})

const getComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  //new TODO: populate is comment is liked by current login user
  const { mediaType, postId } = req.params
  const { page = 1, limit = 10, sortBy = 'createdAt', sortType = 'desc' } = req.query

  if (mediaType !== 'Video' && mediaType !== 'Tweet' && mediaType !== 'Comment') {
    throw new ApiError(400, 'malformed request, use correct media type')
  }

  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw new ApiError(400, 'malformed request, invalid postId')
  }

  const pageNo = Number(page)
  const limitNo = Number(limit)
  const skipNo = (pageNo - 1) * limitNo

  if (sortType.toLowerCase() !== 'asc' && sortType.toLowerCase() !== 'desc') {
    throw new ApiError(400, 'use valid sorting method')
  }

  const sortStr = (sortType.toLowerCase() == 'desc' ? '-' : '') + sortBy

  const comments = await Comment.find({ mediaType, postId })
    .skip(skipNo)
    .limit(limitNo)
    .sort(sortStr)

  if (!comments) {
    throw ApiError(404, 'comments did not exist')
  }

  return res.status(200).json(new ApiResponse(200, comments, 'comment fetched successfully'))
})

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params
  const { updatedContent } = req.body

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, 'malformed request, invalid commentId')
  }

  const comment = await Comment.findByIdAndUpdate(
    commentId,
    { content: updatedContent },
    { new: true }
  )
  if (!comment) {
    throw new ApiError(404, 'comment is not found')
  }

  return res.status(200).json(new ApiResponse(200, comment, 'comment updated successfully'))
})

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, 'malformed request, invalid commentId')
  }

  const comment = await Comment.findByIdAndDelete(commentId)

  if (!comment) {
    throw new ApiError(404, 'comment does not exist')
  }

  return res.status(200).json(new ApiResponse(200, {}, 'comment deleted successfully'))
})

export { getComments, addComment, updateComment, deleteComment }
