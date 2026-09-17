import { renderBrandNavBar, renderBrandFooter } from './brandLayout.js';

/**
 * Renders Farmanullah Ansari Company Email Verification
 * Styled precisely in the light clean brand aesthetic matching the user screenshot.
 */
export function renderVerificationEmail({ name = 'Colleague', verificationUrl, token }) {
  const safeName = String(name).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const subject = `Welcome to Farmanullah Ansari Company: Confirm your email address`;

  const text = `
Farmanullah Ansari Company

Welcome, ${safeName}!

Thank you for registering. Please confirm your email address to complete your account setup and access your workspace.

Confirm your email:
${verificationUrl}

Or enter your verification code manually:
${token}

This link is valid for 24 hours.

Farmanullah Ansari Company
123 Business Avenue, Suite 400, Karachi, Pakistan
© ${new Date().getFullYear()} Farmanullah Ansari Company. All rights reserved.
  `.trim();

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
    Please verify your email address with Farmanullah Ansari Company.
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
                      Verify Your<br>
                      <span style="color: #f5a623;">Account</span>
                    </h1>
                  </td>
                  <td width="40%" valign="bottom" align="right">
                    <svg width="180" height="130" viewBox="0 0 180 130" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; max-width: 100%; height: auto;">
                      <circle cx="170" cy="120" r="70" fill="#f5a623" />
                      <circle cx="90" cy="50" r="20" fill="#38bdf8" />
                      <path d="M60 110 C60 85, 120 85, 120 110 Z" fill="#ffffff" />
                      <!-- Shield checkmark -->
                      <polygon points="90,40 105,47 105,65 90,75 75,65 75,47" fill="#102a43" />
                      <polyline points="82,57 88,63 98,50" stroke="#f5a623" stroke-width="2.5" fill="none" stroke-linecap="round" />
                    </svg>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Welcome Headline & Body -->
          <tr>
            <td style="padding: 28px 32px 16px 32px; background-color: #ffffff;" class="p-mobile">
              <h2 style="margin: 0 0 12px 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; font-size: 20px; font-weight: 800; color: #102a43;">
                Welcome to the Family, <span style="color: #d97706;">[${safeName}]</span>!
              </h2>
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #486581; line-height: 1.6;">
                Thank you for joining Farmanullah Ansari Company! To complete your registration and secure your profile, please confirm your email address.
              </p>

              <!-- Pill CTA Button -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0 24px 0;">
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="background-color: #f5a623; border-radius: 9999px; box-shadow: 0 4px 14px rgba(245, 166, 35, 0.4);">
                          <a href="${verificationUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 44px; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; font-size: 14px; font-weight: 800; color: #ffffff; text-decoration: none; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.08em;">
                            Confirm Email Address
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Reference Token Box -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; margin-bottom: 16px;">
                <tr>
                  <td style="padding: 14px 18px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 700; color: #627d98; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
                      Verification Token
                    </div>
                    <div style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 12px; color: #102a43; word-break: break-all;">
                      ${token}
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #829ab1; line-height: 1.5; text-align: center;">
                This link expires in 24 hours. If you did not request this, you can safely ignore this email.
              </p>
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

/**
 * Renders Farmanullah Ansari Company Password Reset Email
 */
export function renderPasswordResetEmail({ name = 'Colleague', resetUrl, token }) {
  const safeName = String(name).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const subject = `Farmanullah Ansari Company: Password reset request`;

  const text = `
Farmanullah Ansari Company

Password Reset Request for ${safeName}

We received a request to reset your password. Click the link below to set a new password:
${resetUrl}

Or enter your reset token:
${token}

This link is valid for 1 hour.

Farmanullah Ansari Company
123 Business Avenue, Suite 400, Karachi, Pakistan
© ${new Date().getFullYear()} Farmanullah Ansari Company. All rights reserved.
  `.trim();

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
    Reset your Farmanullah Ansari Company password credentials.
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
                      Password<br>
                      <span style="color: #f5a623;">Reset</span>
                    </h1>
                  </td>
                  <td width="40%" valign="bottom" align="right">
                    <svg width="180" height="130" viewBox="0 0 180 130" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; max-width: 100%; height: auto;">
                      <circle cx="170" cy="120" r="70" fill="#f5a623" />
                      <!-- Key symbol -->
                      <circle cx="95" cy="55" r="16" stroke="#ffffff" stroke-width="4" fill="none" />
                      <rect x="91" y="68" width="8" height="38" rx="2" fill="#ffffff" />
                      <rect x="99" y="85" width="12" height="6" rx="1" fill="#ffffff" />
                      <rect x="99" y="96" width="8" height="6" rx="1" fill="#ffffff" />
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
                Hello, <span style="color: #d97706;">[${safeName}]</span>
              </h2>
              <p style="margin: 0 0 20px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #486581; line-height: 1.6;">
                We received a request to reset your password. Click the button below to choose a new password:
              </p>

              <!-- Pill CTA Button -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0 24px 0;">
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="background-color: #f5a623; border-radius: 9999px; box-shadow: 0 4px 14px rgba(245, 166, 35, 0.4);">
                          <a href="${resetUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 44px; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; font-size: 14px; font-weight: 800; color: #ffffff; text-decoration: none; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.08em;">
                            Reset My Password
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Reference Token Box -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; margin-bottom: 16px;">
                <tr>
                  <td style="padding: 14px 18px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 700; color: #627d98; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
                      Reset Token
                    </div>
                    <div style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 12px; color: #102a43; word-break: break-all;">
                      ${token}
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #829ab1; line-height: 1.5; text-align: center;">
                This link will expire in 60 minutes. If you did not request this, no action is needed.
              </p>
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
