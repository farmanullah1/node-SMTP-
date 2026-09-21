import crypto from 'crypto';
import { fn, col } from 'sequelize';
import { verifyTransporter, getMailerConfigSummary } from '../config/mailer.js';
import { validateEmailPayload } from '../utils/validateEmailPayload.js';
import emailService from '../services/emailService.js';
import { renderPracticeEmailHtml } from '../templates/richDirectEmail.js';
import { renderWelcomeEmail } from '../templates/welcomeEmail.js';
import { renderVerificationEmail, renderPasswordResetEmail } from '../templates/authEmails.js';
import { renderOtpEmail } from '../templates/otpEmail.js';
import { renderInvoiceEmail } from '../templates/invoiceEmail.js';
import { renderHandlebarsTemplate } from '../templates/handlebars/renderer.js';
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
 * 2. HOW TO AVOID LANDING IN SPAM (DELIVERABILITY CHECKLIST):
 *    - SPF (Sender Policy Framework): Authorizes IPs via DNS TXT.
 *    - DKIM (DomainKeys Identified Mail): Asymmetric crypto signing of headers & body.
 *    - DMARC: Enforces SPF & DKIM alignment.
 *    - ALWAYS SEND A PLAIN-TEXT ALTERNATIVE (multipart/alternative).
 *    - SET A VALID `replyTo` ADDRESS.
 * ============================================================================
 */

/**
 * Helper to build standardized email delivery payload
 */
function buildDeliveryData(info) {
  return {
    messageId: info.messageId || null,
    accepted: info.accepted || [],
    rejected: info.rejected || [],
    response: info.response || null,
    previewUrl: info.previewUrl || null,
    deliveryDurationMs: info.deliveryDurationMs || null,
    attempts: info.attempts || 1,
  };
}

/**
 * GET /api/email/health
 * Verifies the SMTP transporter and returns safe connection metadata.
 */
export async function getHealth(req, res) {
  const isHealthy = await verifyTransporter();
  const configSummary = getMailerConfigSummary();

  return ApiResponse.success(
    res,
    configSummary,
    isHealthy ? 'SMTP Transporter is connected and healthy.' : 'SMTP Transporter connection failed.',
    isHealthy ? 200 : 503
  );
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

  return ApiResponse.success(
    res,
    buildDeliveryData(result),
    'Plain-text email sent successfully.'
  );
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

  let html = req.body.html;
  if (!html || req.body.useTemplate === true || req.body.richUi === true) {
    html = renderPracticeEmailHtml({
      to,
      title: title || subject || 'Farmanullah Ansari Company Official Communication',
      message: message || (typeof html === 'string' && html.trim().length > 0 ? html : undefined),
      badge: badge || 'Direct Delivery',
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

  return ApiResponse.success(
    res,
    buildDeliveryData(result),
    'HTML email sent successfully with responsive corporate UI.'
  );
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

  return ApiResponse.success(
    res,
    buildDeliveryData(result),
    `Templated welcome email delivered to ${to}.`
  );
}

/**
 * POST /api/email/send-invoice
 * Dispatches a corporate invoice / billing email with an itemized table.
 * Body: { to, invoiceNumber?, customerName?, items?, dueDate?, status?, currency?, taxRate?, actionUrl?, notes? }
 */
export async function sendInvoice(req, res) {
  validateEmailPayload(req.body, { requireSubject: false });

  const {
    to,
    invoiceNumber,
    customerName,
    items,
    dueDate,
    status = 'PAID',
    currency = '$',
    taxRate = 0,
    actionUrl,
    notes,
    replyTo,
  } = req.body;

  const result = await emailService.sendInvoiceEmail({
    to,
    invoiceNumber,
    customerName: customerName || req.user?.name || 'Valued Client',
    customerEmail: to,
    items,
    dueDate,
    status,
    currency,
    taxRate,
    actionUrl,
    notes,
    replyTo,
    userId: req.user?.id,
  });

  return ApiResponse.success(
    res,
    buildDeliveryData(result),
    `Corporate invoice email dispatched successfully to ${to}.`
  );
}

/**
 * POST /api/email/send-handlebars
 * Dispatches an email using the dynamic Handlebars template engine.
 * Body: { template: 'signup'|'loginAlert'|'otp'|'resetPassword', to, data: {}, subject?, replyTo? }
 */
export async function sendHandlebars(req, res) {
  validateEmailPayload(req.body, { requireSubject: false });

  const { template, to, data = {}, subject, replyTo } = req.body;
  if (!template || typeof template !== 'string') {
    throw ApiError.badRequest("A 'template' name is required (e.g. 'signup', 'loginAlert', 'otp', 'resetPassword').", 'MISSING_TEMPLATE');
  }

  const result = await emailService.sendHandlebarsEmail({
    template,
    data,
    to,
    subject,
    replyTo,
    userId: req.user?.id,
  });

  return ApiResponse.success(
    res,
    buildDeliveryData(result),
    `Handlebars template '${template}' dispatched successfully to ${to}.`
  );
}

/**
 * POST /api/email/send-login-alert
 * Dispatches an account login security alert notification.
 * Body: { to, name?, device?, ipAddress?, location?, timestamp?, securityUrl? }
 */
export async function sendLoginAlert(req, res) {
  validateEmailPayload(req.body, { requireSubject: false });

  const { to, name, device, ipAddress, location, timestamp, securityUrl } = req.body;

  const result = await emailService.sendLoginAlertEmail({
    to,
    name: name || req.user?.name || 'Account Owner',
    device: device || req.headers['user-agent'] || 'Web Browser',
    ipAddress: ipAddress || req.ip || '127.0.0.1',
    location,
    timestamp,
    securityUrl,
    userId: req.user?.id,
  });

  return ApiResponse.success(
    res,
    buildDeliveryData(result),
    `Security login alert dispatched to ${to}.`
  );
}

/**
 * POST /api/email/send-attachment
 * Handles multipart/form-data upload and attaches the file.
 * Fields: { to, subject, text?, html? } + file
 */
export async function sendAttachment(req, res) {
  if (!req.file) {
    throw ApiError.badRequest("An attachment file is required in multipart field 'file'.", 'MISSING_FILE');
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

  return ApiResponse.success(
    res,
    buildDeliveryData(result),
    `Email with attachment '${req.file.originalname}' sent successfully.`
  );
}

/**
 * POST /api/email/send-bulk
 * Dispatches an email to multiple recipients concurrently using throttled batches.
 * Body: { to: ["user1@example.com", "user2@example.com"] | [{ email, name }], subject, text, html? }
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

  return ApiResponse.success(
    res,
    result,
    `Bulk transmission finished. Total: ${result.total}, Succeeded: ${result.successfulCount}, Failed: ${result.failedCount}`
  );
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

  // Invalidate active, unverified OTPs for this email and purpose
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

  return ApiResponse.success(
    res,
    {
      ...buildDeliveryData(result),
      expiresInMinutes: expiryDuration,
      purpose,
    },
    `Verification OTP email dispatched to ${to}.`
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

  const whereClause = {
    email: cleanEmail,
    isUsed: false,
  };

  if (req.body.purpose && typeof req.body.purpose === 'string' && req.body.purpose.trim()) {
    whereClause.purpose = req.body.purpose.trim().toUpperCase();
  }

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

  // Brute-force protection: Max 5 failed attempts per OTP
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
 * POST /api/email/preview
 * Renders any registered email template in memory for preview without sending SMTP traffic.
 * Body: { template: 'welcome'|'verification'|'reset-password'|'otp'|'invoice'|'direct', data: { ... } }
 */
export async function previewTemplate(req, res) {
  const { template = 'welcome', data = {} } = req.body;

  let rendered;
  const cleanTemplate = template.toLowerCase().trim().replace(/^(hbs:|handlebars:|\/)/, '');

  switch (cleanTemplate) {
    case 'signup':
    case 'welcome-hbs':
      rendered = renderHandlebarsTemplate('signup', {
        name: data.name || 'Farmanullah',
        verificationUrl: data.verificationUrl || 'http://localhost:3000/api/auth/verify-email?token=example_token_123',
        actionUrl: data.actionUrl || 'http://localhost:3000/get-started',
        ...data,
      });
      break;
    case 'loginalert':
    case 'login-alert':
    case 'security-alert':
      rendered = renderHandlebarsTemplate('loginAlert', {
        name: data.name || 'Farmanullah',
        device: data.device || 'Chrome 128 on Windows 11',
        ipAddress: data.ipAddress || '192.168.1.10',
        location: data.location || 'Karachi, Pakistan',
        timestamp: data.timestamp || new Date().toUTCString(),
        securityUrl: data.securityUrl || 'http://localhost:3000/api/auth/forgot-password',
        ...data,
      });
      break;
    case 'otp-hbs':
      rendered = renderHandlebarsTemplate('otp', {
        otp: data.otp || '739201',
        name: data.name || 'Farmanullah',
        expiresInMinutes: data.expiresInMinutes || 10,
        purpose: data.purpose || 'Two-Factor Authentication',
        ...data,
      });
      break;
    case 'resetpassword-hbs':
    case 'reset-password-hbs':
      rendered = renderHandlebarsTemplate('resetPassword', {
        name: data.name || 'Farmanullah',
        resetUrl: data.resetUrl || 'http://localhost:3000/api/auth/reset-password?token=example_token_123',
        token: data.token || 'example_token_123',
        ...data,
      });
      break;
    case 'verify-email-hbs':
    case 'verify-email':
    case 'verifyemail':
      rendered = renderHandlebarsTemplate('verifyEmail', {
        name: data.name || 'Farmanullah',
        verificationUrl: data.verificationUrl || 'http://localhost:3000/api/auth/verify-email?token=example_token_123',
        token: data.token || 'example_token_123',
        ...data,
      });
      break;
    case 'password-changed':
    case 'passwordchanged':
      rendered = renderHandlebarsTemplate('passwordChanged', {
        name: data.name || 'Farmanullah',
        timestamp: data.timestamp || new Date().toUTCString(),
        ipAddress: data.ipAddress || '192.168.1.10',
        device: data.device || 'Chrome 128 on Windows 11',
        securityUrl: data.securityUrl || 'http://localhost:3000/api/auth/forgot-password',
        ...data,
      });
      break;
    case 'invoice-hbs':
      rendered = renderHandlebarsTemplate('invoice', {
        clientName: data.clientName || 'Farmanullah Ansari',
        invoiceNumber: data.invoiceNumber || 'INV-2026-0042',
        issueDate: data.issueDate || new Date().toISOString(),
        dueDate: data.dueDate || new Date(Date.now() + 14 * 86400000).toISOString(),
        isPaid: data.isPaid !== undefined ? data.isPaid : true,
        items: data.items || [
          { description: 'Cloud Transactional SMTP Cluster Setup', quantity: 1, amount: 250 },
          { description: 'DKIM & SPF Authentication Provisioning', quantity: 1, amount: 150 },
          { description: 'Handlebars Dynamic Templates Customization', quantity: 1, amount: 100 },
        ],
        subtotal: data.subtotal || 500,
        tax: data.tax || 25,
        total: data.total || 525,
        paymentUrl: data.paymentUrl || 'http://localhost:3000/billing/pay/INV-2026-0042',
        ...data,
      });
      break;
    case 'welcome':
      rendered = renderWelcomeEmail(data);
      break;
    case 'verification':
      rendered = renderVerificationEmail({
        name: data.name || 'Farmanullah',
        verificationUrl: data.verificationUrl || 'http://localhost:3000/api/auth/verify-email?token=example_token_123',
        token: data.token || 'example_token_123',
      });
      break;
    case 'reset-password':
    case 'password-reset':
      rendered = renderPasswordResetEmail({
        name: data.name || 'Farmanullah',
        resetUrl: data.resetUrl || 'http://localhost:3000/api/auth/reset-password?token=example_token_123',
        token: data.token || 'example_token_123',
      });
      break;
    case 'otp':
      rendered = renderOtpEmail({
        otp: data.otp || '849201',
        name: data.name || 'Farmanullah',
        expiresInMinutes: data.expiresInMinutes || 10,
        purpose: data.purpose || 'Security Verification',
      });
      break;
    case 'invoice':
      rendered = renderInvoiceEmail(data);
      break;
    case 'direct':
    case 'practice':
      rendered = {
        subject: data.title || 'Farmanullah Ansari Company Official Communication',
        html: renderPracticeEmailHtml(data),
        text: data.message || 'Official corporate notification.',
      };
      break;
    default:
      throw ApiError.badRequest(
        `Unknown template '${template}'. Available: 'signup', 'verify-email', 'login-alert', 'otp-hbs', 'reset-password-hbs', 'password-changed', 'invoice-hbs', 'welcome', 'verification', 'reset-password', 'otp', 'invoice', 'direct'.`,
        'INVALID_TEMPLATE_NAME'
      );
  }

  return ApiResponse.success(
    res,
    {
      template,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    },
    `Template '${template}' rendered successfully for preview.`
  );
}

/**
 * POST /api/email/logs/:id/retry
 * Re-dispatches a previously recorded email log by ID.
 */
export async function retryFailedEmail(req, res) {
  const id = Number(req.params.id);
  if (!id) {
    throw ApiError.badRequest('Valid numeric ID is required in URL parameter.');
  }

  const result = await emailService.retryEmailLog(id, req.user?.id, req.user?.role);

  return ApiResponse.success(
    res,
    result,
    `Email transmission for log #${id} was retried successfully.`
  );
}

/**
 * GET /api/email/stats
 * Aggregates email analytics (total, accepted, failed, deliverability rate, average latency, category breakdown) from MSSQL.
 */
export async function getEmailStats(req, res) {
  const whereClause = {};
  if (req.user?.id && req.user?.role !== 'admin') {
    whereClause.userId = req.user.id;
  }

  const [total, accepted, failed, rejected, categoryStats, avgLatencyRow] = await Promise.all([
    EmailLog.count({ where: whereClause }),
    EmailLog.count({ where: { ...whereClause, status: 'ACCEPTED' } }),
    EmailLog.count({ where: { ...whereClause, status: 'FAILED' } }),
    EmailLog.count({ where: { ...whereClause, status: 'REJECTED' } }),
    EmailLog.findAll({
      attributes: ['category', [fn('COUNT', col('id')), 'count']],
      where: whereClause,
      group: ['category'],
      raw: true,
    }),
    EmailLog.findAll({
      attributes: [[fn('AVG', col('deliveryDurationMs')), 'avgDuration']],
      where: { ...whereClause, status: 'ACCEPTED' },
      raw: true,
    }),
  ]);

  const deliverabilityRate = total > 0 ? Number(((accepted / total) * 100).toFixed(2)) : 100;
  const avgLatencyMs = avgLatencyRow?.[0]?.avgDuration ? Math.round(Number(avgLatencyRow[0].avgDuration)) : 0;

  const categories = {};
  categoryStats.forEach((c) => {
    categories[c.category] = Number(c.count);
  });

  return ApiResponse.success(
    res,
    {
      totalDispatched: total,
      accepted,
      failed,
      rejected,
      deliverabilityRate: `${deliverabilityRate}%`,
      averageDeliveryDurationMs: avgLatencyMs,
      byCategory: categories,
    },
    'Email delivery metrics retrieved successfully.'
  );
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

  return ApiResponse.success(res, log, 'Email log retrieved.');
}

/**
 * GET /api/email/logs
 * Fetches recent email dispatch logs stored in MSSQL with search and filter capabilities.
 */
export async function getEmailLogs(req, res) {
  const result = await emailService.getEmailLogs({
    userId: req.user?.id,
    role: req.user?.role,
    page: req.query.page,
    limit: req.query.limit,
    status: req.query.status,
    category: req.query.category,
    search: req.query.search,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
  });

  return ApiResponse.success(
    res,
    result.logs,
    `Retrieved ${result.logs.length} email dispatch logs from database.`,
    200,
    result.pagination
  );
}
