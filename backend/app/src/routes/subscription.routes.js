import { Router } from 'express'
import {
  getSubscriptionDetail,
  createSubscription,
  deleteSubscription,
  getSubscribedChannelsList,
  getUserChannelSubscribersList,
} from '../controllers/subscription.controller.js'
import { verifyJWT } from '../middlewares/authentication.middleware.js'
import { authorizeById } from '../middlewares/authorization.middleware.js'
import { Subscription } from '../models/subscription.model.js'

const router = Router()
router.use(verifyJWT) // Apply verifyJWT middleware to all routes in this file

router.route('/channel/:channelId').post(createSubscription).get(getSubscriptionDetail)

router.route('/subscription/:subscriptionId').delete(
  authorizeById({
    action: 'delete',
    subject: 'Subscription',
    Model: Subscription,
    param: 'subscriptionId',
  }),
  deleteSubscription
)

router.route('/SubscribersList/:channelId').get(getUserChannelSubscribersList) // own subscriber

router.route('/SubscriptionList/:subscriberId').get(getSubscribedChannelsList)

export default router
