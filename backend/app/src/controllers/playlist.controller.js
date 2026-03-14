import mongoose from 'mongoose'
import { Playlist } from '../models/playlist.model.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body
  const owner = req.user._id

  if (!name) {
    throw new ApiError(400, 'name is required')
  }

  const playlist = await Playlist.create({
    owner,
    name,
    description,
  })

  if (!playlist) {
    throw new ApiError(500, 'something went wrong, playlist is not created')
  }

  return res.status(200).json(new ApiResponse(200, playlist, 'playlist is created successfully'))
})

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, 'malformed request, invalid playlistId')
  }

  const playlist = await Playlist.findById(playlistId).populate({
    path: 'videos',
    populate: {
      path: 'owner',
      select: '_id username fullName avatar',
    },
  })

  if (!playlist) {
    throw new ApiError(404, 'playlist does not exist')
  }

  return res.status(200).json(new ApiResponse(200, playlist, 'playlist fetched successfully'))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, 'malformed request, invalid userid')
  }

  const playlists = await Playlist.find({ owner: userId }).populate({
    path: 'videos',
    populate: {
      path: 'owner',
      select: '_id username email fullName avatar',
    },
  })

  if (!playlists) {
    throw new ApiError(404, 'this user did not have any playlist')
  }

  return res.status(200).json(new ApiResponse(200, playlists, "user's playlists are fetched"))
})

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, 'malformed request, invalid playlistId')
  }

  const playlist = await Playlist.findByIdAndDelete(playlistId)

  if (!playlist) {
    throw new ApiError(404, 'playlist is not found')
  }

  return res.status(200).json(new ApiResponse(200, {}, 'playlist is deleted successfully'))
})

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params
  const { name, description } = req.body

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, 'malformed request, invalid playlistId')
  }

  if (!name && !description) {
    throw new ApiError(
      400,
      'malformed request, provide at least one parameter to update e.g. name, description'
    )
  }

  let updateDetails = {}
  if (name) {
    updateDetails.name = name
  }
  if (description) {
    updateDetails.description = description
  }

  const playlist = await Playlist.findByIdAndUpdate(playlistId, updateDetails, { new: true })

  if (!playlist) {
    throw new ApiError(404, 'playlist is not found')
  }

  return res.status(200).json(new ApiResponse(200, playlist, 'playlist is updated is successfully'))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, 'malformed request, invalid playlistId')
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, 'malformed request, invalid playlistId')
  }

  const playlist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $addToSet: { videos: videoId }, // addToSet is used to push into video array while also checking for duplicates
    },
    { new: true }
  )

  return res.status(200).json(new ApiResponse(200, playlist, 'video add in playlist successfully'))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, 'malformed request, invalid playlistId')
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, 'malformed request, invalid playlistId')
  }

  const playlist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $pull: { videos: videoId }, // pull is used to delete video from video array
    },
    { new: true }
  )

  return res.status(200).json(new ApiResponse(200, playlist, 'video add in playlist successfully'))
})

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
}
