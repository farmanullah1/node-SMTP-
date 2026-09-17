import { renderBrandNavBar, renderBrandFooter } from './brandLayout.js';

/**
 * Renders Farmanullah Ansari Company OTP / Security Passcode
 * Styled to match the exact light clean theme with dark navy & amber highlights.
 */
export function renderOtpEmail({ otp, name = 'Colleague', expiresInMinutes = 10, purpose = 'Verification' }) {
  const safeName = String(name).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const formattedOtp = String(otp).trim();
  const digits = formattedOtp.split('');
  const subject = `Farmanullah Ansari Company: ${formattedOtp} is your authorization code`;

  const text = `
Farmanullah Ansari Company

Security Authorization Code

Dear ${safeName},

Your one-time passcode for ${purpose} is:
${formattedOtp}

This verification code is valid for ${expiresInMinutes} minutes.

Do not share this code with anyone.

Farmanullah Ansari Company
123 Business Avenue, Suite 400, Karachi, Pakistan
© ${new Date().getFullYear()} Farmanullah Ansari Company. All rights reserved.
  `.trim();

  const digitBoxesHtml = digits
    .map(
      (d) =>
        `<td align="center" style="width: 44px; height: 56px; background-color: #ffffff; border: 2px solid #1a384c; border-radius: 8px; font-family: 'Segoe UI', Consolas, monospace; font-size: 28px; font-weight: 900; color: #102a43;">${d}</td>`
    )
    .join('<td width="8">&nbsp;</td>');

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject}</title>
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
  <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    Your Farmanullah Ansari Company authorization code is ${formattedOtp}.
  </div>

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
                      Security<br>
                      <span style="color: #f5a623;">Passcode</span>
                    </h1>
                  </td>
                  <td width="40%" valign="bottom" align="right">
                    <svg width="180" height="130" viewBox="0 0 180 130" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; max-width: 100%; height: auto;">
                      <circle cx="170" cy="120" r="70" fill="#f5a623" />
                      <!-- Padlock symbol -->
                      <rect x="75" y="65" width="38" height="32" rx="4" fill="#ffffff" />
                      <path d="M82 65 L82 52 C82 45, 106 45, 106 52 L106 65" stroke="#ffffff" stroke-width="4" fill="none" />
                      <circle cx="94" cy="79" r="3" fill="#102a43" />
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
                Authorization Code for <span style="color: #d97706;">[${safeName}]</span>
              </h2>
              <p style="margin: 0 0 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #486581; line-height: 1.6;">
                Use the one-time passcode below to verify your <strong>${purpose}</strong> request:
              </p>

              <!-- Digits Grid Table -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #d9e2ec; border-radius: 12px; padding: 24px 16px; margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        ${digitBoxesHtml}
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-top: 14px;">
                    <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #627d98; font-size: 12px; font-weight: 600;">
                      ⏱️ Valid for <strong style="color: #d97706;">${expiresInMinutes} minutes</strong>
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Notice -->
              <div style="background-color: #fef3c7; border-left: 3px solid #f5a623; border-radius: 4px; padding: 12px 16px; margin-bottom: 8px;">
                <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #92400e; line-height: 1.5;">
                  <strong>Security Reminder:</strong> Farmanullah Ansari Company will never ask you for this code. Never disclose it to anyone.
                </p>
              </div>

            </td>
          </tr>

          ${renderBrandFooter()}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}
