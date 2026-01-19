import { User } from '../models/user.model.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js'

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

    const userExists = User.findOne({
        $or: [{ userName }, { email }]
    })

    if (userExists) {
        throw new ApiError(409, "User with Username or Email allready exsits")
    }

    // req.files by multer
    //recommand multer middleware
    console.log(`req.files:`, req.files)
    const avatarLocalPath = req.files?.avatar[0]?.path 
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar required!!")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary (coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400, "Avatar file is rquired, Cloudinary")
    }

    const user = awaitUser.create({
        userName: userName.toLowerCase(),
        fullName,
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ""
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if(!createdUser){
        throw new ApiError(500, "Somthing went wrong while regestering user")
    }

    // return res.status(201).json({createdUser})
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registerd successfully")
    )
})

export { registerUser }