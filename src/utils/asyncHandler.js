// Higher order function: Accepts functions as parameter and also return functions
// const asyncHandler = () => {}
// const asyncHandler = (fn) => {()=>{}}
// const asyncHandler = (fn) => ()=>{}


//? Promises based 
const asyncHandler = (requestHandler) => {
    //TypeError: argument handler must be a function
// (req, res, next) => {
   return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => {
            next(err)
        })
    }
}

export { asyncHandler }


//? try catch based
// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }
// export { asyncHandler }