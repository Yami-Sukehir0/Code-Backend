import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try { //retrieving accesstoken from cookies
        // const token = req.cookies?.accessToken || req.header("Authorization"?.replace("Bearer ", ""));
        const token =
            req.cookies?.accessToken ||
            (req.header("Authorization")?.startsWith("Bearer ")
                ? req.header("Authorization").replace("Bearer ", "").trim()
                : null);
        //availabilityy of accesstoken
        if (!token) {
            throw new ApiError(402, "Unauthorized Access")
        }

        //if token available then decode it
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        //finding user from decodedtoken
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

        if (!user) {
            throw new ApiError(407, "Invalid Access Token")
        }

        //if user is found then save its instance
        req.user = user
        next() //jumps to next route

    } catch (error) {
        throw new ApiError(409, error?.message || "Invalid Access Token")
    }


})