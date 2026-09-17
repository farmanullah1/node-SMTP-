import crypto from 'crypto';
import { verifyTransporter, getMailerConfigSummary } from '../config/mailer.js';
import { validateEmailPayload } from '../utils/validateEmailPayload.js';
import emailService from '../services/emailService.js';
import { renderPracticeEmailHtml } from '../templates/richDirectEmail.js';
import { EmailLog } from '../models/EmailLog.js';
import { OtpLog } from '../models/OtpLog.js';
import { ApiResponse, ApiError } from '../utils/response.js';

/**
 * ============================================================================
 * ARCHITECTURAL DEEP DIVE: SENDMAIL(), ENVELOPE, AND ANTI-SPAM DELIVERABILITY
 * ============================================================================
 * 
 * 1. WHAT DO 'accepted' VS 'rejected' ACTUALLY MEAN?
 *    - In SMTP, sending an email involves defining the envelope recipient:
 *      `RCPT TO:<user@destination.com>`.
 *    - If the receiving mail server immediately acknowledges with `250 OK: Recipient accepted`,
 *      Nodemailer adds that email address to `info.accepted`.
 *    - If the server rejects the address immediately (e.g. `550 5.1.1 User unknown`),
 *      it is placed in `info.rejected`.
 *    - CRITICAL CAVEAT: An address being in `accepted` DOES NOT MEAN the email
 *      landed in the user's inbox! It only means the first relay server accepted responsibility
 *      for routing it. If the destination mailbox is full or the downstream MTA discards it,
 *      a bounce message (DSN - Delivery Status Notification) may return later asynchronously.
 * 
 * 2. WHY sendMail() RETURNS DIFFERENT FIELDS DEPENDING ON THE PROVIDER:
 *    - Nodemailer normalizes `messageId`, `accepted`, and `rejected`.
 *    - However, the `response` string is the raw SMTP dialogue line returned by the server:
 *      * SendGrid might return: `250 Ok: queued as abcdef123`
 *      * Postmark might return: `250 2.0.0 OK 16843000-xxxx`
 *      * Gmail might return: `250 2.0.0 OK <message-id> - gsmtp`
 *      * AWS SES might inject custom headers such as `x-ses-message-id`.
 * 
 * 3. HOW TO AVOID LANDING IN SPAM (DELIVERABILITY CHECKLIST):
 *    - SPF (Sender Policy Framework):
 *      DNS TXT record specifying which IP addresses are authorized to send mail
 *      for your domain (`v=spf1 include:_spf.google.com ~all`).
 *    - DKIM (DomainKeys Identified Mail):
 *      Asymmetric cryptographic signing. The private key signs headers and body;
 *      the public key is stored in DNS TXT record (`selector._domainkey.domain.com`).
 *      Proves the email was not tampered with in transit.
 *    - DMARC (Domain-based Message Authentication, Reporting, and Conformance):
 *      Aligns SPF and DKIM and tells receiving mail servers how to treat failures
 *      (`p=none`, `p=quarantine`, or `p=reject`).
 *    - ALWAYS SEND A PLAIN-TEXT ALTERNATIVE:
 *      Every HTML email should include a `text` alternative (multipart/alternative).
 *      Failing to do so triggers high spam score flags in SpamAssassin and Google algorithms.
 *    - SET `replyTo`:
 *      Always provide a valid, monitored mailbox in `replyTo`. Many automated spam filters
 *      penalize `no-reply` senders if no valid route for correspondence exists.
 * ============================================================================
 */

/**
 * Standardizes the controller response format:
 * { success, message, data: { messageId, accepted, rejected, response, previewUrl } }
 */
function formatEmailResponse(info, customMessage = 'Email processed successfully') {
  return {
    success: true,
    message: customMessage,
    data: {
      messageId: info.messageId || null,
      accepted: info.accepted || [],
      rejected: info.rejected || [],
      response: info.response || null,
      previewUrl: info.previewUrl || null,
    },
  };
}

/**
 * GET /api/email/health
 * Verifies the SMTP transporter and returns safe connection metadata.
 */
export async function getHealth(req, res) {
  const isHealthy = await verifyTransporter();
  const configSummary = getMailerConfigSummary();

  res.status(200).json({
    success: isHealthy,
    message: isHealthy ? 'SMTP Transporter is connected and healthy.' : 'SMTP Transporter connection failed.',
    data: configSummary,
  });
}

/**
 * POST /api/email/send
 * Sends a plain text email.
 * Body: { to, subject, text, replyTo? }
 */
export async function sendPlainText(req, res) {
  validateEmailPayload(req.body, { requireSubject: true, requireText: true });

  const { to, subject, text, replyTo } = req.body;
  const result = await emailService.sendPlainTextEmail({
    to,
    subject,
    text,
    replyTo,
    userId: req.user?.id,
  });

  res.status(200).json(formatEmailResponse(result, 'Plain-text email sent successfully.'));
}

/**
 * POST /api/email/send-html
 * Sends an HTML email with automatic plain-text fallback generation.
 * Supports passing custom HTML or activating the rich built-in practice UI.
 * Body: { to, subject, html?, title?, message?, badge?, actionUrl?, actionText?, text?, replyTo? }
 */
export async function sendHtml(req, res) {
  validateEmailPayload(req.body, { requireSubject: true, requireHtml: false });

  const { to, subject, replyTo, title, message, badge, actionUrl, actionText } = req.body;
  
  // If raw HTML is provided and isn't just a simple snippet, use it; otherwise generate a gorgeous modern email UI
  let html = req.body.html;
  if (!html || req.body.useTemplate === true || req.body.richUi === true) {
    html = renderPracticeEmailHtml({
      to,
      title: title || subject || 'Nodemailer & SMTP Lab Practice',
      message: message || (typeof html === 'string' && html.trim().length > 0 ? html : undefined),
      badge: badge || 'Direct Test Delivery',
      actionUrl,
      actionText,
    });
  }

  const result = await emailService.sendHtmlEmail({
    to,
    subject,
    html,
    text: req.body.text,
    replyTo,
    userId: req.user?.id,
  });

  res.status(200).json(formatEmailResponse(result, 'HTML email sent successfully with modern responsive UI.'));
}

/**
 * POST /api/email/send-template
 * Renders the welcome email template with dynamic parameters.
 * Body: { to, name, replyTo? }
 */
export async function sendTemplate(req, res) {
  validateEmailPayload(req.body, { requireSubject: false });

  const { to, name = 'Explorer', replyTo } = req.body;
  const result = await emailService.sendWelcomeEmail({
    to,
    name,
    replyTo,
    userId: req.user?.id,
  });

  res.status(200).json(formatEmailResponse(result, `Templated welcome email delivered to ${to}.`));
}

/**
 * POST /api/email/send-attachment
 * Handles multipart/form-data upload and attaches the file.
 * Fields: { to, subject, text?, html? } + file
 */
export async function sendAttachment(req, res) {
  if (!req.file) {
    const error = new Error("An attachment file is required in multipart field 'file'.");
    error.status = 400;
    error.field = 'file';
    throw error;
  }

  validateEmailPayload(req.body, {
    requireSubject: true,
    requireText: !req.body.html,
    requireHtml: !req.body.text && !req.body.html ? false : !!req.body.html,
  });

  const { to, subject, text, html, replyTo } = req.body;
  const result = await emailService.sendAttachmentEmail({
    to,
    subject,
    file: req.file,
    text,
    html,
    replyTo,
    userId: req.user?.id,
  });

  res.status(200).json(formatEmailResponse(result, `Email with attachment '${req.file.originalname}' sent successfully.`));
}

/**
 * POST /api/email/send-bulk
 * Dispatches an email to multiple recipients concurrently using Promise.allSettled.
 * Body: { to: ["user1@example.com", "user2@example.com"], subject, text, html? }
 */
export async function sendBulk(req, res) {
  validateEmailPayload(req.body, {
    allowBulk: true,
    requireSubject: true,
    requireText: !req.body.html,
    requireHtml: !!req.body.html,
  });

  const { to: recipients, subject, text, html, replyTo } = req.body;
  const result = await emailService.sendBulkEmails({
    to: recipients,
    subject,
    text,
    html,
    replyTo,
    userId: req.user?.id,
  });

  res.status(200).json({
    success: result.failedCount === 0,
    message: `Bulk transmission finished. Total: ${result.total}, Succeeded: ${result.successfulCount}, Failed: ${result.failedCount}`,
    data: result,
  });
}

/**
 * POST /api/email/send-otp
 * Dispatches a 6-digit numeric OTP with an expiration notice and saves SHA-256 hash in MSSQL.
 * Body: { to, name?, expiresInMinutes?, purpose? }
 */
export async function sendOtp(req, res) {
  validateEmailPayload(req.body, { requireSubject: false });

  const { to, name, expiresInMinutes = 10, purpose = 'Verification' } = req.body;
  const expiryDuration = Math.min(Math.max(Number(expiresInMinutes) || 10, 1), 60);

  // Generate cryptographically secure 6-digit numeric OTP
  const otpCode = crypto.randomInt(100000, 999999).toString();
  const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');
  const expiresAt = new Date(Date.now() + expiryDuration * 60 * 1000);

  // Invalidate any active, unverified OTPs for this email and purpose
  await OtpLog.update(
    { isUsed: true },
    {
      where: {
        email: to.toLowerCase().trim(),
        purpose: purpose.toUpperCase(),
        isUsed: false,
      },
    }
  );

  // Record fresh OTP entry in database
  await OtpLog.create({
    email: to.toLowerCase().trim(),
    otpHash,
    purpose: purpose.toUpperCase(),
    expiresAt,
    attempts: 0,
    isUsed: false,
  });

  const result = await emailService.sendOtpEmail({
    to,
    otp: otpCode,
    name,
    expiresInMinutes: expiryDuration,
    purpose,
    userId: req.user?.id,
  });

  res.status(200).json(
    formatEmailResponse(
      {
        ...result,
        expiresInMinutes: expiryDuration,
        purpose,
      },
      `Verification OTP email dispatched to ${to}.`
    )
  );
}

/**
 * POST /api/email/verify-otp
 * Verifies 6-digit OTP code against the database record with brute-force attempt throttling.
 * Body: { email, otp, purpose? }
 */
export async function verifyOtp(req, res) {
  const { email, otp, purpose = 'Verification' } = req.body;

  if (!email || !otp) {
    throw ApiError.badRequest('Both email and otp are required.', 'MISSING_OTP_FIELDS');
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanOtp = String(otp).trim();
  
  // Build query: match email and unconsumed state
  const whereClause = {
    email: cleanEmail,
    isUsed: false,
  };

  // If client explicitly specified a purpose, match it; otherwise find the most recent active OTP
  if (req.body.purpose && typeof req.body.purpose === 'string' && req.body.purpose.trim()) {
    whereClause.purpose = req.body.purpose.trim().toUpperCase();
  }

  // Find latest active OTP record for this email
  const record = await OtpLog.findOne({
    where: whereClause,
    order: [['createdAt', 'DESC']],
  });

  if (!record) {
    throw ApiError.badRequest('No active verification code found for this email. Please request a new one.', 'OTP_NOT_FOUND');
  }

  // Check Expiration
  if (record.expiresAt < new Date()) {
    record.isUsed = true;
    await record.save();
    throw ApiError.badRequest('Verification code has expired. Please request a new code.', 'OTP_EXPIRED');
  }

  // Rate Limiting / Brute-force protection: Max 5 failed attempts per OTP
  if (record.attempts >= 5) {
    record.isUsed = true;
    await record.save();
    throw ApiError.forbidden('Maximum verification attempts exceeded. Code invalidated for security.', 'MAX_ATTEMPTS_EXCEEDED');
  }

  // Verify hash
  const computedHash = crypto.createHash('sha256').update(cleanOtp).digest('hex');
  if (record.otpHash !== computedHash) {
    record.attempts += 1;
    await record.save();
    const remaining = 5 - record.attempts;
    throw ApiError.badRequest(`Invalid verification code. ${remaining} attempt(s) remaining.`, 'INVALID_OTP');
  }

  // Mark OTP as verified and consumed
  record.isUsed = true;
  await record.save();

  return ApiResponse.success(
    res,
    {
      email: cleanEmail,
      purpose: record.purpose,
      verified: true,
      verifiedAt: new Date().toISOString(),
    },
    'Verification code successfully confirmed.'
  );
}

/**
 * GET /api/email/stats
 * Aggregates email analytics (total, accepted, failed, deliverability rate) from MSSQL.
 */
export async function getEmailStats(req, res) {
  const whereClause = {};
  if (req.user?.id && req.user?.role !== 'admin') {
    whereClause.userId = req.user.id;
  }

  const [total, accepted, failed, rejected] = await Promise.all([
    EmailLog.count({ where: whereClause }),
    EmailLog.count({ where: { ...whereClause, status: 'ACCEPTED' } }),
    EmailLog.count({ where: { ...whereClause, status: 'FAILED' } }),
    EmailLog.count({ where: { ...whereClause, status: 'REJECTED' } }),
  ]);

  const deliverabilityRate = total > 0 ? Number(((accepted / total) * 100).toFixed(2)) : 100;

  res.status(200).json({
    success: true,
    message: 'Email delivery metrics retrieved successfully.',
    data: {
      totalDispatched: total,
      accepted,
      failed,
      rejected,
      deliverabilityRate: `${deliverabilityRate}%`,
    },
  });
}

/**
 * GET /api/email/logs/:id
 * Fetches single email audit record by ID.
 */
export async function getLogById(req, res) {
  const id = Number(req.params.id);
  if (!id) {
    throw ApiError.badRequest('Valid numeric ID is required in URL parameter.');
  }

  const log = await EmailLog.findByPk(id);
  if (!log) {
    throw ApiError.notFound(`Email log with ID ${id} was not found.`);
  }

  // Security check: normal users only see their own logs
  if (req.user?.id && req.user.role !== 'admin' && log.userId !== req.user.id) {
    throw ApiError.forbidden('You are not authorized to view this email log.');
  }

  res.status(200).json({
    success: true,
    message: 'Email log retrieved.',
    data: log,
  });
}

/**
 * GET /api/email/logs
 * Fetches recent email dispatch logs stored in MSSQL.
 */
export async function getEmailLogs(req, res) {
  const result = await emailService.getEmailLogs({
    userId: req.user?.id,
    role: req.user?.role,
    page: req.query.page,
    limit: req.query.limit,
    status: req.query.status,
  });

  res.status(200).json({
    success: true,
    message: `Retrieved ${result.logs.length} email dispatch logs from database.`,
    data: result.logs,
    meta: result.pagination,
  });
}
