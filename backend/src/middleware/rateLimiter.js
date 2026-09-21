import rateLimit from 'express-rate-limit';

/**
 * Global API rate limiter:
 * Allows 100 requests per 15 minutes per IP address.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
});

/**
 * Strict authentication limiter:
 * Prevents brute force login attempts and credential stuffing.
 * Max 10 attempts per 15 minutes.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again in 15 minutes.',
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
  },
});

/**
 * Strict email dispatch limiter:
 * Protects outbound mail queues, prevents spammer abuse, and protects SMTP quota.
 * Max 20 email send requests per 15 minutes.
 */
export const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Outbound email sending rate limit reached. Please wait before transmitting more messages.',
    error: {
      code: 'EMAIL_RATE_LIMIT_EXCEEDED',
    },
  },
});
