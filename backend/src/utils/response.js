/**
 * Standardized API Response and Error utilities.
 * Ensures consistent JSON response structure across all controllers.
 */

export class ApiResponse {
  /**
   * Sends a standardized successful JSON response.
   * 
   * @param {import('express').Response} res 
   * @param {*} data - Response payload
   * @param {string} message - Human readable summary
   * @param {number} statusCode - HTTP Status code (default 200)
   * @param {object} [meta] - Optional metadata (e.g. pagination)
   */
  static success(res, data = null, message = 'Operation completed successfully', statusCode = 200, meta = undefined) {
    const responseBody = {
      success: true,
      message,
      data,
    };

    if (meta !== undefined) {
      responseBody.meta = meta;
    }

    return res.status(statusCode).json(responseBody);
  }

  /**
   * Sends a standardized error JSON response.
   * 
   * @param {import('express').Response} res 
   * @param {string} message - Error description
   * @param {number} statusCode - HTTP status code (default 500)
   * @param {object} [error] - Error details (code, field, validation errors)
   */
  static error(res, message = 'An error occurred', statusCode = 500, error = undefined) {
    const responseBody = {
      success: false,
      message,
    };

    if (error !== undefined) {
      responseBody.error = error;
    }

    return res.status(statusCode).json(responseBody);
  }
}

/**
 * Custom Application Error class for raising operational errors with custom HTTP status codes.
 */
export class ApiError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = statusCode;
    this.code = errorCode;
    this.details = details;
  }

  static badRequest(message, errorCode = 'BAD_REQUEST', details = null) {
    return new ApiError(message, 400, errorCode, details);
  }

  static unauthorized(message = 'Unauthorized', errorCode = 'UNAUTHORIZED') {
    return new ApiError(message, 401, errorCode);
  }

  static forbidden(message = 'Forbidden', errorCode = 'FORBIDDEN') {
    return new ApiError(message, 403, errorCode);
  }

  static notFound(message = 'Resource not found', errorCode = 'NOT_FOUND') {
    return new ApiError(message, 404, errorCode);
  }

  static conflict(message, errorCode = 'CONFLICT') {
    return new ApiError(message, 409, errorCode);
  }
}
