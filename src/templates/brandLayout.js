/**
 * FARMANULLAH ANSARI COMPANY — CORPORATE EMAIL DESIGN SYSTEM
 * 
 * Recreated precisely from the approved visual brand specification:
 * - Top Brand Bar: Logo mark with "FARMANULLAH ANSARI COMPANY" and profile/gear utilities
 * - Hero Card: Deep navy rounded banner (#193247 / #1f425e) with warm amber accent (#f2994a)
 *   and "WELCOME ABOARD!" bold headline alongside collaborative office team illustration/photo
 * - Light Clean Card Body (#ffffff) on soft teal-gray canvas (#eef5f8 / #dbe8ec)
 * - Numbered/Icon-based "GETTING STARTED" steps with circular badges:
 *   1. Setup Your Profile
 *   2. Explore Our Services
 *   3. Join Our Community
 *   4. Need Help?
 * - Prominent Pill CTA Button in warm golden/amber (#f5a623 / #f39c12)
 * - Dual column Footer: QUICK LINKS & RESOURCES
 * - Social icons: Facebook, X, Instagram, TikTok
 * - Formal corporate footer with company logo, address, contact, unsubscribe, and copyright
 */

/**
 * Renders the top brand navigation bar
 */
export function renderBrandNavBar() {
  return `
    <!-- Top Navigation Bar -->
    <tr>
      <td style="padding: 24px 32px 18px 32px; background-color: #ffffff; border-bottom: 1px solid #edf2f7;" class="p-mobile">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td align="left" valign="middle">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle" style="padding-right: 12px;">
                    <!-- Brand Icon Glyphs -->
                    <div style="width: 38px; height: 38px; background: linear-gradient(135deg, #0d3b66 0%, #1e5f74 100%); border-radius: 8px; text-align: center; line-height: 38px;">
                      <span style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 18px; font-weight: 900; color: #f4d06f; letter-spacing: -1px;">FA</span>
                    </div>
                  </td>
                  <td valign="middle">
                    <div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; font-size: 15px; font-weight: 800; color: #102a43; letter-spacing: 0.06em; line-height: 1.1; text-transform: uppercase;">
                      Farmanullah
                    </div>
                    <div style="font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; font-size: 10px; font-weight: 700; color: #486581; letter-spacing: 0.14em; text-transform: uppercase;">
                      Ansari Company
                    </div>
                  </td>
                </tr>
              </table>
            </td>
            <td align="right" valign="middle">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-left: 12px; color: #829ab1; font-size: 18px;">👤</td>
                  <td style="padding-left: 10px; color: #829ab1; font-size: 18px;">⚙️</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

/**
 * Renders the corporate footer according to the user's design reference:
 * Quick Links, Resources, Social Icons, Company Address, Unsubscribe & Copyright.
 */
export function renderBrandFooter() {
  const currentYear = new Date().getFullYear();
  return `
    <!-- Links & Social Section -->
    <tr>
      <td style="padding: 28px 36px 20px 36px; background-color: #ffffff; border-top: 1px solid #edf2f7;" class="p-mobile">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <!-- Quick Links -->
            <td width="50%" valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <div style="font-size: 12px; font-weight: 700; color: #102a43; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
                Quick Links
              </div>
              <div style="font-size: 13px; line-height: 1.8;">
                <a href="#" style="color: #486581; text-decoration: underline;">Company Portal</a><br>
                <a href="#" style="color: #486581; text-decoration: underline;">Support Center</a>
              </div>
            </td>
            <!-- Resources -->
            <td width="50%" valign="top" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
              <div style="font-size: 12px; font-weight: 700; color: #102a43; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
                Resources
              </div>
              <div style="font-size: 13px; line-height: 1.8;">
                <a href="#" style="color: #486581; text-decoration: underline;">Latest News</a><br>
                <a href="#" style="color: #486581; text-decoration: underline;">Our Story</a>
              </div>
            </td>
          </tr>
          <!-- Social Icons Row -->
          <tr>
            <td colspan="2" align="center" style="padding-top: 24px;">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 0 8px;">
                    <a href="#" style="display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; background-color: #102a43; color: #ffffff; border-radius: 50%; text-decoration: none; font-size: 13px; font-weight: bold;">f</a>
                  </td>
                  <td style="padding: 0 8px;">
                    <a href="#" style="display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; background-color: #102a43; color: #ffffff; border-radius: 50%; text-decoration: none; font-size: 12px; font-weight: bold;">𝕏</a>
                  </td>
                  <td style="padding: 0 8px;">
                    <a href="#" style="display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; background-color: #102a43; color: #ffffff; border-radius: 50%; text-decoration: none; font-size: 13px;">📷</a>
                  </td>
                  <td style="padding: 0 8px;">
                    <a href="#" style="display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; background-color: #102a43; color: #ffffff; border-radius: 50%; text-decoration: none; font-size: 12px;">🎵</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Bottom Formal Company Disclaimer Card -->
    <tr>
      <td style="padding: 28px 36px; background-color: #f0f4f8; text-align: center; border-top: 1px solid #d9e2ec;" class="p-mobile">
        <!-- Monogram Logo -->
        <div style="display: inline-block; margin-bottom: 10px;">
          <span style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 20px; font-weight: 900; color: #102a43; letter-spacing: -1px;">FA</span>
        </div>
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 800; color: #102a43; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
          Farmanullah Ansari Company
        </div>
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #627d98; line-height: 1.6;">
          123 Business Avenue, Suite 400, Karachi, Pakistan<br>
          Contact: +92-300-0000000 &bull; <a href="mailto:contact@farmanullahansari.com" style="color: #627d98; text-decoration: underline;">contact@farmanullahansari.com</a>
        </div>
        <div style="margin-top: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px;">
          <a href="#" style="color: #627d98; text-decoration: underline;">Unsubscribe</a> &bull; <a href="#" style="color: #627d98; text-decoration: underline;">Privacy Policy</a>
        </div>
        <div style="margin-top: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; color: #829ab1;">
          &copy; ${currentYear} Farmanullah Ansari Company. All rights reserved.
        </div>
      </td>
    </tr>
  `;
}
