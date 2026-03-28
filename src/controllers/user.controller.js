import { User } from '../models/user.model.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { deleteFileonCloudinary, uploadOnCloudinary } from '../utils/cloudinary.js'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

const generateAccessTokenAndRefreshTokens = async (userId) => {
    try {
        //?todo: skip this db call, argument user instead of userId
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })
        return { accessToken, refreshToken }
    } catch (error) {
        console.error("Generate token error", error);

        throw new ApiError(500, "Something went wrong while generation refresh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // extract data from req
    //validation !empty (In prod validations are stored in diff files like utils)
    // already exists?
    // req?images , req?avatar
    // upload -> cloudinary, avatar cloudinary url
    // db: create user obj
    // response : sucess,{user obj -password, -refreshToken} 
    // user created ? return res : error

    //req.url || req.body(FormData, jsonobj)
    const { userName, email, fullName, password } = req.body

    //! Other approch for validation?

    // if(fullName === ""){
    //     throw new ApiError(400, "FullName is required")
    // }

    if ([fullName, email, userName, password].some((field) => {
        field?.trim() === " "
    })) {
        throw new ApiError(400, "All Fields are required")
    }

    const userExists = await User.findOne({
        $or: [{ userName }, { email }]
    })

    if (userExists) {
        throw new ApiError(409, "User with Username or Email allready exsits")
    }

    // req.files by multer
    //recommand multer middleware
    // console.log("req.files", req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path
    // const coverImageLocalPaths = req.files?.coverImage[0]?.path
    // let arr = req.files.coverImage
    // console.log('condition 1', Boolean(req.files));
    // console.log('condition 2', Boolean(Array.isArray(req.files.coverImage)));
    // console.log('condition 3', Boolean(req.files.coverImage.length > 0));
    // console.log('condition 3 array length:', arr.length);

    let coverImageLocalPath
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files?.coverImage[0]?.path
        // console.log("coverImageLocalPath", coverImageLocalPath);
    }
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar required!!")
    }

    // console.log('Controller: avatarLocalPath\n', avatarLocalPath);
    // console.log('Controller: coverImageLocalPath\n', coverImageLocalPath);
    // console.log('Controller: coverImageLocalPaths\n', coverImageLocalPaths);

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    // const coverImage = await uploadOnCloudinary(coverImageLocalPath || coverImageLocalPaths)

    // console.log('avtar:', avatar);
    // console.log('coverImage:', coverImage);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is rquired, Cloudinary")
    }

    const user = await User.create({
        userName: userName.toLowerCase(),
        fullName,
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    })

    // console.log('user', user);

    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    // console.log('createdUser', createdUser);

    if (!createdUser) {
        throw new ApiError(500, "Somthing went wrong while regestering user")
    }

    // return res.status(201).json({createdUser})
    return res.status(201).json(
        new ApiResponse(201, createdUser, "User Registerd successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    //rq.body
    //validate
    //dbcall, find user
    //compare pass & generate tokens
    //res: access token and refresh token too
    //? in cookies
    //store refresh

    const { userName, email, password } = req.body

    // if (!(userName || email)) {
    if (!userName && !email) {
        throw new ApiError(400, "Username or Email is required!")
    }

    const user = await User.findOne({
        $or: [{ userName }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User doesn't exist")
    }

    //? schema methods can accessible by db response not from model
    //! await User // schema/model
    const validPassword = await user.isPasswordCorrect(password)

    if (!validPassword) {
        console.error(`InValid Password`)
        throw new ApiError(401, "Invalid User Credentials")
    }

    const { accessToken, refreshToken } = await generateAccessTokenAndRefreshTokens(user._id)

    //old user has no token so new call expensive find bit cheap way
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        htttpOnly: true, //only midified by server
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "User LoggedIn successfully"
            )
        ) //sending token so frntend can handle in diff approach like in mobiles app no access to cookies
})


const logoutUser = asyncHandler(async (req, res) => {
    // if(!accesstoken -> refreshToken),!refreshtoken -> logout
    //clear cookies, refresh and access.

    const userId = req.user._id

    await User.findOneAndUpdate(
        userId,
        {
            // $set: {
            //!     refreshToken: undefined
            //     refreshToken: null
            // },
            //Better approach why???
            $unset: {
                refreshToken: 1 //removes the field from document
            },
        },
        {
            new: true // to get updated user
        }
    )
    //! user.refreshToken: `token` | not updating user
    const options = {
        htttpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options) //Cookie parser ni den
        .clearCookie("refreshToken", options) //Cookie parser ni den
        .json(new ApiResponse(200, {}, "User Logged Out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    // cookie > refreshtoken
    // !refresh token -> logout
    // match token dbcall
    // !match remove from db, clear cookie.refreshToken
    // match-> gen accestoken
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken //body-mobile app

    if (!incomingRefreshToken) {
        console.error('No incomingRefreshToken!!')
        throw new ApiError(401, "Unauthorized Request")
    }

    try {
        //? create compare method like NEXORA
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
        }

        const options = {
            htttpOnly: true,
            secure: true
        }
        const { accessToken, newRefreshToken } = await generateAccessTokenAndRefreshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token Refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Refresh token proccedd failed")
    }
})


const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body

    // if(!(newPass === confPass)){
    //     error
    // }

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(
            400,
            "Invalid old Password"
        )
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Password Changed Successfully")
        )
})


const getCurrentUser = asyncHandler(async (req, res) => {

    return res
        .status(200)
        .json(
            new ApiResponse(
            200,
            req.user,
            "Current User Fetched successfully")
        )

    // const user = User.findById(req.user._id)
    // if (!user) {
    //     throw new ApiError(404, "User not found!!")
    // }
    // return res
    //     .status(200)
    //     .json(
    //         new ApiResponse(
    //             200,
    //             user,
    //             "User fetched successfully"
    //         )
    //     )
})

const updateAccountDetails = asyncHandler(async (req, res) => {

    const { fullName, email } = req.body

    if (!fullName && !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                // fullName: fullName,
                fullName,
                email
            }
        },
        { new: true }
    ).select("-password")
    // ).select("-password -refreshToken")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "Account details updated successfully"
            )
        )
})

//? to update files create diff endpoint and diff controller ex.if only: update img -> /update-img Reason: no need to save whole user again if only dp change-> /update-img. 

//two db calls(getUser, updateUserfiles) -> migrate in single if possible
const updateUserAvatar = asyncHandler(async (req, res) => {
    // const newAvatarLocalPath = req.files?.newAvatar[0]?.path
    const newAvatarLocalPath = req.file?.path
    // console.log("req.files", req.files);

    if (!newAvatarLocalPath) {
        throw new ApiError(400, "Avatar file is Missing!!")
    }

    const avatar = await uploadOnCloudinary(newAvatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar")
    }

    //Delete old avatar from cloudinary
    const getUserOldfiles = await User.findById(req.user?._id).select("-password -refreshToken -watchHistory")
    const oldAvatarPublicUrl = getUserOldfiles?.avatar
    await deleteFileonCloudinary(oldAvatarPublicUrl)

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                avatar: avatar.url
            },
        },
        {
            new: true
        }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            user,
            "Avatar Updated Successfully"
        ))
})

const updateUserCoverImage = asyncHandler(async (req, res) => {
    // const newCoverImageLocalPath = req.files?.newCoverImage[0]?.path
    const newCoverImageLocalPath = req.file?.path
    // console.log('newCoverImageLocalPath', newCoverImageLocalPath);

    // console.log("req.files", req.files);

    if (!newCoverImageLocalPath) {
        throw new ApiError(400, "CoverImage file is Missing!!")
    }

    const coverImage = await uploadOnCloudinary(newCoverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading coverImage")
    }

    //Delete old coverImage from cloudinary
    const getUserOldfiles = await User.findById(req.user?._id).select("-password -refreshToken -watchHistory")
    // console.log("User details for oldPublicCoverImageUrl", getUserOldfiles);

    const oldCoverImagePublicUrl = getUserOldfiles?.coverImage
    // console.log("oldCoverImagePublicUrl", oldCoverImagePublicUrl);

    // const deleteOldCoverImage = await deleteFileonCloudinary(oldCoverImagePublicUrl)
    // console.log("deleted coverImage file:", deleteOldCoverImage);
    await deleteFileonCloudinary(oldCoverImagePublicUrl)

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            },
        },
        {
            new: true
        }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(
            200,
            user,
            "coverImage Updated Successfully"
        ))
})


const getChannelProfile = asyncHandler(async (req, res) => {
    /*
Channle username from url
users collection -> find(username)
subcription collection -> subscribers: find(channel) -> countDocuments() = subscribers
subcription collection -> subscribedChannel: find(user) -> countDocuments() = subscribedChannel
populate/join subscription collection(subscribers && subscribed channels)
/// for follow button:userself == no follow button, 
if(!userSelf){
 subscription collection -> find subscribedchannles and -> check for channelname(id) 
} 
pipelins?
$lookup
$addfields
$first
$project
$in: lookin both array and objects also
for more aggrigation piplines:mongodb collection -> aggregation -> new stage.
*/

    /* chai aur code version---------*/
    const { username } = req.params

    if (!username.trim()) {
        throw new ApiError(400, "Usename is missing")
    }

    // User.aggregate([{}, {}, {}...])
    const channel = await User.aggregate(
        [
            {
                //match all documents username 
                $match: {
                    userName: username?.toLowerCase(),
                }
                //Single document: matching username whose channel searched
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers"
                }
                //subscriber documents(match based on channel: documents having same channel -> list users = subscribers )
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscriptions"
                }
                //subscriber documents(documents having same user -> list channels = subscriptions/subscribedTo)
            },
            {
                $addFields: {
                    subscribersCount: {
                        $size: "$subscribers"
                    },
                    subscriptionsCount: {
                        $size: "$subscriptions"
                    },
                    isSubscribed: {
                        //match loggedin user and sercheduser
                        $cond: {
                            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $project: {
                    fullName: 1,
                    userName: 1,
                    email: 1,
                    avatar: 1,
                    coverImage: 1,
                    subscribersCount: 1,
                    subscriptionsCount: 1,
                    isSubscribed: 1
                }
            }
        ]
    )

    console.log('channel', typeof (channel), channel);
    // Can we break pipline after first stage(!match return)
    if (!channel?.length) {
        throw new ApiError(404, "Channel not found")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channel[0],
                "User Channel fatched sucessfully"
            ))
})


const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            //In aggrigation pipline mongoose don't play role so user._id == String of id, we need objectId('id-String')
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        // ?lookup returns array
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            // as:"owner"
                            as: "creater",
                            pipeline: [
                                {
                                    //what if project outside lookup
                                    $project: {
                                        fullName: 1,
                                        userName: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                // $first:"$owner"
                                $first: "$creater"
                            }
                        }
                    }
                ]
            }
        },
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch history fetched Successfully"
            )
        )


})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getChannelProfile,
    getWatchHistory
}