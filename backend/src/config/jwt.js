import jwt from 'jsonwebtoken';
import { env } from './env.js';

const JWT_SECRET = env.JWT_SECRET;
const JWT_EXPIRES_IN = env.JWT_EXPIRES_IN;

/**
 * Generates a signed JSON Web Token for an authenticated user.
 * @param {object} payload - Claims to embed in token (id, email, role)
 * @param {string} [expiresIn] - Optional custom expiry
 * @returns {string} Signed JWT
 */
export function signJwt(payload, expiresIn = JWT_EXPIRES_IN) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Verifies a JWT and decodes its payload.
 * Throws JsonWebTokenError or TokenExpiredError on invalid tokens.
 * @param {string} token 
 * @returns {object} Decoded payload
 */
export function verifyJwt(token) {
  return jwt.verify(token, JWT_SECRET);
}

const COOKIE_NAME = 'access_token';

/**
 * Returns standard production-hardened cookie options.
 * httpOnly: prevents client-side XSS attacks from accessing the token.
 * sameSite: 'lax' protects against CSRF while allowing top-level navigation.
 * secure: true in production (requires HTTPS).
 */
export function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/',
  };
}

export { JWT_SECRET, JWT_EXPIRES_IN, COOKIE_NAME };
