import { Router } from 'express'
import {
  addComment,
  deleteComment,
  getComments,
  updateComment,
} from '../controllers/comment.controller.js'
import { verifyJWT } from '../middlewares/authentication.middleware.js'
import { authorizeById } from '../middlewares/authorization.middleware.js'
import { Comment } from '../models/comment.model.js'

const router = Router()

router.use(verifyJWT) // Apply verifyJWT middleware to all routes in this file

router.route('/:mediaType/:postId').get(getComments).post(addComment)
router
  .route('/:commentId')
  .delete(
    authorizeById({ action: 'delete', subject: 'Comment', Model: Comment, param: 'commentId' }),
    deleteComment
  )
  .patch(
    authorizeById({ action: 'update', subject: 'Comment', Model: Comment, param: 'commentId' }),
    updateComment
  )

export default router
