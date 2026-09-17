import express from 'express';
import { checkDatabaseHealth } from '../config/database.js';
import { verifyTransporter, getMailerConfigSummary } from '../config/mailer.js';
import { getImageKitConfigSummary } from '../config/imagekit.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiResponse } from '../utils/response.js';

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

export default router;
