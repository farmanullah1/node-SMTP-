import { renderBrandNavBar, renderBrandFooter } from './brandLayout.js';

/**
 * Renders Farmanullah Ansari Company Direct Email Template
 */
export function renderPracticeEmailHtml({
  to = 'Colleague',
  title = 'Executive Briefing',
  badge = 'Official Communication',
  message = 'We are pleased to provide you with the latest corporate briefing from Farmanullah Ansari Company. Our operations continue to expand, delivering state-of-the-art services with uncompromising reliability.',
  actionUrl = 'http://localhost:3000/api/system/health',
  actionText = 'Explore Your Dashboard',
}) {
  const safeTo = String(to).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const safeTitle = String(title).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${safeTitle}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #174251; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; border-radius: 0 !important; }
      .p-mobile { padding: 20px 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #174251;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(180deg, #174251 0%, #102e38 100%); min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 12px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);">
          
          ${renderBrandNavBar()}

          <!-- Hero Banner -->
          <tr>
            <td style="padding: 16px 24px 0 24px; background-color: #ffffff;" class="p-mobile">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #1a384c 0%, #234c66 100%); border-radius: 16px; overflow: hidden;">
                <tr>
                  <td width="60%" valign="middle" style="padding: 32px 20px 32px 28px;" class="p-mobile">
                    <h1 style="margin: 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; font-size: 26px; font-weight: 900; color: #ffffff; line-height: 1.2; text-transform: uppercase;">
                      Farmanullah<br>
                      <span style="color: #f5a623;">Ansari Co.</span>
                    </h1>
                  </td>
                  <td width="40%" valign="bottom" align="right">
                    <svg width="180" height="130" viewBox="0 0 180 130" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; max-width: 100%; height: auto;">
                      <circle cx="170" cy="120" r="70" fill="#f5a623" />
                      <circle cx="85" cy="55" r="16" fill="#38bdf8" />
                      <path d="M55 110 C55 85, 115 85, 115 110 Z" fill="#ffffff" />
                    </svg>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 28px 32px 16px 32px; background-color: #ffffff;" class="p-mobile">
              <h2 style="margin: 0 0 12px 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; font-size: 20px; font-weight: 800; color: #102a43;">
                ${safeTitle}
              </h2>
              <p style="margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #486581; line-height: 1.6;">
                ${message}
              </p>

              <!-- Telemetry Metadata Card -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #d9e2ec; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <tr>
                  <td style="padding-bottom: 8px; border-bottom: 1px solid #e2e8f0;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="left" style="font-size: 11px; font-weight: 700; color: #627d98; text-transform: uppercase;">Recipient</td>
                        <td align="right" style="font-size: 12px; font-weight: 600; color: #102a43; font-family: monospace;">${safeTo}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 8px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="left" style="font-size: 11px; font-weight: 700; color: #627d98; text-transform: uppercase;">Channel</td>
                        <td align="right" style="font-size: 12px; font-weight: 700; color: #059669;">✔ Official Gmail SMTP</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Pill CTA Button -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 8px 0 24px 0;">
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="background-color: #f5a623; border-radius: 9999px; box-shadow: 0 4px 14px rgba(245, 166, 35, 0.4);">
                          <a href="${actionUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 44px; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; font-size: 14px; font-weight: 800; color: #ffffff; text-decoration: none; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.08em;">
                            ${actionText}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          ${renderBrandFooter()}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
