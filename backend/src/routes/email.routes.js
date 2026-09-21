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
  sendHandlebars,
  sendLoginAlert,
  sendInvoice,
  sendAttachment,
  sendBulk,
  sendOtp,
  verifyOtp,
  previewTemplate,
  retryFailedEmail,
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

// 2. Email deliverability statistics & analytics (category breakdown, latency)
router.get('/stats', optionalAuth, asyncHandler(getEmailStats));

// 3. Audit logs from MSSQL database (supports search, category, date filters, and retry)
router.get('/logs', optionalAuth, asyncHandler(getEmailLogs));
router.get('/logs/:id', optionalAuth, asyncHandler(getLogById));
router.post('/logs/:id/retry', emailLimiter, optionalAuth, asyncHandler(retryFailedEmail));

// 4. In-memory email template preview / HTML inspector (supports Handlebars & classic)
router.post('/preview', emailLimiter, asyncHandler(previewTemplate));

// 5. Dynamic Handlebars email template delivery (signup, loginAlert, otp, resetPassword)
router.post('/send-handlebars', emailLimiter, optionalAuth, asyncHandler(sendHandlebars));
router.post('/send-login-alert', emailLimiter, optionalAuth, asyncHandler(sendLoginAlert));

// 6. Plain-text email
router.post('/send', emailLimiter, optionalAuth, asyncHandler(sendPlainText));

// 7. Rich HTML email (with automatic text fallback & corporate UI)
router.post('/send-html', emailLimiter, optionalAuth, asyncHandler(sendHtml));

// 8. Security 6-digit OTP email & verification
router.post('/send-otp', emailLimiter, optionalAuth, asyncHandler(sendOtp));
router.post('/verify-otp', emailLimiter, asyncHandler(verifyOtp));

// 9. Templated welcome email
router.post('/send-template', emailLimiter, optionalAuth, asyncHandler(sendTemplate));

// 10. Itemized corporate invoice / transaction billing email
router.post('/send-invoice', emailLimiter, optionalAuth, asyncHandler(sendInvoice));

// 11. Email with file attachment (multipart/form-data)
router.post('/send-attachment', emailLimiter, optionalAuth, upload.single('file'), asyncHandler(sendAttachment));

// 12. Concurrent & deduplicated bulk email sending
router.post('/send-bulk', emailLimiter, optionalAuth, asyncHandler(sendBulk));

export default router;
