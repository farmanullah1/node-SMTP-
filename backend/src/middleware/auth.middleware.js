import { verifyJwt, COOKIE_NAME } from '../config/jwt.js';
import { User } from '../models/User.js';

/**
 * Extracts and sanitizes JWT token from either:
 * 1. Authorization header ('Bearer <token>')
 * 2. HTTP-Only Cookie ('access_token')
 */
function extractToken(req) {
  let token = null;

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && typeof authHeader === 'string') {
    const trimmed = authHeader.trim();
    if (/^bearer\s+/i.test(trimmed)) {
      token = trimmed.replace(/^bearer\s+/i, '').trim();
    } else if (trimmed.split('.').length === 3) {
      // Sent directly as raw token without "Bearer "
      token = trimmed;
    }
  }

  if (!token && req.cookies && req.cookies[COOKIE_NAME]) {
    token = req.cookies[COOKIE_NAME];
  }

  if (!token && req.signedCookies && req.signedCookies[COOKIE_NAME]) {
    token = req.signedCookies[COOKIE_NAME];
  }

  // Fallback check standard cookie names
  if (!token && req.cookies) {
    token = req.cookies.token || req.cookies.jwt;
  }

  if (typeof token === 'string') {
    // Strip accidental surrounding quotes or trailing semicolons
    token = token.trim().replace(/^["']|["'];?$/g, '');
  }

  return token || null;
}

/**
 * Authentication Middleware:
 * Inspects incoming request for a JWT token (from Authorization Header OR HttpOnly Cookie),
 * validates its cryptographic signature, checks expiration, confirms user exists in MSSQL,
 * and attaches user to `req.user`.
 */
export async function authenticate(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please provide a Bearer token or log in with session cookies.',
      error: {
        code: 'UNAUTHORIZED',
      },
    });
  }

  try {
    const decoded = verifyJwt(token);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The user account associated with this token no longer exists.',
        error: {
          code: 'USER_NOT_FOUND',
        },
      });
    }

    req.user = user;
    next();
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      message: isExpired ? 'Token has expired. Please log in again.' : 'Invalid authentication token.',
      error: {
        code: isExpired ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
        detail: err.message,
      },
    });
  }
}

/**
 * Role-Based Access Control (RBAC) Middleware:
 * Restricts route access to users with authorized roles (e.g. 'admin').
 * Must be mounted AFTER `authenticate`.
 * 
 * @param  {...string} allowedRoles - e.g. 'admin', 'user'
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        error: { code: 'UNAUTHORIZED' },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. You need [${allowedRoles.join(', ')}] role to access this resource. Your role is '${req.user.role}'.`,
        error: {
          code: 'FORBIDDEN',
          requiredRoles: allowedRoles,
          currentRole: req.user.role,
        },
      });
    }

    next();
  };
}

/**
 * Optional Authentication Middleware:
 * If a Bearer token is provided, validates it and attaches `req.user`.
 * If missing or invalid, does not throw an error, continuing as an anonymous request.
 */
export async function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return next();
  }

  try {
    const decoded = verifyJwt(token);
    const user = await User.findByPk(decoded.id);
    if (user) {
      req.user = user;
    }
  } catch {
    // Ignore invalid tokens for optional routes
  }
  next();
}
