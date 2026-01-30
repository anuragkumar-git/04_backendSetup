import { Router } from "express";
import { loginUser, logoutUser, refreshAccessToken, registerUser, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";
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
router.route("/update-avatar").post(
    verifyJWT,
    upload.fields([
        {
            name: "newAvatar",
            maxCount: 1
        }
    ]),
    updateUserAvatar
)
router.route("/update-coverimage").post(
    verifyJWT,
    upload.fields([
        {
            name: "newCoverImage",
            maxCount: 1
        }
    ]),
    updateUserCoverImage
)

export default router