/**
 * RFC 5322 Compliant simplified email validation regular expression.
 * Validates that an address has standard characters, an @ symbol, and a valid domain part.
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

import { checkDomainTypo } from './dnsValidator.js';

/**
 * Normalizes an email address string (lowercase and trim).
 * @param {string} email
 * @returns {string}
 */
export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

/**
 * Validates a single email address string.
 * @param {string} email 
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  return trimmed.length > 3 && trimmed.length <= 254 && EMAIL_REGEX.test(trimmed);
}

/**
 * Creates a standard validation error object compatible with our errorHandler middleware.
 * @param {string} message 
 * @param {string} field 
 * @param {string|null} [suggestion]
 * @returns {Error}
 */
function createValidationError(message, field, suggestion = null) {
  const error = new Error(message);
  error.isValidationError = true;
  error.status = 400;
  error.field = field;
  if (suggestion) {
    error.suggestion = suggestion;
    error.hint = `Did you mean '${suggestion}'?`;
  }
  return error;
}

/**
 * Validates email request payloads without external dependencies.
 * 
 * @param {object} payload - Request body
 * @param {object} options - Validation requirements
 * @param {boolean} options.requireSubject - Subject is mandatory (default: true)
 * @param {boolean} options.requireText - Plain text body is mandatory
 * @param {boolean} options.requireHtml - HTML body is mandatory
 * @param {boolean} options.allowBulk - If true, validates an array of 'to' addresses
 * @param {boolean} options.checkTypos - If true, warns/flags common domain typos (default: true)
 */
export function validateEmailPayload(payload = {}, options = {}) {
  const {
    requireSubject = true,
    requireText = false,
    requireHtml = false,
    allowBulk = false,
    checkTypos = true,
  } = options;

  // 1. Validate Recipient(s)
  if (allowBulk) {
    if (!Array.isArray(payload.to) || payload.to.length === 0) {
      throw createValidationError("The 'to' field must be a non-empty array of email addresses.", "to");
    }
    for (let i = 0; i < payload.to.length; i++) {
      const email = payload.to[i];
      if (!isValidEmail(email)) {
        throw createValidationError(`Invalid email address at index ${i}: '${email}'`, `to[${i}]`);
      }
    }
  } else {
    if (!payload.to || typeof payload.to !== 'string' || !isValidEmail(payload.to)) {
      throw createValidationError("A valid 'to' email address is required (e.g. user@example.com).", "to");
    }

    if (checkTypos) {
      const { hasTypo, suggestion } = checkDomainTypo(payload.to);
      if (hasTypo && suggestion) {
        const username = payload.to.split('@')[0];
        const suggestedEmail = `${username}@${suggestion}`;
        // Attach suggestion to payload for response hints
        payload._suggestedEmail = suggestedEmail;
      }
    }
  }

  // 2. Validate Subject
  if (requireSubject) {
    if (!payload.subject || typeof payload.subject !== 'string' || payload.subject.trim().length === 0) {
      throw createValidationError("The 'subject' field is required and cannot be empty.", "subject");
    }
  }

  // 3. Validate Text Body
  if (requireText) {
    if (!payload.text || typeof payload.text !== 'string' || payload.text.trim().length === 0) {
      throw createValidationError("The 'text' field is required for plain-text emails.", "text");
    }
  }

  // 4. Validate HTML Body
  if (requireHtml) {
    if (!payload.html || typeof payload.html !== 'string' || payload.html.trim().length === 0) {
      throw createValidationError("The 'html' field is required for HTML emails.", "html");
    }
  }

  return true;
}

