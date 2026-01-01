import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/authentication.middleware.js";
import { 
    changeCurrentPassword, 
    getCurrentUser, 
    getUserChannelProfile, 
    getWatchHistory, 
    loginUser, 
    logoutUser, 
    refreshToken, 
    regsiterUser, 
    updateUserAvatar, 
    updateUserCoverImage, 
    updateUserDetails,
    deleteUser,
    generateStsCredentials
} from "../controllers/user.controller.js";
import { authorizeById } from '../middlewares/authorization.middleware.js';

const router=Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount:1
        },
        {
            name: "coverImage",
            maxCount:1
        }

    ]),
    regsiterUser)
router.route("/login").post(loginUser)

//secure route

router.route("/logout").post(verifyJWT,logoutUser)

router.route("/refreshToken").post(refreshToken) // refreshToken route jwt vefication happen inside it controller
router.route("/getCurrentUser").get(verifyJWT,getCurrentUser)
router.route("/changeCurrentPassword").post(verifyJWT,changeCurrentPassword)
router.route("/updateUserDetails").patch(verifyJWT,updateUserDetails)
router.route("/updateUserAvatar").patch(
    verifyJWT,
    upload.single("avatar"),
    updateUserAvatar
)
router.route("/updateUserCoverImage").patch(
    verifyJWT,
    upload.single("coverImage"),
    updateUserCoverImage
)
router.route("/channel/:username").get(verifyJWT,getUserChannelProfile)
router.route("/history").get(verifyJWT,getWatchHistory)
router.route("/").delete(verifyJWT,deleteUser)
router.route("/sts").post(verifyJWT,generateStsCredentials)
export default router