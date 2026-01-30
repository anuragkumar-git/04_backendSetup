import { Router } from "express";
import {
    changeCurrentPassword,
    getChannelProfile,
    getCurrentUser,
    getWatchHistory,
    loginUser,
    logoutUser,
    refreshAccessToken,
    registerUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router()

//! export {router}
router.route("/register").post(
    //Multer as middlewawwre
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser)

router.route("/login").post(loginUser)
router.route("/refresh-token").post(refreshAccessToken)

//secured routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/change-password").post(
    verifyJWT,
    changeCurrentPassword
)
router.route("/current-user").get(
    verifyJWT,
    getCurrentUser
)

// patch to update some values
router.route("/update-account").patch(
    verifyJWT,
    updateAccountDetails
)
// router.route("/update-avatar").patch(
router.route("/avatar").patch(
    verifyJWT,
    // upload.single("newAvatar"),
    upload.single("avatar"),
    updateUserAvatar
)
// router.route("/update-coverimage").patch(
router.route("/coverimage").patch(
    verifyJWT,
    // upload.single("newCoverImage"),
    upload.single("coverImage"),
    updateUserCoverImage
)
router.route("/channel/:username").get(
    verifyJWT,
    getChannelProfile
)
router.route("/history").get(
    verifyJWT,
    getWatchHistory
)

export default router