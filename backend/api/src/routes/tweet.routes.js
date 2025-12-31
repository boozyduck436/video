import { Router } from 'express';
import {
    createTweet,
    deleteTweet,
    getUserTweets,
    updateTweet,
} from "../controllers/tweet.controller.js"
import {verifyJWT} from "../middlewares/authentication.middleware.js"
import { authorizeById } from '../middlewares/authorization.middleware.js';
import { Tweet } from '../models/tweet.model.js';

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/")
    .post(createTweet);

router.route("/:userId")
    .get(getUserTweets);

router.route("/:tweetId")
    .patch(
        authorizeById({ action: "update", subject: "Tweet", Model: Tweet, param: "tweetId" }),
        updateTweet
    )
    .delete(
        authorizeById({ action: "delete", subject: "Tweet", Model: Tweet, param: "tweetId" }),
        deleteTweet
    );

export default router