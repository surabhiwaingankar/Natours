class AppError extends Error {
    constructor(message, statusCode) {
      super(message);
  
      this.statusCode = statusCode;
      this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'; //500 is internal server error, 404 other error
      this.isOperational = true;
  
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  module.exports = AppError;
  