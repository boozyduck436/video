import { Router } from 'express';
import {
    getChannelStats
} from "../controllers/dashboard.controller.js"
import {verifyJWT} from "../middlewares/authentication.middleware.js"

const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/stats/:username").get(getChannelStats);


export default router