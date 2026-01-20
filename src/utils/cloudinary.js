import { v2 as cloudinary } from "cloudinary";
import fs from 'fs'

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET

cloudinary.config({
    cloud_name: `${CLOUDINARY_CLOUD_NAME}`,
    api_key: `${CLOUDINARY_API_KEY}`,
    api_secret: `${CLOUDINARY_API_SECRET}`
});

const uploadOnCloudinary = async (localFilePath) => {
    try {

        if (!localFilePath) {
            console.log(`file path not found`);
            return null
        }

        //upload file to cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            folder: 'ChaiaurBackend',
            resource_type: "auto"
        })

        fs.unlinkSync(localFilePath)
        // return response.url
        return response
    } catch (error) {
        //CleanUP
        console.log(`catch(cloudinary) file upload failed`, error);
        fs.unlinkSync(localFilePath) //remove locally saved file due to upload failure
        return null
    }
}




export { uploadOnCloudinary }