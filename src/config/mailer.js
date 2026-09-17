import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

/**
 * ============================================================================
 * ARCHITECTURAL DEEP DIVE: SMTP TRANSPORT CONFIGURATION
 * ============================================================================
 * 
 * 1. WHY CREATE ONCE AND REUSE (SINGLETON PATTERN)?
 *    - SMTP (Simple Mail Transfer Protocol) is a stateful TCP connection.
 *    - Establishing a TCP connection, negotiating TLS (Transport Layer Security)
 *      handshakes, exchanging authentication credentials (AUTH PLAIN/LOGIN),
 *      and issuing initial HELO/EHLO commands take between 200ms to 2000ms.
 *    - Creating a new transporter per email means paying this high-latency
 *      tax every single time.
 *    - Connection Pooling: By default, Nodemailer allows connection pooling
 *      (`pool: true`). When pooling is enabled, Nodemailer maintains persistent
 *      open sockets and reuses them across multiple emails, reducing overhead
 *      by 80-90% during high-throughput bursts.
 * 
 * 2. PORT 465 (secure: true) VS PORT 587 (secure: false + STARTTLS)
 *    - Port 465 (Implicit TLS / SMTPS):
 *      The connection starts encrypted from byte 0. The client immediately
 *      initiates a TLS handshake before any SMTP commands can be sent.
 *      In Nodemailer: `secure: true`.
 *    - Port 587 (Explicit TLS / Submission / STARTTLS):
 *      The connection starts in plaintext (or opportunistic cleartext). The client
 *      and server negotiate using the SMTP command `STARTTLS` to upgrade the
 *      plain socket into an encrypted TLS socket before transmitting sensitive
 *      AUTH credentials and message payload.
 *      In Nodemailer: `secure: false`. (Nodemailer automatically negotiates STARTTLS
 *      if supported by the remote server).
 *    - Port 25:
 *      Standard server-to-server MTA routing. Almost all residential ISPs and
 *      cloud platforms (AWS EC2, DigitalOcean, GCP) block outbound port 25
 *      to prevent botnet spam abuse. Never use port 25 for application email sending.
 * 
 * 3. TIMEOUT CONFIGURATIONS (Defensive Engineering):
 *    - connectionTimeout: How long to wait for the initial TCP connection (in ms).
 *    - greetingTimeout: How long to wait for the 220 banner greeting from the SMTP server.
 *    - socketTimeout: How long to wait for inactive socket operations.
 *    Without explicit timeouts, network packet drops or unresponsive mail relays
 *    can leave worker threads hanging indefinitely, exhausting Node's event loop
 *    and file descriptors.
 * ============================================================================
 */

let transporter = null;
let isEthereal = false;
let activeConfig = null;

/**
 * Initializes and configures the Nodemailer transporter.
 * If credentials are missing in process.env, it automatically provisions an
 * ephemeral Ethereal test inbox (https://ethereal.email).
 * 
 * @returns {Promise<nodemailer.Transporter>}
 */
export async function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    // Custom configured SMTP provider (Gmail, Mailtrap, Brevo, AWS SES, etc.)
    isEthereal = false;
    const isSecure = SMTP_SECURE === 'true' || SMTP_PORT === '465';

    activeConfig = {
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || (isSecure ? 465 : 587),
      secure: isSecure,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      from: MAIL_FROM || SMTP_USER,
      // Production pool and timeout settings
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 5000,     // 5 seconds
      socketTimeout: 15000,      // 15 seconds
    };

    transporter = nodemailer.createTransport(activeConfig);
    console.log(`[Mailer] Configured SMTP Transport via ${activeConfig.host}:${activeConfig.port} (secure: ${activeConfig.secure})`);
  } else {
    // Ephemeral Ethereal Fallback
    console.log('[Mailer] No custom SMTP credentials detected in environment.');
    console.log('[Mailer] Auto-provisioning an ephemeral Ethereal.email sandbox account...');

    const testAccount = await nodemailer.createTestAccount();
    isEthereal = true;

    activeConfig = {
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
      from: MAIL_FROM || `"Ethereal Sandbox" <${testAccount.user}>`,
      // Ethereal credentials info for inspection
      webUrl: testAccount.web,
    };

    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 15000,
    });

    console.log(`[Mailer] Ethereal test inbox created successfully!`);
    console.log(`[Mailer] Test User: ${testAccount.user}`);
    console.log(`[Mailer] Web Inbox: ${testAccount.web}`);
  }

  return transporter;
}

/**
 * Validates the SMTP connection by establishing a handshake and authenticating.
 * Uses transporter.verify() which issues an EHLO and AUTH sequence.
 * 
 * @returns {Promise<boolean>}
 */
export async function verifyTransporter() {
  const currentTransporter = await getTransporter();
  return new Promise((resolve, reject) => {
    currentTransporter.verify((error, success) => {
      if (error) {
        console.error('[Mailer] SMTP Verification Failed:', error.message);
        return reject(error);
      }
      console.log('[Mailer] SMTP Server connection verified and ready to transmit messages.');
      resolve(success);
    });
  });
}

/**
 * Helper to obtain the preview URL when using Ethereal.
 * 
 * @param {object} info - Nodemailer sendMail result object
 * @returns {string|null}
 */
export function getPreviewUrl(info) {
  if (isEthereal && info) {
    return nodemailer.getTestMessageUrl(info) || null;
  }
  return null;
}

/**
 * Returns a sanitized configuration summary suitable for health endpoints.
 * Never exposes passwords or private tokens!
 * 
 * @returns {object}
 */
export function getMailerConfigSummary() {
  if (!activeConfig) {
    return { initialized: false };
  }

  return {
    initialized: true,
    isEthereal,
    host: activeConfig.host,
    port: activeConfig.port,
    secure: activeConfig.secure,
    user: activeConfig.auth?.user ? `${activeConfig.auth.user.slice(0, 4)}***` : undefined,
    from: activeConfig.from,
    webInbox: isEthereal ? activeConfig.webUrl : undefined,
  };
}

export { isEthereal };
