"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(error, req, res, next) {
    // Log error for debugging
    console.error('Error occurred:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        body: req.body,
        timestamp: new Date().toISOString()
    });
    // Default error response
    let statusCode = error.statusCode || 500;
    let message = error.message || 'Internal Server Error';
    let code = error.code || 'INTERNAL_ERROR';
    // Handle specific error types
    if (error.name === 'ValidationError') {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
    }
    else if (error.name === 'UnauthorizedError' || message.includes('token')) {
        statusCode = 401;
        code = 'UNAUTHORIZED';
    }
    else if (error.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid data format';
        code = 'INVALID_FORMAT';
    }
    else if (error.message.includes('duplicate key')) {
        statusCode = 409;
        message = 'Resource already exists';
        code = 'DUPLICATE_RESOURCE';
    }
    else if (error.message.includes('not found')) {
        statusCode = 404;
        code = 'NOT_FOUND';
    }
    // Don't leak error details in production
    const response = {
        success: false,
        error: {
            code,
            message
        }
    };
    // Include error details in development
    if (process.env.NODE_ENV === 'development') {
        response.error.details = error.details;
        response.error.stack = error.stack;
    }
    res.status(statusCode).json(response);
}
//# sourceMappingURL=errorHandler.js.map