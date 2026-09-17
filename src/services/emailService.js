import { getTransporter, getPreviewUrl } from '../config/mailer.js';
import { EmailLog } from '../models/EmailLog.js';
import { renderWelcomeEmail } from '../templates/welcomeEmail.js';
import { renderVerificationEmail, renderPasswordResetEmail } from '../templates/authEmails.js';
import { renderOtpEmail } from '../templates/otpEmail.js';

/**
 * ============================================================================
 * EMAIL SERVICE (PRODUCTION GRADE)
 * ============================================================================
 * Centralized service for all outbound email dispatch operations.
 * Features:
 * - Nodemailer transport pooling & fallback management
 * - Transient error retry mechanism with exponential backoff
 * - Multipart/alternative plain-text fallback generation
 * - Batching / concurrency throttling for bulk email dispatch
 * - Non-blocking MSSQL delivery audit persistence
 * - Sandbox recipient redirection for Mailtrap demomailtrap.co
 * ============================================================================
 */

/**
 * Non-blocking database audit logger.
 * Records delivery metadata into MSSQL without halting the email response flow.
 */
async function recordAuditLog({ userId, recipient, subject, status, messageId, providerResponse, previewUrl, errorMessage }) {
  try {
    await EmailLog.create({
      userId: userId || null,
      recipient,
      subject,
      status,
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
 */
async function dispatchWithRetry(transporter, mailOptions, maxRetries = 2) {
  let attempt = 0;
  const transientErrorCodes = ['ETIMEDOUT', 'ECONNECTION', 'ESOCKET', 'ECONNRESET'];

  while (attempt <= maxRetries) {
    try {
      return await transporter.sendMail(mailOptions);
    } catch (error) {
      attempt++;
      const isTransient = transientErrorCodes.includes(error.code);

      if (isTransient && attempt <= maxRetries) {
        const delayMs = Math.pow(2, attempt) * 500; // 1000ms, 2000ms
        console.warn(`[EmailService] Transient SMTP error (${error.code}). Retrying attempt ${attempt}/${maxRetries} in ${delayMs}ms...`);
        await sleep(delayMs);
      } else {
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
 * @returns {Promise<{ messageId: string, accepted: string[], rejected: string[], response: string, previewUrl: string|null }>}
 */
export async function sendEmail({ to, subject, text, html, attachments, replyTo, userId }) {
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
    const info = await dispatchWithRetry(transporter, mailOptions);
    const previewUrl = getPreviewUrl(info);

    // Asynchronously record success in MSSQL
    recordAuditLog({
      userId,
      recipient: to,
      subject,
      status: 'ACCEPTED',
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
    };
  } catch (error) {
    // Record failure in MSSQL
    recordAuditLog({
      userId,
      recipient: to,
      subject,
      status: 'FAILED',
      errorMessage: error.message,
    });

    throw error;
  }
}

/**
 * Sends a plain-text email.
 */
export async function sendPlainTextEmail({ to, subject, text, replyTo, userId }) {
  return sendEmail({ to, subject, text, replyTo, userId });
}

/**
 * Sends a rich HTML email with automatic plain-text fallback.
 */
export async function sendHtmlEmail({ to, subject, html, text, replyTo, userId }) {
  return sendEmail({ to, subject, html, text, replyTo, userId });
}

/**
 * Sends the welcome email template.
 */
export async function sendWelcomeEmail({ to, name, replyTo, userId }) {
  const { subject, html, text } = renderWelcomeEmail({ name });
  return sendEmail({ to, subject, html, text, replyTo, userId });
}

/**
 * Sends an email verification link and token.
 */
export async function sendVerificationEmail({ to, name, verificationUrl, token, userId }) {
  const { subject, html, text } = renderVerificationEmail({ name, verificationUrl, token });
  return sendEmail({ to, subject, html, text, userId });
}

/**
 * Sends a password reset link and token.
 */
export async function sendPasswordResetEmail({ to, name, resetUrl, token, userId }) {
  const { subject, html, text } = renderPasswordResetEmail({ name, resetUrl, token });
  return sendEmail({ to, subject, html, text, userId });
}

/**
 * Sends a secure One-Time Password (OTP) verification email.
 */
export async function sendOtpEmail({ to, otp, name, expiresInMinutes = 10, purpose = 'Verification', userId }) {
  const { subject, html, text } = renderOtpEmail({ otp, name, expiresInMinutes, purpose });
  return sendEmail({ to, subject, html, text, userId });
}

/**
 * Sends an email with an uploaded attachment buffer.
 */
export async function sendAttachmentEmail({ to, subject, file, text, html, replyTo, userId }) {
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
  });
}

/**
 * Dispatches emails to multiple recipients in throttled batches to protect SMTP socket limits
 * and avoid provider rate-limit rejections.
 * 
 * @param {object} options
 * @param {string[]} options.to - Array of recipient emails
 * @param {string} options.subject
 * @param {string} [options.text]
 * @param {string} [options.html]
 * @param {string} [options.replyTo]
 * @param {number} [options.userId]
 * @param {number} [options.concurrency] - Simultaneous emails per batch (default 5)
 */
export async function sendBulkEmails({ to: recipients, subject, text, html, replyTo, userId, concurrency = 5 }) {
  const successful = [];
  const failed = [];

  // Chunk recipients into batches of size = concurrency
  for (let i = 0; i < recipients.length; i += concurrency) {
    const batch = recipients.slice(i, i + concurrency);

    const batchPromises = batch.map((recipient) =>
      sendEmail({
        to: recipient,
        subject,
        text,
        html,
        replyTo,
        userId,
      }).then((result) => ({
        to: recipient,
        ...result,
      }))
    );

    const settled = await Promise.allSettled(batchPromises);

    settled.forEach((res, idx) => {
      const recipient = batch[idx];
      if (res.status === 'fulfilled') {
        successful.push(res.value);
      } else {
        failed.push({
          to: recipient,
          error: res.reason?.message || 'Failed to dispatch email',
          code: res.reason?.code || 'SEND_ERROR',
        });
      }
    });

    // Small delay between batches if more remain
    if (i + concurrency < recipients.length) {
      await sleep(150);
    }
  }

  return {
    total: recipients.length,
    successfulCount: successful.length,
    failedCount: failed.length,
    successful,
    failed,
  };
}

/**
 * Queries email logs from MSSQL database with user filtering and structured pagination.
 */
export async function getEmailLogs({ userId, role, page = 1, limit = 20, status = null }) {
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

export default {
  sendEmail,
  sendPlainTextEmail,
  sendHtmlEmail,
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOtpEmail,
  sendAttachmentEmail,
  sendBulkEmails,
  getEmailLogs,
};
