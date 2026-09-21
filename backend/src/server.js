import app from './app.js';
import { env, validateEnv } from './config/env.js';
import { verifyTransporter, getMailerConfigSummary } from './config/mailer.js';
import { sequelize, connectToDatabase } from './config/database.js';

let server;

/**
 * Bootstrap and initialize the server.
 * Pre-verifies environment variables, MSSQL connectivity, and SMTP transporter at boot time.
 */
async function startServer() {
  console.log('====================================================');
  console.log('   SMTP & NODEMAILER PRODUCTION LAB (ESM / MSSQL)   ');
  console.log('====================================================');
  console.log(`[Process] Environment: ${env.NODE_ENV}`);
  console.log(`[Process] PID: ${process.pid}`);
  console.log(`[Process] Node Version: ${process.version}`);

  // 1. Validate environment configuration
  validateEnv();

  try {
    // 2. Connect to Microsoft SQL Server via Sequelize ORM
    console.log('[Startup] Initializing MSSQL database connection...');
    try {
      await connectToDatabase();
    } catch (dbErr) {
      console.warn(`[Startup Warning] MSSQL connection could not be established: ${dbErr.message}`);
      console.warn('[Startup Warning] Email sending will continue using in-memory fallbacks.');
    }

    // 3. Verify SMTP connection before accepting HTTP requests
    console.log('[Startup] Verifying SMTP Transporter connection...');
    await verifyTransporter();

    const config = getMailerConfigSummary();
    console.log(`[Startup] Active Mailer: ${config.isEthereal ? 'Ethereal.email (Sandbox)' : config.host}`);
    if (config.webInbox) {
      console.log(`[Startup] Preview Inbox: ${config.webInbox}`);
    }

    // 4. Start HTTP Express Server
    server = app.listen(env.PORT, () => {
      console.log('----------------------------------------------------');
      console.log(`[HTTP] Express server listening on http://localhost:${env.PORT}`);
      console.log(`[HTTP] System Telemetry: http://localhost:${env.PORT}/api/system/health`);
      console.log(`[HTTP] Email Health:     http://localhost:${env.PORT}/api/email/health`);
      console.log('====================================================\n');
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error('\n====================================================');
        console.error(`[HTTP Warning] Port ${env.PORT} is already in use.`);
        console.error(`Another instance of the server is already active on port ${env.PORT}.`);
        console.error('If you wish to run another instance, specify a different port in .env (e.g. PORT=3001).');
        console.error('====================================================\n');
        process.exit(0);
      } else {
        console.error('\n[HTTP Fatal] Server error:', err);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('\n[Startup Fatal] Failed during startup initialization:');
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * Graceful shutdown routine to drain connections cleanly on SIGINT / SIGTERM.
 */
async function gracefulShutdown(signal) {
  console.log(`\n[Shutdown] Received signal ${signal}. Initiating graceful shutdown...`);
  try {
    await sequelize.close();
    console.log('[Shutdown] Closed Sequelize MSSQL connection pool.');
  } catch (err) {
    console.warn('[Shutdown] Error closing Sequelize pool:', err.message);
  }

  if (server) {
    server.close(() => {
      console.log('[Shutdown] Closed active HTTP connections.');
      console.log('[Shutdown] Process terminating cleanly.');
      process.exit(0);
    });

    // Enforce shutdown if active requests take too long
    setTimeout(() => {
      console.error('[Shutdown] Forced shutdown after timeout (5s).');
      process.exit(1);
    }, 5000).unref();
  } else {
    process.exit(0);
  }
}

// Global Process Event Listeners
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process Alert] Unhandled Rejection at:', promise);
  console.error('[Process Alert] Reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[Process Fatal] Uncaught Exception:', error.message);
  console.error(error.stack);
  process.exit(1);
});

// Launch server
startServer();
