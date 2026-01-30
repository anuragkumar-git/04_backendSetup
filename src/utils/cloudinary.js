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
        // console.log('uploadOnCloudinary response:', response);

        fs.unlinkSync(localFilePath)
        // return response.url
        return response
    } catch (error) {
        //CleanUP
        console.error(`catch(cloudinary) file upload failed`, error);
        fs.unlinkSync(localFilePath) //remove locally saved file due to upload failure
        return null
    }
}


const deleteFileonCloudinary = async (oldFilePublicUrl) => {
    try {
        if (!oldFilePublicUrl) {
            console.error("OldFilePublicUrl not found");
            return null
        }
        // console.log('oldFilePublicUrl', oldFilePublicUrl);

        const getPublicId = (cloudinaryUrl) => {
            // 1. Split by 'upload/' and take the second part
            const partAfterUpload = cloudinaryUrl.split('/upload/')[1];

            // 2. Remove the version (e.g., 'v1769755006/')
            const pathWithoutVersion = partAfterUpload.split('/').slice(1).join('/');

            // 3. Remove the file extension (e.g., '.png')
            const publicId = pathWithoutVersion.split('.')[0];

            return publicId;
        };
        const publicId = getPublicId(oldFilePublicUrl)
        // console.log('publicId:', publicId);

        const response = await cloudinary.uploader.destroy(publicId, { invalidate: true })
        // console.log('deleteFileResponse', response);

        return response
    } catch (error) {
        console.error(`catch(cloudinary) file deletion failed`, error);
    }
}

export {
    uploadOnCloudinary,
    deleteFileonCloudinary
}
