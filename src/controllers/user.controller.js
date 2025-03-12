import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
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
    avatarLocalPath = req.files.avatar[0].path;
  }
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = await req.files.coverImage[0].path;
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

export { registerUser };
