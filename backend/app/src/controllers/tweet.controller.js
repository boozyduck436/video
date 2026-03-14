import { Tweet } from '../models/tweet.model.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const createTweet = asyncHandler(async (req, res) => {
  const owner = req.user._id
  const { content } = req.body

  if (!owner || !content) {
    throw new ApiError(400, 'malformed tweet or tweet is empty')
  }

  const tweet = await Tweet.create({
    owner,
    content,
  })

  if (!tweet) {
    throw new ApiError(500, 'something went wrong, tweet is not posted')
  }

  return res.status(200).json(new ApiResponse(200, tweet, 'tweet posted successfully'))
})

const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params
  const tweets = await Tweet.find({ owner: userId }).populate('owner', 'avatar fullName username')

  if (!tweets) {
    throw new ApiError(404, 'tweet not found')
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, 'all tweets of current user are fetched'))
})

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params
  const { content } = req.body

  if (!tweetId || !content) {
    throw new ApiError(400, 'malformed update request')
  }

  const tweet = await Tweet.findOneAndUpdate({ _id: tweetId }, { content }, { new: true })

  return res.status(200).json(new ApiResponse(200, tweet, 'tweet is updated'))
})

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params

  if (!tweetId) {
    throw new ApiError(400, 'malformed delete request')
  }

  const tweet = await Tweet.findByIdAndDelete(tweetId)

  return res.status(200).json(new ApiResponse(200, tweet, 'tweet is deleted'))
})

export { createTweet, getUserTweets, updateTweet, deleteTweet }
