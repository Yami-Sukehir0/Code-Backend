// import mongoose, { Schema } from "mongoose";
// const userSchema = new mongoose.Schema({}, { timestamps: true });
// export const User = mongoose.model("User", userSchema);

import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt, { hash } from "bcrypt";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true, //searching field
      unique: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      trim: true,
    },
    fullname: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, //cloudinary url service
      required: true,
    },
    coverImage: {
      type: String, //cloudinary url service
    },
    watchHistory: [
      //multiple values
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
      // lowercase: true,
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);
userSchema.pre("save", async function (next) {
  //bcrypt use-case
  if (!(this.isModified("password"))) return next();
  this.password = await bcrypt.hash(this.password, 10);
  console.log("Hashed password during registration:", this.password);
  next()
});


//custom methods
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};
userSchema.methods.generateAccessToken = async function () {
  return jwt.sign(
    //sign method generates the token
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullname: this.fullname,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};
userSchema.methods.generateRefreshToken = async function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};

export const User = mongoose.model("User", userSchema);
