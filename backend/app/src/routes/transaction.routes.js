import { Router } from 'express'
import { getCurrentUserBalance, transferMoney } from '../controllers/transaction.controller.js'

import { verifyJWT } from '../middlewares/authentication.middleware.js'

const router = Router()
router.use(verifyJWT)

router.route('/').get(getCurrentUserBalance)
router.route('/send').post(transferMoney)

export default router
