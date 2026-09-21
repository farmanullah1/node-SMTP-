import { Op } from 'sequelize';
import { getTransporter, getPreviewUrl } from '../config/mailer.js';
import { EmailLog } from '../models/EmailLog.js';
import { renderWelcomeEmail } from '../templates/welcomeEmail.js';
import { renderVerificationEmail, renderPasswordResetEmail } from '../templates/authEmails.js';
import { renderOtpEmail } from '../templates/otpEmail.js';
import { renderInvoiceEmail } from '../templates/invoiceEmail.js';
import { renderHandlebarsTemplate } from '../templates/handlebars/renderer.js';

/**
 * ============================================================================
 * EMAIL SERVICE (PRODUCTION GRADE)
 * ============================================================================
 * Centralized service for all outbound email dispatch operations.
 * Features:
 * - Nodemailer transport pooling & fallback management
 * - Transient error retry mechanism with exponential backoff
 * - Delivery latency tracking & retry counting in MSSQL audit logs
 * - Category classification (WELCOME, INVOICE, OTP, AUTH, BULK, etc.)
 * - Multipart/alternative plain-text fallback generation
 * - Batching / concurrency throttling & deduplication for bulk email dispatch
 * - Non-blocking MSSQL delivery audit persistence with indexed columns
 * - Live log filtering, searching, and resend/retry capabilities
 * - Sandbox recipient redirection for Mailtrap demomailtrap.co
 * ============================================================================
 */

/**
 * Non-blocking database audit logger.
 * Records delivery metadata into MSSQL without halting the email response flow.
 */
async function recordAuditLog({
  userId,
  recipient,
  subject,
  status,
  messageId,
  providerResponse,
  previewUrl,
  errorMessage,
  category = 'CUSTOM',
  deliveryDurationMs = null,
  attempts = 1,
  metadata = null,
}) {
  try {
    await EmailLog.create({
      userId: userId || null,
      recipient,
      subject,
      status,
      category: category || 'CUSTOM',
      deliveryDurationMs: deliveryDurationMs !== null ? Math.round(deliveryDurationMs) : null,
      attempts: attempts || 1,
      metadata: typeof metadata === 'object' && metadata !== null ? JSON.stringify(metadata) : metadata,
      messageId: messageId || null,
      providerResponse: typeof providerResponse === 'string' ? providerResponse : JSON.stringify(providerResponse),
      previewUrl: previewUrl || null,
      errorMessage: errorMessage || null,
    });
  } catch (err) {
    console.warn('[EmailService] Database audit log warning:', err.message);
  }
}

/**
 * Sleep helper for backoff delays.
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends an email with an automatic retry policy for transient SMTP/network errors.
 * Returns { info, attempts } upon success.
 */
async function dispatchWithRetry(transporter, mailOptions, maxRetries = 2) {
  let attempt = 0;
  const transientErrorCodes = ['ETIMEDOUT', 'ECONNECTION', 'ESOCKET', 'ECONNRESET'];

  while (attempt <= maxRetries) {
    try {
      const info = await transporter.sendMail(mailOptions);
      return { info, attempts: attempt + 1 };
    } catch (error) {
      attempt++;
      const isTransient = transientErrorCodes.includes(error.code);

      if (isTransient && attempt <= maxRetries) {
        const delayMs = Math.pow(2, attempt) * 500; // 1000ms, 2000ms
        console.warn(`[EmailService] Transient SMTP error (${error.code}). Retrying attempt ${attempt}/${maxRetries} in ${delayMs}ms...`);
        await sleep(delayMs);
      } else {
        error.attempts = attempt;
        throw error;
      }
    }
  }
}

/**
 * Core email dispatcher.
 * 
 * @param {object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject line
 * @param {string} [options.text] - Plain-text body
 * @param {string} [options.html] - HTML body
 * @param {Array}  [options.attachments] - Array of attachment objects
 * @param {string} [options.replyTo] - Reply-to email address
 * @param {number} [options.userId] - Optional authenticated user ID for database tracking
 * @param {string} [options.category='CUSTOM'] - Email category
 * @param {object|string} [options.metadata] - Optional arbitrary tracking metadata
 * @returns {Promise<{ messageId: string, accepted: string[], rejected: string[], response: string, previewUrl: string|null, deliveryDurationMs: number, attempts: number }>}
 */
export async function sendEmail({ to, subject, text, html, attachments, replyTo, userId, category = 'CUSTOM', metadata }) {
  const startTime = Date.now();
  const transporter = await getTransporter();

  // Ensure multipart/alternative: strip tags if text alternative is missing
  let fallbackText = text;
  if (!fallbackText && html) {
    fallbackText = html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  }

  // Check if a designated Mailtrap test recipient override is configured
  const overrideRecipient = process.env.MAILTRAP_TEST_RECIPIENT || process.env.OVERRIDE_RECIPIENT;
  let targetTo = to;
  let targetSubject = subject;
  let targetText = fallbackText;
  let targetHtml = html;

  if (overrideRecipient && to.toLowerCase() !== overrideRecipient.toLowerCase()) {
    console.log(`[Mailtrap Policy Routing] Diverting email intended for "${to}" -> "${overrideRecipient}" (demomailtrap.co delivery rule).`);
    targetTo = overrideRecipient;
    targetSubject = `[To: ${to}] ${subject}`;

    const note = `[Mailtrap Learning Lab Note: Intended recipient was ${to}]\n\n`;
    targetText = note + (fallbackText || '');

    if (targetHtml) {
      const bannerHtml = `
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 12px 16px; font-size: 13px; margin-bottom: 20px; border-radius: 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <strong>Mailtrap demomailtrap.co Policy:</strong> This email was originally addressed to <code>${to}</code>, but was delivered to your registered Mailtrap inbox (<code>${overrideRecipient}</code>) for testing.
        </div>
      `;
      targetHtml = bannerHtml + targetHtml;
    }
  }

  const mailOptions = {
    from: process.env.MAIL_FROM || undefined,
    to: targetTo,
    replyTo: replyTo || undefined,
    subject: targetSubject,
    text: targetText,
    html: targetHtml || undefined,
    attachments: attachments || undefined,
  };

  try {
    const { info, attempts } = await dispatchWithRetry(transporter, mailOptions);
    const deliveryDurationMs = Date.now() - startTime;
    const previewUrl = getPreviewUrl(info);

    // Asynchronously record success in MSSQL
    recordAuditLog({
      userId,
      recipient: to,
      subject,
      status: 'ACCEPTED',
      category,
      deliveryDurationMs,
      attempts,
      metadata,
      messageId: info.messageId,
      providerResponse: info.response,
      previewUrl,
    });

    return {
      messageId: info.messageId,
      accepted: info.accepted || [],
      rejected: info.rejected || [],
      response: info.response || null,
      previewUrl,
      deliveryDurationMs,
      attempts,
    };
  } catch (error) {
    const deliveryDurationMs = Date.now() - startTime;
    // Record failure in MSSQL
    recordAuditLog({
      userId,
      recipient: to,
      subject,
      status: 'FAILED',
      category,
      deliveryDurationMs,
      attempts: error.attempts || 1,
      metadata,
      errorMessage: error.message,
    });

    throw error;
  }
}

/**
 * Sends a plain-text email.
 */
export async function sendPlainTextEmail({ to, subject, text, replyTo, userId, metadata }) {
  return sendEmail({ to, subject, text, replyTo, userId, category: 'DIRECT', metadata });
}

/**
 * Sends a rich HTML email with automatic plain-text fallback.
 */
export async function sendHtmlEmail({ to, subject, html, text, replyTo, userId, metadata }) {
  return sendEmail({ to, subject, html, text, replyTo, userId, category: 'DIRECT', metadata });
}

/**
 * Sends the welcome email template.
 */
export async function sendWelcomeEmail({ to, name, replyTo, userId, metadata }) {
  const { subject, html, text } = renderWelcomeEmail({ name });
  return sendEmail({ to, subject, html, text, replyTo, userId, category: 'WELCOME', metadata });
}

/**
 * Sends an email verification link and token.
 */
export async function sendVerificationEmail({ to, name, verificationUrl, token, userId }) {
  const { subject, html, text } = renderVerificationEmail({ name, verificationUrl, token });
  return sendEmail({ to, subject, html, text, userId, category: 'AUTH_VERIFICATION' });
}

/**
 * Sends a password reset link and token.
 */
export async function sendPasswordResetEmail({ to, name, resetUrl, token, userId }) {
  const { subject, html, text } = renderPasswordResetEmail({ name, resetUrl, token });
  return sendEmail({ to, subject, html, text, userId, category: 'AUTH_RESET' });
}

/**
 * Sends a secure One-Time Password (OTP) verification email.
 */
export async function sendOtpEmail({ to, otp, name, expiresInMinutes = 10, purpose = 'Verification', userId }) {
  const { subject, html, text } = renderOtpEmail({ otp, name, expiresInMinutes, purpose });
  return sendEmail({ to, subject, html, text, userId, category: 'OTP' });
}

/**
 * Sends an official Corporate Invoice / Billing email.
 */
export async function sendInvoiceEmail({
  to,
  invoiceNumber,
  customerName,
  customerEmail,
  issueDate,
  dueDate,
  status,
  currency,
  items,
  taxRate,
  actionUrl,
  notes,
  replyTo,
  userId,
  metadata,
}) {
  const { subject, html, text } = renderInvoiceEmail({
    invoiceNumber,
    customerName,
    customerEmail: customerEmail || to,
    issueDate,
    dueDate,
    status,
    currency,
    items,
    taxRate,
    actionUrl,
    notes,
  });

  return sendEmail({
    to,
    subject,
    html,
    text,
    replyTo,
    userId,
    category: 'INVOICE',
    metadata,
  });
}

/**
 * Dispatches an email rendered via the Handlebars dynamic template engine.
 */
export async function sendHandlebarsEmail({ template, data = {}, to, subject, replyTo, userId, category, metadata }) {
  const rendered = renderHandlebarsTemplate(template, { recipient: to, ...data });
  return sendEmail({
    to,
    subject: subject || rendered.subject,
    html: rendered.html,
    text: rendered.text,
    replyTo,
    userId,
    category: category || `HBS_${template.toUpperCase()}`,
    metadata: { ...metadata, templateEngine: 'handlebars', templateName: template },
  });
}

/**
 * Dispatches a Security Login Notification email when an account login is detected.
 */
export async function sendLoginAlertEmail({ to, name, device, ipAddress, location, timestamp, securityUrl, userId }) {
  return sendHandlebarsEmail({
    template: 'loginAlert',
    data: {
      name,
      device,
      ipAddress,
      location,
      timestamp: timestamp || new Date().toUTCString(),
      securityUrl,
    },
    to,
    category: 'SECURITY_ALERT',
    userId,
  });
}

/**
 * Sends an email with an uploaded attachment buffer.
 */
export async function sendAttachmentEmail({ to, subject, file, text, html, replyTo, userId, metadata }) {
  const attachments = file
    ? [
        {
          filename: file.originalname,
          content: file.buffer,
          contentType: file.mimetype,
        },
      ]
    : undefined;

  return sendEmail({
    to,
    subject,
    text: text || 'Please review the attached document.',
    html: html || undefined,
    attachments,
    replyTo,
    userId,
    category: 'ATTACHMENT',
    metadata,
  });
}

/**
 * Dispatches emails to multiple recipients in throttled batches to protect SMTP socket limits
 * and avoid provider rate-limit rejections.
 * 
 * Supports deduplication and per-recipient customized payloads.
 * 
 * @param {object} options
 * @param {Array<string|object>} options.to - Array of recipient emails or objects ({ email, name, subject?, text?, html? })
 * @param {string} [options.subject]
 * @param {string} [options.text]
 * @param {string} [options.html]
 * @param {string} [options.replyTo]
 * @param {number} [options.userId]
 * @param {number} [options.concurrency=5] - Simultaneous emails per batch
 */
export async function sendBulkEmails({ to: rawRecipients, subject, text, html, replyTo, userId, concurrency = 5 }) {
  const successful = [];
  const failed = [];

  // Deduplicate and normalize recipients
  const seenEmails = new Set();
  const normalizedRecipients = [];

  for (const item of rawRecipients) {
    const targetEmail = typeof item === 'string' ? item.trim().toLowerCase() : item?.email?.trim().toLowerCase();
    if (!targetEmail || seenEmails.has(targetEmail)) continue;

    seenEmails.add(targetEmail);
    normalizedRecipients.push(typeof item === 'string' ? { email: targetEmail } : { ...item, email: targetEmail });
  }

  // Chunk recipients into batches of size = concurrency
  for (let i = 0; i < normalizedRecipients.length; i += concurrency) {
    const batch = normalizedRecipients.slice(i, i + concurrency);

    const batchPromises = batch.map((item) => {
      const recipientEmail = item.email;
      const targetSubject = item.subject || subject;
      const targetText = item.text || text;
      const targetHtml = item.html || html;

      return sendEmail({
        to: recipientEmail,
        subject: targetSubject,
        text: targetText,
        html: targetHtml,
        replyTo,
        userId,
        category: 'BULK',
        metadata: { bulkBatchIndex: Math.floor(i / concurrency) + 1 },
      }).then((result) => ({
        to: recipientEmail,
        ...result,
      }));
    });

    const settled = await Promise.allSettled(batchPromises);

    settled.forEach((res, idx) => {
      const item = batch[idx];
      if (res.status === 'fulfilled') {
        successful.push(res.value);
      } else {
        failed.push({
          to: item.email,
          error: res.reason?.message || 'Failed to dispatch email',
          code: res.reason?.code || 'SEND_ERROR',
        });
      }
    });

    // Small delay between batches if more remain
    if (i + concurrency < normalizedRecipients.length) {
      await sleep(150);
    }
  }

  return {
    total: normalizedRecipients.length,
    successfulCount: successful.length,
    failedCount: failed.length,
    successful,
    failed,
  };
}

/**
 * Queries email logs from MSSQL database with search, category filtering, and structured pagination.
 */
export async function getEmailLogs({
  userId,
  role,
  page = 1,
  limit = 20,
  status = null,
  category = null,
  search = null,
  startDate = null,
  endDate = null,
}) {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const offset = (safePage - 1) * safeLimit;

  const whereClause = {};

  // Restrict to user's own emails if not admin
  if (userId && role !== 'admin') {
    whereClause.userId = userId;
  }

  if (status) {
    whereClause.status = String(status).toUpperCase();
  }

  if (category) {
    whereClause.category = String(category).toUpperCase();
  }

  // Date range filtering
  if (startDate || endDate) {
    whereClause.createdAt = {};
    if (startDate) {
      whereClause.createdAt[Op.gte] = new Date(startDate);
    }
    if (endDate) {
      whereClause.createdAt[Op.lte] = new Date(endDate);
    }
  }

  // Full-text / substring search across recipient, subject, or messageId
  if (search && typeof search === 'string' && search.trim().length > 0) {
    const term = `%${search.trim()}%`;
    whereClause[Op.or] = [
      { recipient: { [Op.like]: term } },
      { subject: { [Op.like]: term } },
      { messageId: { [Op.like]: term } },
    ];
  }

  const { count, rows } = await EmailLog.findAndCountAll({
    where: whereClause,
    order: [['createdAt', 'DESC']],
    limit: safeLimit,
    offset,
  });

  const totalPages = Math.ceil(count / safeLimit);

  return {
    logs: rows,
    pagination: {
      totalRecords: count,
      currentPage: safePage,
      totalPages,
      limit: safeLimit,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    },
  };
}

/**
 * Retries sending an email based on a previous EmailLog record.
 * 
 * @param {number} logId 
 * @param {number} [userId] 
 * @param {string} [role] 
 * @returns {Promise<object>}
 */
export async function retryEmailLog(logId, userId = null, role = null) {
  const log = await EmailLog.findByPk(logId);
  if (!log) {
    const err = new Error(`Email log #${logId} not found.`);
    err.status = 404;
    throw err;
  }

  // Security check: non-admins can only retry their own logs
  if (userId && role !== 'admin' && log.userId !== userId) {
    const err = new Error('You are not authorized to retry this email transmission.');
    err.status = 403;
    throw err;
  }

  // Re-dispatch
  const result = await sendEmail({
    to: log.recipient,
    subject: log.subject,
    text: `Re-transmission of: ${log.subject}`,
    userId: log.userId,
    category: log.category,
    metadata: { retriedFromLogId: log.id },
  });

  return {
    originalLogId: log.id,
    newTransmission: result,
  };
}

export default {
  sendEmail,
  sendPlainTextEmail,
  sendHtmlEmail,
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOtpEmail,
  sendInvoiceEmail,
  sendHandlebarsEmail,
  sendLoginAlertEmail,
  sendAttachmentEmail,
  sendBulkEmails,
  getEmailLogs,
  retryEmailLog,
};

