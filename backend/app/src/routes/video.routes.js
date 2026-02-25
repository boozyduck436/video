import { Router } from 'express'
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishAVideo,
  togglePublishStatus,
  updateVideo,
} from '../controllers/video.controller.js'
import { verifyJWT } from '../middlewares/authentication.middleware.js'
import { authorizeById } from '../middlewares/authorization.middleware.js'
import { Video } from '../models/video.model.js'

const router = Router()
router.use(verifyJWT) // Apply verifyJWT middleware to all routes in this file

router.route('/').get(getAllVideos).post(publishAVideo)

router
  .route('/:videoId')
  .get(getVideoById)
  .delete(
    authorizeById({ action: 'delete', subject: 'Video', Model: Video, param: 'videoId' }),
    deleteVideo
  )
  .patch(
    authorizeById({ action: 'update', subject: 'Video', Model: Video, param: 'videoId' }),
    updateVideo
  )

router
  .route('/toggle/publish/:videoId')
  .patch(
    authorizeById({ action: 'update', subject: 'Video', Model: Video, param: 'videoId' }),
    togglePublishStatus
  )

export default router
