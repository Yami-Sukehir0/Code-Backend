import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import bcrypt from "bcrypt";
//generating tokens using wrapper fxn
const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    //find user by id
    const user = await User.findById(userId);
    //generating tokens 
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    //saving refreshtoken in db
    user.refreshToken = refreshToken;
    user.save({ ValidateBeforeSave: false })

    //return tokens
    return { accessToken, refreshToken };
  } catch {
    throw new ApiError(500, "Something went wrong")
  }
}
const registerUser = asyncHandler(async (req, res) => {
  //  res.status(200).json({
  //     message: "Code-and-Deploy",
  // get details of the user
  // validation-not empty
  // check if already a user- email,username
  // check for images,avatars
  // upload on cloudinary to get url,avatar
  // create user object- create enrty in db
  // remove pwd and refreshtoken field from response
  // check for user creation
  // return response or error

  //1. getting details from the user
  const { fullname, email, password, username } = req.body; //details via form or json;
  // console.log("email:", email);
  // console.log(req.body);

  //2. checking validation i.e field is empty or not
  if (
    [fullname, email, username, password].some((field) => field?.trim === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }
  //3.checking if user exists already
  const existedUser = await User.findOne({ $or: [{ fullname }, { email }] });
  if (existedUser) {
    throw new ApiError(409, "User already exists,Please create a new one!");
  }

  //4.checking whether images and avatars are entered

  // const avatarLocalPath = await req.files?.avatar[0]?.path;
  // console.log(req.files);
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let avatarLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.avatar) &&
    req.files.avatar.length > 0
  ) {
    avatarLocalPath = req.files?.avatar[0].path;
  }
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = await req.files?.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar field is required");
  }

  //5. uploading on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  //6. Create entry in db
  var user = await User.create({
    fullname,
    avatar: avatar?.url || "Not uploaded yet",
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  //7. removing password and refreshTokken plus checking creation of user
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  //8. return response
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});
const loginUser = asyncHandler(async (req, res) => {
  //geting details from the req.body
  const { username, email, password } = req.body;
  console.log(req.body)
  //check username or email and password 
  if (!(username || email)) {
    throw new ApiError(401, "email or username is required!");
  }
  if (!password || password.trim() === "") {
    throw new ApiError(400, "Password is required!");
  }
  //check if user already exists
  const user = await User.findOne({ $or: [{ username }, { email }] });

  if (!user) {
    throw new ApiError(409, "No recorde for the user found");
  };
  console.log(user.password)
  console.log(password)
  //password check
  const isPasswordValid = await user.isPasswordCorrect(password);
  console.log("Password comparison result:", isPasswordValid);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }
  const loggedinUser = await User.findById(user._id).select("-password -refreshToken");

  //generate tokens
  const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id);

  //cookies
  const options = {
    httpOnly: true,
    secure: true
  }

  //return response
  return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(200,//status code
        {
          user: loggedinUser, accessToken, refreshToken //data
        },
        "User loggedIn successfully"

      )
    )



})

const logoutUser = asyncHandler(async (req, res) => {
  //getting user id from req.user and update the info
  const user = await User.findById(req.user._id).select(
    "-refreshToken")
  user.save({ ValidateBeforeSave: false })

  //cookies
  const options = {
    httpOnly: true,
    secure: true
  }

  //return response
  return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User loggedOut"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
  //getting refresh token from cookies
  const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken
  //check if token is present or not
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is required")
  }

  //verify refresh token
  const decodedToken = await jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

  if (!decodedToken) {
    throw new ApiError(402, "Token not found")
  }
  //find user by refreshtoken
  const user = await User.findById(decodedToken?._id);
  if (!user) {
    throw new ApiError(403, "Invalid Refresh token")
  }
  //check of refresh token is expired
  if (incomingRefreshToken !== user?.refreshToken) {
    throw new ApiError(406, "Refresh token expired")
  }
  //generate new tokens
  const { accessToken, refreshToken: newRefreshToken } = await generateAccessTokenAndRefreshToken(user._id)
  // //update refreshtoken in db
  // user.refreshToken = newRefreshToken;
  // user.save({ ValidateBeforeSave: false })

  //cookies
  const options = {
    httpOnly: true,
    secure: true
  }

  //return response
  return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(new ApiResponse(200, { accessToken, newRefreshToken }, "Tokens refreshed successfully"))
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
  //fetch password properties fom req.body
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  if (!oldPassword) {
    throw new ApiError(400, "Old password is required");
  }
  const isPasswordCorrect = await isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Old password is incorrect");
  }

  user.password = newPassword  //setting the new password
  user.save({ ValidateBeforeSave: false }) //saving the new password

  // return response
  return res.status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))

})

const getCurrentUser = asyncHandler(async (req, res) => {
  //return response
  return res.status(200).json(new ApiResponse(200, req.user, "User fetched successfully"))
})
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { username, email } = req.body;

  //check username or email and password
  if (!(username || email)) {
    throw new ApiError(401, "email or username is required!");
  }
  User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        username,
        email
      }
    },
    {
      new: true
    }).select("-password ")

  return res.status(200).json(new ApiResponse(200, {}, "User updated successfully"))
})
const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required")
  }
  const avatar = await uploadOnCloudinary(avatar);
  const user = await User.findByIdAndUpdate(req.user._id, {
    $set: {
      avatar: avatar?.url || "Not uploaded yet"
    }
  }, {
    new: true
  }).select("-password")

  //return response
  return res.status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"))
})
const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image is required")
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  const user = await User.findByIdAndUpdate(req.user._id, {
    $set: {
      coverImage: coverImage?.url || "Not uploaded yet"
    }
  }, {
    new: true
  }).select("-password")

  //return response
  return res.status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"))
})
export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateAvatar, updateCoverImage }
