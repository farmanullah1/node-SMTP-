import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory template compilation cache
const templateCache = new Map();
let layoutCompiled = null;
let initialized = false;

/**
 * Non-breaking padding sequence to prevent email clients from pulling
 * header/footer text into the inbox preview snippet when preheader is short.
 */
const PREHEADER_PADDING = '&#847; &zwnj;&nbsp;&#8199;&shy;&#847; &zwnj;&nbsp;&#8199;&shy;&#847; &zwnj;&nbsp;&#8199;&shy;&#847; &zwnj;&nbsp;&#8199;&shy;&#847; &zwnj;&nbsp;&#8199;&shy;&#847; &zwnj;&nbsp;&#8199;&shy;&#847; &zwnj;&nbsp;&#8199;&shy;&#847; &zwnj;&nbsp;&#8199;&shy;&#847; &zwnj;&nbsp;&#8199;&shy;&#847; &zwnj;&nbsp;&#8199;&shy;&#847; &zwnj;&nbsp;&#8199;&shy;&#847; &zwnj;&nbsp;&#8199;&shy;&#847; &zwnj;&nbsp;&#8199;&shy;&#847; &zwnj;&nbsp;&#8199;&shy;&#847; &zwnj;&nbsp;&#8199;&shy;&#847; &zwnj;&nbsp;&#8199;&shy;';

/**
 * Registers custom Handlebars helpers for email formatting.
 */
function registerHelpers() {
  Handlebars.registerHelper('currentYear', () => new Date().getFullYear());

  Handlebars.registerHelper('eq', (a, b) => a === b);

  Handlebars.registerHelper('formatCurrency', (amount, symbol = '$') => {
    const num = Number(amount) || 0;
    return `${symbol}${num.toFixed(2)}`;
  });

  Handlebars.registerHelper('formatDate', (dateStr) => {
    try {
      const d = dateStr ? new Date(dateStr) : new Date();
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (_) {
      return dateStr || '';
    }
  });

  Handlebars.registerHelper('preheaderPadding', () => new Handlebars.SafeString(PREHEADER_PADDING));

  Handlebars.registerHelper('fallback', (val, defaultVal) => {
    return (val !== undefined && val !== null && val !== '') ? val : defaultVal;
  });
}

/**
 * Registers partials located in the partials/ directory.
 */
function registerPartials() {
  const partialsDir = path.join(__dirname, 'partials');
  if (fs.existsSync(partialsDir)) {
    const files = fs.readdirSync(partialsDir);
    for (const file of files) {
      if (file.endsWith('.handlebars') || file.endsWith('.hbs')) {
        const partialName = path.basename(file, path.extname(file));
        const partialContent = fs.readFileSync(path.join(partialsDir, file), 'utf8');
        Handlebars.registerPartial(partialName, partialContent);
      }
    }
  }
}

/**
 * Ahead-Of-Time (AOT) precompilation for all top-level templates in src/templates/handlebars/.
 * Eliminates filesystem read latency on high-throughput email dispatches.
 */
function precompileTemplates() {
  try {
    const files = fs.readdirSync(__dirname);
    for (const file of files) {
      if ((file.endsWith('.handlebars') || file.endsWith('.hbs')) && file !== 'layouts') {
        const templateName = path.basename(file, path.extname(file));
        const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
        templateCache.set(templateName, Handlebars.compile(content));
      }
    }
  } catch (err) {
    console.warn('[HandlebarsEngine] Warning during template precompilation:', err.message);
  }
}

/**
 * Initializes the Handlebars engine (partials, helpers, layout, and precompiled views).
 */
export function initHandlebarsEngine() {
  if (initialized && layoutCompiled) {
    return;
  }

  registerHelpers();
  registerPartials();

  const layoutPath = path.join(__dirname, 'layouts', 'main.handlebars');
  if (fs.existsSync(layoutPath)) {
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');
    layoutCompiled = Handlebars.compile(layoutContent);
  } else {
    throw new Error(`Master layout not found at: ${layoutPath}`);
  }

  precompileTemplates();

  initialized = true;
}

/**
 * Generates a clean plain-text fallback from HTML.
 * Strips scripts, styles, tags, and collapses excess whitespace.
 * 
 * @param {string} html 
 * @returns {string}
 */
export function htmlToPlainText(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Renders a Handlebars template wrapped inside layouts/main.handlebars.
 * 
 * @param {string} templateName - e.g. 'signup', 'loginAlert', 'otp', 'resetPassword'
 * @param {object} [context={}] - Dynamic view variables
 * @param {object} [options={}]
 * @param {boolean} [options.useLayout=true] - Whether to wrap within main.handlebars
 * @returns {{ subject: string, html: string, text: string }}
 */
export function renderHandlebarsTemplate(templateName, context = {}, options = {}) {
  initHandlebarsEngine();

  // Normalize alias names (e.g., 'verify-email' -> 'verifyEmail')
  const aliasMap = {
    'verify-email': 'verifyEmail',
    'verifyemail': 'verifyEmail',
    'login-alert': 'loginAlert',
    'loginalert': 'loginAlert',
    'reset-password': 'resetPassword',
    'reset-password-hbs': 'resetPassword',
    'resetpassword': 'resetPassword',
    'password-changed': 'passwordChanged',
    'passwordchanged': 'passwordChanged',
    'otp-hbs': 'otp',
    'invoice-hbs': 'invoice',
  };

  const rawClean = templateName.replace(/\.(handlebars|hbs)$/, '');
  const cleanName = aliasMap[rawClean.toLowerCase()] || rawClean;
  const templatePath = path.join(__dirname, `${cleanName}.handlebars`);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Handlebars template '${cleanName}' not found at: ${templatePath}`);
  }

  // Retrieve or compile view
  let compiledView = templateCache.get(cleanName);
  if (!compiledView) {
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    compiledView = Handlebars.compile(templateContent);
    templateCache.set(cleanName, compiledView);
  }

  // Pre-process context helpers & corporate defaults
  const enrichedContext = { ...context };

  // Corporate branding defaults
  enrichedContext.companyName = enrichedContext.companyName || 'Farmanullah Ansari Company';
  enrichedContext.companyAddress = enrichedContext.companyAddress || '123 Business Avenue, Suite 400, Karachi, Pakistan';
  enrichedContext.companyPhone = enrichedContext.companyPhone || '+92-300-1234567';
  enrichedContext.supportEmail = enrichedContext.supportEmail || 'contact@farmanullahansari.com';
  enrichedContext.privacyUrl = enrichedContext.privacyUrl || 'https://farmanullahansari.com/privacy';
  enrichedContext.termsUrl = enrichedContext.termsUrl || 'https://farmanullahansari.com/terms';

  // Determine transactional nature
  const transactionalTemplates = ['otp', 'resetPassword', 'verifyEmail', 'loginAlert', 'passwordChanged'];
  if (enrichedContext.isTransactional === undefined) {
    enrichedContext.isTransactional = transactionalTemplates.includes(cleanName);
  }

  // If OTP is provided as string, split into individual digit boxes for styling
  if (enrichedContext.otp && !enrichedContext.otpDigits) {
    enrichedContext.otpDigits = String(enrichedContext.otp).trim().split('');
  }

  // Ensure current year is accessible
  if (!enrichedContext.currentYear) {
    enrichedContext.currentYear = new Date().getFullYear();
  }

  // Render view body
  const bodyHtml = compiledView(enrichedContext);

  // Wrap in main layout
  let finalHtml = bodyHtml;
  if (options.useLayout !== false && layoutCompiled) {
    finalHtml = layoutCompiled({
      ...enrichedContext,
      body: bodyHtml,
    });
  }

  // Derive dynamic subject line
  let subject = enrichedContext.subject;
  if (!subject) {
    switch (cleanName) {
      case 'signup':
        subject = `Welcome to the Family, ${enrichedContext.name || 'Valued Member'}!`;
        break;
      case 'verifyEmail':
        subject = 'Verify Your Email Address - Farmanullah Ansari Company';
        break;
      case 'loginAlert':
        subject = `Security Alert: New sign-in detected for ${enrichedContext.name || 'your account'}`;
        break;
      case 'otp':
        subject = `Farmanullah Ansari Company: ${enrichedContext.otp || 'Authorization'} is your security code`;
        break;
      case 'resetPassword':
        subject = 'Reset Your Password - Farmanullah Ansari Company';
        break;
      case 'passwordChanged':
        subject = 'Security Notice: Your Password Has Been Updated';
        break;
      case 'invoice':
        subject = `Invoice ${enrichedContext.invoiceNumber || ''} from Farmanullah Ansari Company - ${enrichedContext.isPaid ? 'PAID' : 'DUE'}`;
        break;
      default:
        subject = 'Farmanullah Ansari Company Official Communication';
    }
  }

  const plainText = enrichedContext.text || htmlToPlainText(finalHtml);

  return {
    subject,
    html: finalHtml,
    text: plainText,
  };
}

/**
 * Clears the compilation cache (useful for development hot reloading).
 */
export function clearTemplateCache() {
  templateCache.clear();
  layoutCompiled = null;
  initialized = false;
}

export default {
  initHandlebarsEngine,
  renderHandlebarsTemplate,
  htmlToPlainText,
  clearTemplateCache,
};
