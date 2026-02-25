import { Router } from 'express'
import { getPostLike, createLike, deleteLike } from '../controllers/like.controller.js'
import { verifyJWT } from '../middlewares/authentication.middleware.js'
import { authorizeById } from '../middlewares/authorization.middleware.js'
import { Like } from '../models/like.model.js'

const router = Router()
router.use(verifyJWT) // Apply verifyJWT middleware to all routes in this file

router.route('/:mediaType/:postId').post(createLike).get(getPostLike)

router
  .route('/:likeId')
  .delete(
    authorizeById({ action: 'delete', subject: 'Like', Model: Like, param: 'likeId' }),
    deleteLike
  )

export default router
