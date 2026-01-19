import multer from 'multer'

const storage = multer.diskStorage({
    destination: function (req, res, cb) {
        cb(null, ".public/temp")
    },
    filename: function (req, file, cb) {
        //custom file name
        // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        // cb(null, file.fieldname + '-' + uniqueSuffix)
        
        //local -> upload cloudinary -> delete local | so currently as it is
        cb(null, file.originalname)
    }
})

export const upload = multer({ storage }) 