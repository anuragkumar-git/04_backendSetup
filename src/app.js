import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

const app = express()
// app.use(cors()) //? Basic Configuration for dev
app.use(cors({
    origin: process.env.CORS_ORIGIN, //Frontend URL
    credentials: true
}))

app.use(express.json({ limit: "16kb" })) //Accept JSON data upto 16kb, body-parser used earlier

// app.use(express.urlencoded()) //Almost enough
app.use(express.urlencoded({ extended: true, limit: "16kb" })) //To accept nestad ogj from url

app.use(express.static("public")) //Store static content on server img, pdf, favicon etc

app.use(cookieParser()) //CRUD cookies
  
export { app }