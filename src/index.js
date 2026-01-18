// require('dotenv).config()
// require('dotenv).config({path: './.env'})
// import 'dotenv/config'
import dotenv from 'dotenv'
import connectDB from './db/index.js'
import { app } from './app.js'

// dotenv.config()
dotenv.config({
    path: './.env'
})
const PORT = process.env.PORT || 8000
connectDB()
    .then(() => {
        app.on("error", (error) => {
            console.log("ERROR:", error);
            throw error
        })
        
        app.listen(PORT, () => {
            console.log(`Server on http://localhost:${PORT}`);
        })
    })
    .catch((error) => {
        console.log("Mongodb Connection Failed!!", error);
    })
































/*
//* Better for smaller codebase but heavy index file
import mongoose from 'mongoose'
import { DB_NAME } from './constants.js'
import express from 'express'
const app = express();
// First approch:
// function connectDB(){}
// connectDB()
// Second approach: IIFE, ( async ()=>{await })()
//? if editor forgot to ;(must) before IIFE can cause error. So better to add one.
; (async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_DEV_URL}/${DB_NAME}`)
        app.on("error", (error) => {
            console.log("ERROR:", error);
            throw error
        })
        app.listen(process.env.PORT, () => {
            console.log(`App is listening on port ${process.env.PORT}`);
        })
    } catch (error) {
        console.log("DB Connection Error:", error);
        throw error
    }
})()
*/