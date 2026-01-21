import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"

// export const verifyJWT = asyncHandler(async (req, res, next) => {
export const verifyJWT = asyncHandler(async (req, _, next) => { //unused res : _
    try {
        const token = req.cookies?.AccessToken || req.header("Authorization")?.replace("Bearer ", "")

        if (!token) {
            console.error("Token missing!!!");
            throw new ApiError(401, "Unauthorized Request")
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        if (!decodedToken) {
            console.log("Faild to verify token");
            throw new ApiError(500, "Somthing went wrong during token verification")
        }

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

        if (!user) {
            console.error('User not found, invalid Token')
            throw new ApiError(401, "Invalid Access Token")
        }
        req.user = user
        next()
    } catch (error) {
        console.error('Auth middleware Failed!!', error);
        throw new ApiError(401, error?.message || "Invalid Access token")
    }
})