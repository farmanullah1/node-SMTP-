import { ApiResponse } from '../utils/response.js';

/**
 * Centralized Error Handler Middleware.
 * 
 * Maps application errors, Sequelize database exceptions, and standard Nodemailer/SMTP
 * protocol error codes to clean, user-friendly JSON responses with correct HTTP status codes.
 * 
 * Standard SMTP error codes mapped:
 * - EAUTH (401): Authentication failed (invalid credentials, missing app password).
 * - ECONNECTION (503): Host unreachable, firewall blocked, port closed.
 * - ETIMEDOUT (504): SMTP network timeout during greeting, handshake, or data.
 * - EENVELOPE (422): Recipient or sender envelope address rejected by remote relay.
 * - ESOCKET (502): Low-level TLS negotiation mismatch or socket reset.
 */
export const errorHandler = (err, req, res, next) => {
  // Only log detailed stacks for 5xx errors or in development mode
  if (process.env.NODE_ENV === 'development' || (err.status && err.status >= 500)) {
    console.error(`[Error Handler] [${req.method} ${req.originalUrl}]`, {
      message: err.message,
      code: err.code,
      command: err.command,
      status: err.status,
    });
  }

  // 1. Handle custom ApiError instances
  if (err.name === 'ApiError') {
    return ApiResponse.error(res, err.message, err.status, {
      code: err.code,
      details: err.details,
    });
  }

  // 2. Handle Sequelize Unique Constraint Error (e.g. duplicate email)
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors?.[0]?.path || 'field';
    return ApiResponse.error(res, `A record with this ${field} already exists.`, 409, {
      code: 'DUPLICATE_ENTRY',
      field,
    });
  }

  // 3. Handle Sequelize Validation Error
  if (err.name === 'SequelizeValidationError') {
    const details = err.errors?.map((e) => ({ field: e.path, message: e.message })) || [];
    return ApiResponse.error(res, err.errors?.[0]?.message || 'Database validation failed.', 400, {
      code: 'VALIDATION_ERROR',
      details,
    });
  }

  // 4. Handle Multer File Upload Errors
  if (err.name === 'MulterError') {
    let msg = `File upload error: ${err.message}`;
    if (err.code === 'LIMIT_FILE_SIZE') {
      msg = 'Uploaded file exceeds the maximum allowed limit of 10MB.';
    }
    return ApiResponse.error(res, msg, 400, { code: err.code });
  }

  // 5. Handle Express JSON Syntax Errors (Malformed JSON body)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return ApiResponse.error(res, 'Malformed JSON payload in request body.', 400, {
      code: 'INVALID_JSON',
    });
  }

  // 6. Handle Payload Validation Errors
  if (err.isValidationError || err.status === 400) {
    return ApiResponse.error(res, err.message, 400, {
      field: err.field,
      code: err.code || 'VALIDATION_ERROR',
    });
  }

  // 7. Map Nodemailer SMTP Protocol Errors
  switch (err.code) {
    case 'EAUTH':
      return ApiResponse.error(
        res,
        'SMTP Authentication Failed. Verify SMTP_USER, SMTP_PASS, or Mailtrap/Gmail App Password credentials.',
        401,
        {
          code: 'EAUTH',
          smtpResponse: err.response || '535 Authentication credentials invalid',
        }
      );

    case 'ECONNECTION':
      return ApiResponse.error(
        res,
        'Unable to establish a connection to the SMTP server. Verify host, port, and firewall rules.',
        503,
        {
          code: 'ECONNECTION',
          command: err.command,
        }
      );

    case 'ETIMEDOUT':
      return ApiResponse.error(
        res,
        'SMTP connection timed out while waiting for a response from the mail server.',
        504,
        {
          code: 'ETIMEDOUT',
          command: err.command,
        }
      );

    case 'EENVELOPE':
      return ApiResponse.error(
        res,
        'SMTP Envelope rejected by mail relay. Check sender and recipient addresses.',
        422,
        {
          code: 'EENVELOPE',
          smtpResponse: err.response,
        }
      );

    case 'ESOCKET':
      return ApiResponse.error(
        res,
        'A socket or TLS negotiation error occurred while communicating with the SMTP server.',
        502,
        {
          code: 'ESOCKET',
          command: err.command,
        }
      );

    default:
      // Fallback for unexpected runtime errors
      return ApiResponse.error(
        res,
        err.message || 'An unexpected internal server error occurred.',
        err.status || 500,
        {
          code: err.code || 'INTERNAL_ERROR',
          detail: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        }
      );
  }
};
