import crypto from 'crypto';
import { User } from '../models/User.js';
import { signJwt, COOKIE_NAME, getCookieOptions } from '../config/jwt.js';
import { isValidEmail } from '../utils/validateEmailPayload.js';
import { ApiResponse, ApiError } from '../utils/response.js';
import emailService from '../services/emailService.js';

/**
 * Hashes a token with SHA-256 for secure database storage.
 * Follows OWASP token storage guidelines.
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Password strength validator:
 * Minimum 8 characters, at least one letter and at least one number.
 */
function isStrongPassword(password) {
  if (typeof password !== 'string' || password.length < 8) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasLetter && hasNumber;
}

/**
 * POST /api/auth/register
 * Registers a new user, hashes password with bcryptjs, generates an email verification
 * token, stores SHA-256 hash in MSSQL, and sends a real verification email via emailService.
 */
export async function register(req, res) {
  const rawName = req.body.name || req.body.fullName;
  const name = typeof rawName === 'string' ? rawName.trim() : '';
  const { email, password } = req.body;

  // 1. Validation
  if (!name || name.length < 2) {
    throw ApiError.badRequest('Name is required and must be at least 2 characters long.', 'INVALID_NAME');
  }

  if (!email || !isValidEmail(email)) {
    throw ApiError.badRequest('A valid email address is required.', 'INVALID_EMAIL');
  }

  if (!isStrongPassword(password)) {
    throw ApiError.badRequest(
      'Password must be at least 8 characters long and contain both letters and numbers.',
      'WEAK_PASSWORD'
    );
  }

  // 2. Check for duplicate email
  const existingUser = await User.findOne({ where: { email: email.toLowerCase().trim() } });
  if (existingUser) {
    throw ApiError.conflict('An account with this email address is already registered.', 'EMAIL_ALREADY_EXISTS');
  }

  // 3. Generate raw verification token (32 bytes hex) and hash it for DB storage
  const rawVerificationToken = crypto.randomBytes(32).toString('hex');
  const hashedVerificationToken = hashToken(rawVerificationToken);
  const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // 4. Create user in database (password hook will hash with bcryptjs)
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    role: 'user',
    isVerified: false,
    verificationToken: hashedVerificationToken,
    verificationTokenExpires,
  });

  // 5. Transmit verification email via emailService
  let previewUrl = null;
  try {
    const clientBaseUrl = process.env.CLIENT_URL || `http://localhost:${process.env.PORT || 3000}`;
    const verificationUrl = `${clientBaseUrl}/api/auth/verify-email?token=${rawVerificationToken}`;

    const mailResult = await emailService.sendVerificationEmail({
      to: user.email,
      name: user.name,
      verificationUrl,
      token: rawVerificationToken,
      userId: user.id,
    });

    previewUrl = mailResult.previewUrl;
  } catch (mailError) {
    console.error('[Auth Register] Verification email delivery failed:', mailError.message);
  }

  return ApiResponse.success(
    res,
    {
      user: user.toSafeJSON(),
      previewUrl,
    },
    'User registered successfully. Please check your email inbox to verify your account.',
    201
  );
}

/**
 * GET or POST /api/auth/verify-email
 * Verifies email address via token (passed in query string or request body).
 */
export async function verifyEmail(req, res) {
  const rawToken = req.query.token || req.body.token;

  if (!rawToken) {
    throw ApiError.badRequest("Verification token is required (provide '?token=...' query or JSON body).", 'TOKEN_REQUIRED');
  }

  const hashedToken = hashToken(rawToken);

  const user = await User.findOne({
    where: { verificationToken: hashedToken },
  });

  if (!user) {
    throw ApiError.badRequest('Invalid verification token.', 'INVALID_TOKEN');
  }

  if (user.verificationTokenExpires && user.verificationTokenExpires < new Date()) {
    throw ApiError.badRequest('Verification token has expired. Please request a new verification email.', 'TOKEN_EXPIRED');
  }

  // Mark verified and clear tokens
  user.isVerified = true;
  user.verificationToken = null;
  user.verificationTokenExpires = null;
  await user.save();

  return ApiResponse.success(
    res,
    { user: user.toSafeJSON() },
    'Email address successfully verified. You may now log in.'
  );
}

/**
 * POST /api/auth/resend-verification
 * Resends verification email if unverified.
 */
export async function resendVerification(req, res) {
  const { email } = req.body;

  if (!email || !isValidEmail(email)) {
    throw ApiError.badRequest('A valid email address is required.', 'INVALID_EMAIL');
  }

  const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    // Anti-enumeration
    return ApiResponse.success(
      res,
      null,
      'If this email is registered and unverified, a new verification link has been sent.'
    );
  }

  if (user.isVerified) {
    throw ApiError.badRequest('This account email is already verified.', 'ALREADY_VERIFIED');
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  user.verificationToken = hashToken(rawToken);
  user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  const clientBaseUrl = process.env.CLIENT_URL || `http://localhost:${process.env.PORT || 3000}`;
  const verificationUrl = `${clientBaseUrl}/api/auth/verify-email?token=${rawToken}`;

  const mailResult = await emailService.sendVerificationEmail({
    to: user.email,
    name: user.name,
    verificationUrl,
    token: rawToken,
    userId: user.id,
  });

  return ApiResponse.success(
    res,
    { previewUrl: mailResult.previewUrl },
    'Verification email has been resent.'
  );
}

/**
 * POST /api/auth/login
 * Validates credentials with bcryptjs, issues signed JWT token.
 */
export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    throw ApiError.badRequest('Both email and password are required.', 'MISSING_CREDENTIALS');
  }

  const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });

  // Generic invalid credentials message to prevent user enumeration
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password.', 'INVALID_CREDENTIALS');
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw ApiError.unauthorized('Invalid email or password.', 'INVALID_CREDENTIALS');
  }

  // Issue JSON Web Token
  const token = signJwt({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  // Attach Secure HTTP-Only Cookie
  res.cookie(COOKIE_NAME, token, getCookieOptions());

  return ApiResponse.success(
    res,
    {
      user: user.toSafeJSON(),
      token,
      cookieName: COOKIE_NAME,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    'Login successful.'
  );
}

/**
 * POST /api/auth/logout
 * Clears the HTTP-Only authentication cookie.
 */
export async function logout(req, res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    path: '/',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return ApiResponse.success(res, null, 'Logged out successfully. Authentication cookie cleared.');
}

/**
 * GET /api/auth/me
 * Retrieves current authenticated user profile.
 * Protected by authenticate middleware.
 */
export async function getMe(req, res) {
  return ApiResponse.success(
    res,
    { user: req.user.toSafeJSON() },
    'User profile retrieved successfully.'
  );
}

/**
 * PUT /api/auth/profile
 * Updates authenticated user's profile details (name).
 */
export async function updateProfile(req, res) {
  const rawName = req.body.name || req.body.fullName;
  const name = typeof rawName === 'string' ? rawName.trim() : '';

  if (!name || name.length < 2) {
    throw ApiError.badRequest('Name is required and must be at least 2 characters long.', 'INVALID_NAME');
  }

  const user = req.user;
  user.name = name;
  await user.save();

  return ApiResponse.success(
    res,
    { user: user.toSafeJSON() },
    'Profile details updated successfully.'
  );
}

/**
 * POST /api/auth/change-password
 * Changes password for currently authenticated user.
 */
export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw ApiError.badRequest('Both currentPassword and newPassword are required.', 'PASSWORD_FIELDS_REQUIRED');
  }

  const user = req.user;
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw ApiError.unauthorized('Current password provided is incorrect.', 'INVALID_CURRENT_PASSWORD');
  }

  if (!isStrongPassword(newPassword)) {
    throw ApiError.badRequest(
      'New password must be at least 8 characters long and contain both letters and numbers.',
      'WEAK_PASSWORD'
    );
  }

  user.password = newPassword;
  await user.save();

  return ApiResponse.success(
    res,
    null,
    'Your password has been changed successfully.'
  );
}

/**
 * POST /api/auth/forgot-password
 * Generates password reset token, saves SHA-256 hash in MSSQL, and sends email via emailService.
 */
export async function forgotPassword(req, res) {
  const { email } = req.body;

  if (!email || !isValidEmail(email)) {
    throw ApiError.badRequest('A valid email address is required.', 'INVALID_EMAIL');
  }

  const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });

  // Anti-enumeration: return identical response even if email is not found
  if (!user) {
    return ApiResponse.success(
      res,
      null,
      'If this email address is registered, a password reset link has been sent.'
    );
  }

  // Generate raw reset token (32 bytes hex) and hash it for DB storage
  const rawResetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = hashToken(rawResetToken);
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry
  await user.save();

  let previewUrl = null;
  try {
    const clientBaseUrl = process.env.CLIENT_URL || `http://localhost:${process.env.PORT || 3000}`;
    const resetUrl = `${clientBaseUrl}/api/auth/reset-password?token=${rawResetToken}`;

    const mailResult = await emailService.sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetUrl,
      token: rawResetToken,
      userId: user.id,
    });

    previewUrl = mailResult.previewUrl;
  } catch (mailError) {
    console.error('[Auth ForgotPassword] Reset email failed:', mailError.message);
  }

  return ApiResponse.success(
    res,
    { previewUrl },
    'If this email address is registered, a password reset link has been sent.'
  );
}

/**
 * GET /api/auth/reset-password?token=...
 * Serves a secure, user-friendly HTML form when the user clicks the reset link in their email.
 */
export async function renderResetPasswordPage(req, res) {
  const rawToken = req.query.token;

  if (!rawToken) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Reset Password - Error</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="font-family:system-ui,sans-serif;background:#f4f6f8;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
        <div style="background:#fff;padding:2rem;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1);max-width:400px;text-align:center;">
          <h2 style="color:#e53e3e;margin-top:0;">Missing Token</h2>
          <p style="color:#4a5568;">No password reset token was provided in the link. Please request a new password reset email.</p>
        </div>
      </body>
      </html>
    `);
  }

  const hashedToken = hashToken(rawToken);
  const user = await User.findOne({ where: { resetPasswordToken: hashedToken } });

  if (!user || (user.resetPasswordExpires && user.resetPasswordExpires < new Date())) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Reset Password - Expired</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="font-family:system-ui,sans-serif;background:#f4f6f8;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;">
        <div style="background:#fff;padding:2rem;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1);max-width:400px;text-align:center;">
          <h2 style="color:#e53e3e;margin-top:0;">Link Expired or Invalid</h2>
          <p style="color:#4a5568;">This password reset link is invalid or has expired. Please request a new one.</p>
        </div>
      </body>
      </html>
    `);
  }

  // Render reset form
  return res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Reset Your Password</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1rem; }
        .card { background: #1e293b; border: 1px solid #334155; padding: 2.5rem; border-radius: 12px; width: 100%; max-width: 420px; box-shadow: 0 10px 25px rgba(0,0,0,0.4); }
        h2 { margin-top: 0; color: #38bdf8; font-size: 1.5rem; }
        p { color: #94a3b8; font-size: 0.9rem; line-height: 1.4; margin-bottom: 1.5rem; }
        label { display: block; margin-bottom: 0.5rem; font-size: 0.85rem; color: #cbd5e1; }
        input[type="password"] { width: 100%; box-sizing: border-box; padding: 0.75rem 1rem; background: #0f172a; border: 1px solid #475569; border-radius: 6px; color: #fff; font-size: 1rem; margin-bottom: 1.25rem; outline: none; }
        input[type="password"]:focus { border-color: #38bdf8; }
        button { width: 100%; padding: 0.75rem; background: #0284c7; color: #fff; border: none; border-radius: 6px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: background 0.2s; }
        button:hover { background: #0369a1; }
        .alert { display: none; padding: 0.75rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.85rem; }
        .alert-error { background: #7f1d1d; color: #fecaca; }
        .alert-success { background: #064e3b; color: #a7f3d0; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Reset Password</h2>
        <p>Enter a new strong password (at least 8 characters, containing both letters and numbers).</p>
        <div id="alertBox" class="alert"></div>
        <form id="resetForm">
          <label for="newPassword">New Password</label>
          <input type="password" id="newPassword" required minlength="8" placeholder="••••••••" />
          <button type="submit" id="submitBtn">Update Password</button>
        </form>
      </div>
      <script>
        const form = document.getElementById('resetForm');
        const alertBox = document.getElementById('alertBox');
        const submitBtn = document.getElementById('submitBtn');
        const token = "${rawToken}";

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          submitBtn.disabled = true;
          submitBtn.innerText = 'Updating...';
          alertBox.style.display = 'none';

          try {
            const res = await fetch('/api/auth/reset-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token, newPassword: document.getElementById('newPassword').value })
            });
            const data = await res.json();
            if (res.ok && data.success) {
              alertBox.className = 'alert alert-success';
              alertBox.innerText = data.message || 'Password updated successfully! You can now log in.';
              alertBox.style.display = 'block';
              form.style.display = 'none';
            } else {
              throw new Error(data.message || 'Failed to reset password.');
            }
          } catch (err) {
            alertBox.className = 'alert alert-error';
            alertBox.innerText = err.message;
            alertBox.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.innerText = 'Update Password';
          }
        });
      </script>
    </body>
    </html>
  `);
}

/**
 * POST /api/auth/reset-password
 * Resets user password using valid token.
 */
export async function resetPassword(req, res) {
  const rawToken = req.body.token || req.query.token;
  const { newPassword } = req.body;

  if (!rawToken) {
    throw ApiError.badRequest('Reset token is required.', 'TOKEN_REQUIRED');
  }

  if (!isStrongPassword(newPassword)) {
    throw ApiError.badRequest(
      'New password must be at least 8 characters long and contain both letters and numbers.',
      'WEAK_PASSWORD'
    );
  }

  const hashedToken = hashToken(rawToken);

  const user = await User.findOne({
    where: { resetPasswordToken: hashedToken },
  });

  if (!user) {
    throw ApiError.badRequest('Invalid password reset token.', 'INVALID_TOKEN');
  }

  if (user.resetPasswordExpires && user.resetPasswordExpires < new Date()) {
    throw ApiError.badRequest('Password reset token has expired. Please request a new one.', 'TOKEN_EXPIRED');
  }

  // Update password (User beforeSave hook will hash with bcryptjs)
  user.password = newPassword;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  return ApiResponse.success(
    res,
    null,
    'Your password has been successfully reset. You may now log in with your new password.'
  );
}
