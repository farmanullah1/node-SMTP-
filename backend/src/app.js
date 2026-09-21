import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { ApiResponse } from './utils/response.js';

import cookieParser from 'cookie-parser';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamically locate frontend directory (prefers built React dist if available)
const candidateFrontendDirs = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(__dirname, '../frontend/dist'),
  path.resolve(__dirname, '../../frontend'),
  path.resolve(__dirname, '../frontend'),
];

let publicDir = candidateFrontendDirs[0];
for (const dir of candidateFrontendDirs) {
  if (fs.existsSync(dir)) {
    publicDir = dir;
    break;
  }
}

// Subsystem Routers
import authRoutes from './routes/auth.routes.js';
import emailRoutes from './routes/email.routes.js';
import mediaRoutes from './routes/media.routes.js';
import systemRoutes from './routes/system.routes.js';

const app = express();

// 1. Security Headers (Helmet configured to permit live sandboxed email iframes)
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// 2. Cross-Origin Resource Sharing (CORS with cookie credentials support)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like curl or same-origin)
      if (!origin) return callback(null, true);
      // Explicitly allow localhost:5173 (Vite frontend) and any localhost/127.0.0.1 port
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      if (env.CORS_ORIGIN === '*' || env.CORS_ORIGIN === origin) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 3. Request Logging Middleware
app.use(requestLogger);

// 4. Request Body & Cookie Parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser(env.JWT_SECRET));

// 5. Serve Static Frontend Web App (Email Studio)
app.use(express.static(publicDir, { index: false }));

// Dedicated UI endpoints
app.get(['/studio', '/dashboard'], (req, res) => {
  return res.sendFile(path.join(publicDir, 'index.html'));
});

// 6. Global API Rate Limiter
app.use('/api', apiLimiter);

// 7. Root Discovery / API Sitemap (Returns UI to Web Browsers or JSON to API clients)
app.get('/', (req, res) => {
  const wantsJson = req.query.format === 'json' ||
    (req.headers.accept && req.headers.accept.includes('application/json') && !req.headers.accept.includes('text/html'));

  if (!wantsJson && req.accepts('html')) {
    return res.sendFile(path.join(publicDir, 'index.html'));
  }

  return ApiResponse.success(
    res,
    {
      name: 'SMTP & Nodemailer Production Lab (with MSSQL, JWT Auth & ImageKit)',
      version: '1.0.0',
      studio: '/studio',
      environment: env.NODE_ENV,
      endpoints: {
        system: {
          health: 'GET /api/system/health',
          smtpDiag: 'GET /api/system/smtp-diag',
          validateDomain: 'POST /api/system/validate-domain',
        },
        auth: {
          register: 'POST /api/auth/register',
          verifyEmail: 'GET or POST /api/auth/verify-email',
          resendVerification: 'POST /api/auth/resend-verification',
          login: 'POST /api/auth/login (Returns JWT token + sets access_token HttpOnly cookie)',
          logout: 'POST /api/auth/logout (Clears access_token cookie)',
          me: 'GET /api/auth/me (Bearer token or Cookie required)',
          updateProfile: 'PUT /api/auth/profile (Bearer token or Cookie required)',
          changePassword: 'POST /api/auth/change-password (Bearer token or Cookie required)',
          forgotPassword: 'POST /api/auth/forgot-password',
          resetPassword: 'GET or POST /api/auth/reset-password',
        },
        email: {
          health: 'GET /api/email/health',
          stats: 'GET /api/email/stats',
          logs: 'GET /api/email/logs?page=1&limit=20&search=&category=&status=',
          logById: 'GET /api/email/logs/:id',
          retryLog: 'POST /api/email/logs/:id/retry',
          preview: 'POST /api/email/preview (template: signup|loginAlert|otp|resetPassword|invoice|welcome|verification)',
          sendHandlebars: 'POST /api/email/send-handlebars (template: signup|loginAlert|otp|resetPassword, to, data)',
          sendLoginAlert: 'POST /api/email/send-login-alert (to, name, device, ipAddress, location)',
          sendText: 'POST /api/email/send',
          sendHtml: 'POST /api/email/send-html',
          sendOtp: 'POST /api/email/send-otp',
          verifyOtp: 'POST /api/email/verify-otp',
          sendTemplate: 'POST /api/email/send-template',
          sendInvoice: 'POST /api/email/send-invoice',
          sendAttachment: 'POST /api/email/send-attachment',
          sendBulk: 'POST /api/email/send-bulk',
        },
        media: {
          health: 'GET /api/media/health',
          upload: 'POST /api/media/upload (multipart field: file)',
        },
      },
    },
    'API is online and operational.'
  );
});

// 7. Mount Subsystem Routes
app.use('/api/system', systemRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/media', mediaRoutes);

// 8. 404 Route Handler for undefined endpoints
app.use((req, res) => {
  return ApiResponse.error(
    res,
    `Endpoint not found: [${req.method}] ${req.originalUrl}`,
    404,
    { code: 'ROUTE_NOT_FOUND', hint: 'Visit / for a list of available endpoints.' }
  );
});

// 9. Centralized Error Handler Middleware
app.use(errorHandler);

export default app;
