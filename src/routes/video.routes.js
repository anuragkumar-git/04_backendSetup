import { Router } from "express"
import { publishVideo, getVideoById, getVideoFeed } from "../controllers/video.controller.js"
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router()
router.route("/upload-video").post(
    verifyJWT,
    upload.fields([
        {
            name: "videoFile",
            maxCount: 1
        },
        {
            name: "thumbnailFile",
            maxCount: 1
        }
    ]),
    publishVideo
)

router.route("/getvideo/:id").get(
    verifyJWT,
    getVideoById
)

router.route("/get-feed").get(
    verifyJWT,
    getVideoFeed
)
export default router