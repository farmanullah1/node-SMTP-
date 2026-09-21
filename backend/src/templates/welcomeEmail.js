import { renderBrandNavBar, renderBrandFooter } from './brandLayout.js';

/**
 * Renders the exact "Welcome to the Family, [User's Name]!" email matching the user's reference mockup:
 * - Hero banner with deep petrol navy background (#1b3c53) and warm amber circular corner (#f59e0b)
 * - "WELCOME ABOARD!" bold headline alongside collaborative office team illustration
 * - "Welcome to the Family, [User's Name]!" title with warm amber highlight
 * - "GETTING STARTED" section with numbered/icon circular badges:
 *   1. Setup Your Profile
 *   2. Explore Our Services
 *   3. Join Our Community
 *   4. Need Help?
 * - Pill-shaped "EXPLORE YOUR DASHBOARD" button in amber (#e9962a)
 * - Corporate two-column footer with social links and official business disclaimer
 * 
 * @param {object} data
 * @param {string} data.name - Recipient full name
 * @returns {{ subject: string, html: string, text: string }}
 */
export function renderWelcomeEmail({ name = 'Explorer' }) {
  const safeName = String(name).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const subject = `Welcome to the Family, ${safeName}!`;

  const text = `
Farmanullah Ansari Company

Welcome to the Family, ${safeName}!

We're excited about you joining us! We are committed to innovation, quality service, and continuous progress.

GETTING STARTED:
1. Setup Your Profile: Link into your profile and configure your preferences.
2. Explore Our Services: Overview of core solutions and platform capabilities.
3. Join Our Community: Connect with colleagues, teams, and internal resources.
4. Need Help?: Access our dedicated support portal and FAQs.

Explore your dashboard:
http://localhost:3000/api/system/health

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
      .hero-title { font-size: 24px !important; }
      .stack-column { display: block !important; width: 100% !important; max-width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #174251;">
  <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; mso-hide: all;">
    Welcome to the Family, ${safeName}! We are excited about you joining Farmanullah Ansari Company.
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(180deg, #174251 0%, #102e38 100%); min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 12px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);">
          
          ${renderBrandNavBar()}

          <!-- Hero Banner Matching Reference Mockup -->
          <tr>
            <td style="padding: 16px 24px 0 24px; background-color: #ffffff;" class="p-mobile">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #1a384c 0%, #234c66 100%); border-radius: 16px; overflow: hidden;">
                <tr>
                  <!-- Left Text Column -->
                  <td width="55%" valign="middle" style="padding: 36px 20px 36px 28px;" class="p-mobile">
                    <h1 class="hero-title" style="margin: 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; font-size: 30px; font-weight: 900; color: #ffffff; line-height: 1.15; letter-spacing: -0.02em; text-transform: uppercase;">
                      Welcome<br>
                      <span style="color: #f5a623;">Aboard!</span>
                    </h1>
                  </td>
                  <!-- Right Team Photo Column with Amber Corner -->
                  <td width="45%" valign="bottom" align="right" style="position: relative;">
                    <!-- SVG Collaborative Team Illustration / Graphic -->
                    <svg width="220" height="170" viewBox="0 0 220 170" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; max-width: 100%; height: auto;">
                      <!-- Amber Glow Corner Accent -->
                      <circle cx="210" cy="160" r="85" fill="#f5a623" />
                      <!-- Laptop desk background -->
                      <rect x="25" y="125" width="165" height="40" rx="4" fill="#0d2432" opacity="0.8" />
                      <!-- Person 1 (Team Leader) -->
                      <circle cx="65" cy="65" r="18" fill="#fcd34d" />
                      <path d="M40 120 C40 95, 90 95, 90 120 Z" fill="#38bdf8" />
                      <!-- Person 2 (Center Collaboration) -->
                      <circle cx="115" cy="55" r="17" fill="#fca5a5" />
                      <path d="M92 115 C92 88, 138 88, 138 115 Z" fill="#f5a623" />
                      <!-- Person 3 (Right Specialist) -->
                      <circle cx="165" cy="68" r="17" fill="#cbd5e1" />
                      <path d="M142 120 C142 98, 188 98, 188 120 Z" fill="#2563eb" />
                      <!-- Laptop on table -->
                      <rect x="85" y="105" width="50" height="24" rx="2" fill="#e2e8f0" />
                      <polygon points="75,130 145,130 135,125 85,125" fill="#94a3b8" />
                    </svg>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Welcome Headline & Intro Paragraph -->
          <tr>
            <td style="padding: 32px 32px 16px 32px; background-color: #ffffff; text-align: center;" class="p-mobile">
              <h2 style="margin: 0 0 12px 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; font-size: 22px; font-weight: 800; color: #102a43;">
                Welcome to the Family, <span style="color: #d97706;">[${safeName}]</span>!
              </h2>
              <p style="margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #486581; line-height: 1.6; max-width: 480px; display: inline-block;">
                We're excited about you joining us! We are committed to excellence, mutual growth, and continuous innovation in everything we build.
              </p>
            </td>
          </tr>

          <!-- GETTING STARTED Section Title -->
          <tr>
            <td style="padding: 16px 36px 12px 36px; background-color: #ffffff;" class="p-mobile">
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; font-weight: 800; color: #102a43; text-transform: uppercase; letter-spacing: 0.08em;">
                Getting Started
              </div>
            </td>
          </tr>

          <!-- 4 Steps List with Circular Icons matching Mockup -->
          <tr>
            <td style="padding: 0 36px 28px 36px; background-color: #ffffff;" class="p-mobile">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                
                <!-- Step 1: Setup Your Profile -->
                <tr>
                  <td width="42" valign="top" style="padding-bottom: 18px;">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background-color: #fef3c7; border: 1px solid #fde68a; text-align: center; line-height: 32px; font-size: 14px;">
                      👤
                    </div>
                  </td>
                  <td valign="top" style="padding-left: 8px; padding-bottom: 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <div style="font-size: 14px; font-weight: 700; color: #102a43;">
                      Setup Your Profile
                    </div>
                    <div style="font-size: 12px; color: #627d98; line-height: 1.4; margin-top: 2px;">
                      Configure your account information and <a href="#" style="color: #2563eb; text-decoration: underline;">profile preferences here</a>.
                    </div>
                  </td>
                </tr>

                <!-- Step 2: Explore Our Services -->
                <tr>
                  <td width="42" valign="top" style="padding-bottom: 18px;">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background-color: #fef3c7; border: 1px solid #fde68a; text-align: center; line-height: 32px; font-size: 14px;">
                      🧭
                    </div>
                  </td>
                  <td valign="top" style="padding-left: 8px; padding-bottom: 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <div style="font-size: 14px; font-weight: 700; color: #102a43;">
                      Explore Our Services
                    </div>
                    <div style="font-size: 12px; color: #627d98; line-height: 1.4; margin-top: 2px;">
                      Learn more about platform offerings, services, and core business tools.
                    </div>
                  </td>
                </tr>

                <!-- Step 3: Join Our Community -->
                <tr>
                  <td width="42" valign="top" style="padding-bottom: 18px;">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background-color: #fef3c7; border: 1px solid #fde68a; text-align: center; line-height: 32px; font-size: 14px;">
                      👥
                    </div>
                  </td>
                  <td valign="top" style="padding-left: 8px; padding-bottom: 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <div style="font-size: 14px; font-weight: 700; color: #102a43;">
                      Join Our Community
                    </div>
                    <div style="font-size: 12px; color: #627d98; line-height: 1.4; margin-top: 2px;">
                      Connect with colleagues, teams, and internal communications channels.
                    </div>
                  </td>
                </tr>

                <!-- Step 4: Need Help? -->
                <tr>
                  <td width="42" valign="top" style="padding-bottom: 8px;">
                    <div style="width: 32px; height: 32px; border-radius: 50%; background-color: #fef3c7; border: 1px solid #fde68a; text-align: center; line-height: 32px; font-size: 14px;">
                      ❓
                    </div>
                  </td>
                  <td valign="top" style="padding-left: 8px; padding-bottom: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    <div style="font-size: 14px; font-weight: 700; color: #102a43;">
                      Need Help?
                    </div>
                    <div style="font-size: 12px; color: #627d98; line-height: 1.4; margin-top: 2px;">
                      Our team is here for you. Visit our support center or read our FAQs.
                    </div>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Pill CTA Button: EXPLORE YOUR DASHBOARD -->
          <tr>
            <td align="center" style="padding: 0 36px 36px 36px; background-color: #ffffff;" class="p-mobile">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="background-color: #f5a623; border-radius: 9999px; box-shadow: 0 4px 14px rgba(245, 166, 35, 0.4);">
                          <a href="http://localhost:3000/api/system/health" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 14px 44px; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; font-size: 14px; font-weight: 800; color: #ffffff; text-decoration: none; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.08em;">
                            Explore Your Dashboard
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

  return { subject, html, text };
}
