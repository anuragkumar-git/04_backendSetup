class ApiResponse {
    constructor(statusCode, data, message = "Success") {
        this.statusCode = statusCode
        this.data = data
        this.message = message
        this.success = statusCode < 400 //above 400 are error for response. So this is for succesful api reasponse so 100-399 if code > 400{handled by apiError class}
    }
}

export { ApiResponse }