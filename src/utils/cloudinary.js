import { v2 as cloudinary } from "cloudinary";
import fs from "fs"; //file-system

cloudinary.config({
  //gives the permission to upload files
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    //file has been uploaded
    console.log("File has been uploaded", response.url);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); //remove the locally saved  temp file as the upload operation failed
    return null;
  }
};

export { uploadOnCloudinary };
