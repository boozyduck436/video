import { Router } from 'express'
import { liveness, readiness } from '../controllers/healthcheck.controller.js'

const router = Router()

router.route('/live').get(liveness)
router.route('/ready').get(readiness)

export default router
