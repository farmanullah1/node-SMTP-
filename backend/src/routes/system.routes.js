import express from 'express';
import { checkDatabaseHealth } from '../config/database.js';
import { verifyTransporter, getMailerConfigSummary, diagnoseSmtpConnection } from '../config/mailer.js';
import { getImageKitConfigSummary } from '../config/imagekit.js';
import { verifyDomainMx, checkDomainTypo } from '../utils/dnsValidator.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiResponse, ApiError } from '../utils/response.js';

const router = express.Router();

/**
 * GET /api/system/health
 * Comprehensive system telemetry and dependency probe:
 * - Express server & Node runtime metrics
 * - MSSQL database connectivity & query latency
 * - SMTP transporter handshake status
 * - ImageKit configuration
 */
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    const memory = process.memoryUsage();

    // 1. Probe MSSQL Database
    const dbStatus = await checkDatabaseHealth();

    // 2. Probe SMTP Mailer
    let smtpStatus = { healthy: false, error: null };
    try {
      const isSmtpVerified = await verifyTransporter();
      smtpStatus = {
        healthy: isSmtpVerified,
        config: getMailerConfigSummary(),
      };
    } catch (err) {
      smtpStatus = {
        healthy: false,
        error: err.message,
        config: getMailerConfigSummary(),
      };
    }

    // 3. ImageKit Status
    const imageKitStatus = getImageKitConfigSummary();

    const isSystemHealthy = dbStatus.healthy && smtpStatus.healthy;
    const statusCode = isSystemHealthy ? 200 : 503;

    return ApiResponse.success(
      res,
      {
        status: isSystemHealthy ? 'OPERATIONAL' : 'DEGRADED',
        timestamp: new Date().toISOString(),
        system: {
          uptimeSeconds: Math.floor(process.uptime()),
          nodeVersion: process.version,
          pid: process.pid,
          memoryMb: {
            rss: (memory.rss / (1024 * 1024)).toFixed(2),
            heapTotal: (memory.heapTotal / (1024 * 1024)).toFixed(2),
            heapUsed: (memory.heapUsed / (1024 * 1024)).toFixed(2),
          },
        },
        services: {
          database: dbStatus,
          smtp: smtpStatus,
          imageKit: imageKitStatus,
        },
      },
      isSystemHealthy ? 'All system services are operational.' : 'One or more subsystem dependencies are degraded.',
      statusCode
    );
  })
);

/**
 * GET /api/system/smtp-diag
 * Deep diagnostics probe testing socket handshake, verification latency, and connection pool capabilities.
 */
router.get(
  '/smtp-diag',
  asyncHandler(async (req, res) => {
    const diagnostics = await diagnoseSmtpConnection();
    const statusCode = diagnostics.healthy ? 200 : 503;

    return ApiResponse.success(
      res,
      diagnostics,
      diagnostics.healthy ? 'SMTP socket verification passed.' : 'SMTP socket diagnostic probe failed.',
      statusCode
    );
  })
);

/**
 * POST /api/system/validate-domain
 * Pre-flight DNS validation for email addresses and domains (verifies MX records & detects typos).
 * Body: { emailOrDomain }
 */
router.post(
  '/validate-domain',
  asyncHandler(async (req, res) => {
    const target = req.body.email || req.body.emailOrDomain || req.body.domain;
    if (!target || typeof target !== 'string') {
      throw ApiError.badRequest("Field 'email' or 'domain' is required in request body.");
    }

    const typoCheck = checkDomainTypo(target);
    const mxResult = await verifyDomainMx(target);

    return ApiResponse.success(
      res,
      {
        query: target,
        typo: typoCheck,
        mx: mxResult,
        canReceiveMail: mxResult.hasMx && !typoCheck.hasTypo,
      },
      mxResult.hasMx
        ? `Domain verified successfully. Primary mail exchanger: ${mxResult.exchange} (priority ${mxResult.priority})`
        : `Domain could not be verified: ${mxResult.error || 'No valid mail exchanger.'}`
    );
  })
);

export default router;
