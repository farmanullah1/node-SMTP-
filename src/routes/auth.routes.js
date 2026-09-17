import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import {
  register,
  verifyEmail,
  resendVerification,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword,
  forgotPassword,
  renderResetPasswordPage,
  resetPassword,
} from '../controllers/auth.controller.js';

const router = express.Router();

/**
 * Authentication & Password Lifecycle Routes
 * All endpoints are prefixed under /api/auth
 */

// 1. Register with real email verification via Nodemailer
router.post('/register', authLimiter, asyncHandler(register));

// 2. Email verification link / token confirmation (supports GET via browser link and POST)
router.get('/verify-email', asyncHandler(verifyEmail));
router.post('/verify-email', asyncHandler(verifyEmail));

// 3. Resend verification email
router.post('/resend-verification', authLimiter, asyncHandler(resendVerification));

// 4. Login (sets HTTP-Only cookie & returns JWT) and Logout (clears cookie)
router.post('/login', authLimiter, asyncHandler(login));
router.post('/logout', asyncHandler(logout));

// 5. User Profile Lifecycle (Token or Cookie required)
router.get('/me', authenticate, asyncHandler(getMe));
router.put('/profile', authenticate, asyncHandler(updateProfile));
router.post('/change-password', authenticate, authLimiter, asyncHandler(changePassword));

// 6. Request password reset email via Nodemailer
router.post('/forgot-password', authLimiter, asyncHandler(forgotPassword));

// 7. Reset password: GET serves HTML form when clicked from email; POST processes password change
router.get('/reset-password', asyncHandler(renderResetPasswordPage));
router.post('/reset-password', authLimiter, asyncHandler(resetPassword));

export default router;
