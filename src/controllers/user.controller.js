import { User } from '../models/user.model.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'

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

    if (!userName || !email) {
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
        .cookie("AccessToken", accessToken, options)
        .cookie("RefreshToken", refreshToken)
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
            $set: {
                refreshToken: undefined
            },
        },
        {
            new: true // to get updated user
        }
    )

    const options = {
        htttpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cleareCookie("accessToken", options) //Cookie parser ni den
        .cleareCookie("refreshToken", options) //Cookie parser ni den
        .json(new ApiResponse(200, {}, "User Logged Out"))
})


export {
    registerUser,
    loginUser,
    logoutUser,
}