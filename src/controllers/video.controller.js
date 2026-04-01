import { User } from "../models/user.model.js"
import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"

const publishVideo = asyncHandler(async (req, res) => {
    // loggedin user -> upload video -> store in db
    // Video
    // thumbnail
    // title
    // description
    // owner
    // duration
    const { title, description } = req?.body || null
    // console.log(req.body);

    // console.log(title, description)
    if (!title || !description) {
        throw new ApiError(400, "Video title and descriptions are required!!")
    }

    const videoLocalPath = req.files?.videoFile[0]?.path
    const thumbnailLocalPath = req.files?.thumbnailFile[0]?.path || null
    // console.log('Files', req.files);
    // console.log('thumbnailFileObject', req.files?.thumbnailFile[0]);
    // console.log('thumbnailLocalPath', req.files?.thumbnailFile[0]?.path);

    if (!videoLocalPath) {
        throw new ApiError(400, "Video is required!!")
    }
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required!!")
    }

    const videoFile = await uploadOnCloudinary(videoLocalPath)

    let thumbnailFile
    if (thumbnailLocalPath) {
        thumbnailFile = await uploadOnCloudinary(thumbnailLocalPath)
    }

    if (!videoFile) {
        throw new ApiError(400, "Video failed to upload, cloudinary")
    }
    const video = await Video.create({
        videoFile: videoFile.url,
        duration: videoFile.duration,
        thumbnailFile: thumbnailFile?.url || "",
        title,
        description,
        owner: req?.user?._id
    })

    if (!video) {
        await deleteFileonCloudinary(videoFile?.url)
        await deleteFileonCloudinary(thumbnailFile?.url)
        throw new ApiError(500, "Video upload failed!!")
        // and delete assests from cloudinary
    }
    return res.status(201).json(
        new ApiResponse(201, video, "Video uploaded Successfully"))

})

const getVideoById = asyncHandler(async (req, res) => {

    const { id } = req.params
    if (!id) {
        throw new ApiError(400, "video id is rquired!!")
    }

    const videoDocument = await Video.findById(id) 

    if (!videoDocument) {
        throw new ApiError(404, "Video doesn't exsist")
    }

    await User.findOneAndUpdate(
        {
            _id: req?.user?._id
        },
        {
            $addToSet: {
                watchHistory: id
            }
        }
    )

    await Video.updateOne(
        {
            _id: id
        },
        {
            $inc: {
                views: 1
            }
        })


    return res.status(200).json(
        new ApiResponse(200, videoDocument, "Video found.")
    )
})


const getVideoFeed = asyncHandler(async (req, res) => {
    // allvideos -> their creater details
    // videos -> from: users
    // localfield -> owner
    // foreign field -> _id
    // as-> creater
    const feed = await Video.aggregate(
        [
            {
                $match: {
                    isPublished: true
                }
            },
            // how to send as object
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "creater",
                    pipeline: [
                        {
                            $project: {
                                fullName: 1,
                                userName: 1,
                                avatar: 1
                            }
                        }
                    ]
                }
            }
        ]
    )

    if (!feed?.length) {
        throw new ApiError(500, "Failed to load feed")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                feed,
                "feed fached sucessfully"
            )
        )
})

export {
    publishVideo,
    getVideoById,
    getVideoFeed,
}
