import mongoose from 'mongoose'
import { DB_NAME } from '../constants.js'

const  connectDB = async()=>{
    try{
        const MONGODB_DEV_URL = process.env.MONGODB_DEV_URL
        
        const connectionInstance = await mongoose.connect(`${MONGODB_DEV_URL}/${DB_NAME}`)
        console.log(`db connnected!! DB HOST: ${connectionInstance.connection.host}`);
        // console.log("connectionInstance:  ",connectionInstance );
        
    }catch(error){
        console.log("MongoDB connection failed!", error);
        //? NODE processes and methods
        process.exit(1) 
    }
}

export default connectDB    