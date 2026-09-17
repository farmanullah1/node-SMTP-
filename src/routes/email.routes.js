import express from 'express';
import multer from 'multer';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { optionalAuth } from '../middleware/auth.middleware.js';
import { emailLimiter } from '../middleware/rateLimiter.js';
import {
  getHealth,
  sendPlainText,
  sendHtml,
  sendTemplate,
  sendAttachment,
  sendBulk,
  sendOtp,
  verifyOtp,
  getEmailStats,
  getLogById,
  getEmailLogs,
} from '../controllers/email.controller.js';

const router = express.Router();

/**
 * Configure Multer for in-memory file buffering.
 * Storing attachments directly in memory (`memoryStorage`) avoids cluttering
 * disk space and simplifies handling for cloud/containerized environments.
 * Limits attachments to 10MB to protect memory exhaustion.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 Megabytes max
  },
});

// 1. Health check & Transporter verification
router.get('/health', asyncHandler(getHealth));

// 2. Email deliverability statistics & analytics
router.get('/stats', optionalAuth, asyncHandler(getEmailStats));

// 3. Audit logs from MSSQL database (supports optional Bearer token)
router.get('/logs', optionalAuth, asyncHandler(getEmailLogs));
router.get('/logs/:id', optionalAuth, asyncHandler(getLogById));

// 4. Plain-text email
router.post('/send', emailLimiter, optionalAuth, asyncHandler(sendPlainText));

// 5. Rich HTML email (with automatic text fallback & modern UI)
router.post('/send-html', emailLimiter, optionalAuth, asyncHandler(sendHtml));

// 6. Security 6-digit OTP email & verification
router.post('/send-otp', emailLimiter, optionalAuth, asyncHandler(sendOtp));
router.post('/verify-otp', emailLimiter, asyncHandler(verifyOtp));

// 7. Templated welcome email
router.post('/send-template', emailLimiter, optionalAuth, asyncHandler(sendTemplate));

// 8. Email with file attachment (multipart/form-data)
router.post('/send-attachment', emailLimiter, optionalAuth, upload.single('file'), asyncHandler(sendAttachment));

// 9. Concurrent bulk email sending
router.post('/send-bulk', emailLimiter, optionalAuth, asyncHandler(sendBulk));

export default router;
