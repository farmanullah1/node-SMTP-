import dns from 'dns/promises';

/**
 * Common domain typo mapping for automatic detection and correction hints.
 * Catches frequent user typing mistakes before initiating SMTP transport.
 */
const COMMON_DOMAIN_TYPOS = {
  'gamil.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'ymail.con': 'ymail.com',
  'hotmial.com': 'hotmail.com',
  'hotmaill.com': 'hotmail.com',
  'hotmil.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'iclod.com': 'icloud.com',
  'iclou.com': 'icloud.com',
};

/**
 * Extracts the domain part from an email address.
 * @param {string} email
 * @returns {string|null}
 */
export function extractDomain(email) {
  if (typeof email !== 'string') return null;
  const parts = email.trim().split('@');
  return parts.length === 2 && parts[1].length > 0 ? parts[1].toLowerCase() : null;
}

/**
 * Detects if an email domain matches a known typo and returns the suggested correction.
 * @param {string} emailOrDomain
 * @returns {{ hasTypo: boolean, suggestion: string|null }}
 */
export function checkDomainTypo(emailOrDomain) {
  if (!emailOrDomain || typeof emailOrDomain !== 'string') {
    return { hasTypo: false, suggestion: null };
  }

  const domain = emailOrDomain.includes('@') ? extractDomain(emailOrDomain) : emailOrDomain.toLowerCase().trim();
  if (!domain) {
    return { hasTypo: false, suggestion: null };
  }

  const suggestion = COMMON_DOMAIN_TYPOS[domain] || null;
  return {
    hasTypo: !!suggestion,
    suggestion,
  };
}

/**
 * Resolves MX (Mail Exchange) DNS records for a domain to verify it can accept mail.
 * Caches results in memory for 10 minutes to minimize DNS queries.
 * 
 * @param {string} domainOrEmail
 * @param {object} [options]
 * @param {number} [options.timeoutMs=4000]
 * @returns {Promise<{ hasMx: boolean, exchange: string|null, priority: number|null, error: string|null }>}
 */
const mxCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function verifyDomainMx(domainOrEmail, options = {}) {
  const domain = domainOrEmail.includes('@') ? extractDomain(domainOrEmail) : domainOrEmail.toLowerCase().trim();
  if (!domain) {
    return { hasMx: false, exchange: null, priority: null, error: 'Invalid domain format.' };
  }

  // Check cache
  const cached = mxCache.get(domain);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  // Bypass DNS query for localhost or test environments
  if (domain === 'localhost' || domain.endsWith('.local') || domain.endsWith('.test')) {
    const res = { hasMx: true, exchange: 'localhost', priority: 10, error: null };
    mxCache.set(domain, { timestamp: Date.now(), result: res });
    return res;
  }

  try {
    const timeoutMs = options.timeoutMs || 4000;
    const records = await Promise.race([
      dns.resolveMx(domain),
      new Promise((_, reject) => setTimeout(() => reject(new Error('DNS query timed out')), timeoutMs)),
    ]);

    if (!Array.isArray(records) || records.length === 0) {
      const res = { hasMx: false, exchange: null, priority: null, error: `No MX records found for domain '${domain}'.` };
      mxCache.set(domain, { timestamp: Date.now(), result: res });
      return res;
    }

    // Sort by lowest priority number (highest preference)
    records.sort((a, b) => a.priority - b.priority);
    const bestRecord = records[0];

    const res = {
      hasMx: true,
      exchange: bestRecord.exchange,
      priority: bestRecord.priority,
      error: null,
    };

    mxCache.set(domain, { timestamp: Date.now(), result: res });
    return res;
  } catch (err) {
    const res = {
      hasMx: false,
      exchange: null,
      priority: null,
      error: err.code === 'ENOTFOUND' ? `Domain '${domain}' does not exist.` : err.message,
    };
    // Cache negative response for 2 minutes
    mxCache.set(domain, { timestamp: Date.now() - CACHE_TTL_MS + (2 * 60 * 1000), result: res });
    return res;
  }
}
