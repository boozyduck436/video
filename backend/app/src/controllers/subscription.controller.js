import mongoose from 'mongoose'
import { Subscription } from '../models/subscription.model.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const createSubscription = asyncHandler(async (req, res) => {
  const { channelId: channel } = req.params
  const subscriber = req.user._id
  if (!mongoose.Types.ObjectId.isValid(channel)) {
    throw new ApiError(400, 'malformed request, invalid channelId')
  }

  const isSubscribed = await Subscription.findOne({ channel, subscriber }).select('_id')

  if (isSubscribed) {
    throw new ApiError(401, 'channel is already subscribed')
  }

  const subscription = await Subscription.create({ subscriber, channel })

  if (!subscription) {
    throw new ApiError(500, 'something went wrong, subscription is not created')
  }

  return res
    .status(200)
    .json(new ApiResponse(200, subscription, 'subscription is created successfully'))
})

const deleteSubscription = asyncHandler(async (req, res) => {
  const { subscriptionId } = req.params

  if (!mongoose.Types.ObjectId.isValid(subscriptionId)) {
    throw new ApiError(400, 'malformed request, invalid subscriberId')
  }

  const subscription = await Subscription.findByIdAndDelete(subscriptionId)

  if (!subscription) {
    throw new ApiError(404, 'subscription does not exist ')
  }

  return res.status(200).json(new ApiResponse(200, {}, 'channel unsubscribed successfully'))
})

const getSubscriptionDetail = asyncHandler(async (req, res) => {
  // check is subscribed
  // total no. subscriber of channel
  const { channelId: channel } = req.params
  const subscriber = req.user._id

  if (!mongoose.Types.ObjectId.isValid(channel)) {
    throw new ApiError(400, 'malformed request, invalid channelId')
  }

  const isSubscribed = await Subscription.findOne({ channel, subscriber })

  const totalSubscriber = await Subscription.countDocuments({ channel })

  let SubscriptionStatus
  if (isSubscribed) {
    SubscriptionStatus = true
  } else {
    SubscriptionStatus = false
  }

  const response = {
    SubscriptionStatus,
    isSubscribed, //gives id
    totalSubscriber,
  }

  return res
    .status(200)
    .json(new ApiResponse(200, response, 'subscription detail fetched successfully'))
})

const getUserChannelSubscribersList = asyncHandler(async (req, res) => {
  // controller to return subscriber list of a channel
  const { channelId } = req.params

  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, 'malformed request, invalid channelId')
  }

  const subscribersList = await Subscription.find({ channel: channelId }).populate(
    'subscriber',
    'avatar username fullName'
  )

  if (!subscribersList) {
    throw new ApiError(404, 'subscribers list is not exist')
  }

  return res
    .status(200)
    .json(new ApiResponse(200, subscribersList, 'subscriber list fetched successfully'))
})

const getSubscribedChannelsList = asyncHandler(async (req, res) => {
  // controller to return channel list to which user has subscribed
  const { subscriberId } = req.params

  if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
    throw new ApiError(400, 'malformed request, invalid subscriberId')
  }
  const subscriptionsList = await Subscription.find({ subscriber: subscriberId })

  if (!subscriptionsList) {
    throw new ApiError(404, 'subscriptions list is not found')
  }

  return res
    .status(200)
    .json(new ApiResponse(200, subscriptionsList, 'subscriptions list fetched successfully'))
})

export {
  createSubscription,
  deleteSubscription,
  getSubscriptionDetail,
  getUserChannelSubscribersList,
  getSubscribedChannelsList,
}
