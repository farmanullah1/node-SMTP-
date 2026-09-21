import { renderBrandNavBar, renderBrandFooter } from './brandLayout.js';

/**
 * Renders Farmanullah Ansari Company Corporate Invoice / Billing Email
 * 
 * Styled in the official brand design system:
 * - Brand Nav Bar with logo and monogram
 * - Navy / Amber invoice hero banner
 * - Customer & Invoice metadata card (Invoice #, Date, Status)
 * - Itemized billing table (Item, Qty, Unit Price, Amount)
 * - Financial summary block (Subtotal, Tax, Total)
 * - Action button for receipt download or invoice portal
 * - Full multipart/alternative plain-text fallback
 * 
 * @param {object} data
 * @param {string} data.invoiceNumber - e.g. "INV-2026-0842"
 * @param {string} data.customerName - e.g. "Farmanullah Ansari"
 * @param {string} [data.customerEmail]
 * @param {string} [data.issueDate]
 * @param {string} [data.dueDate]
 * @param {string} [data.status='PAID'] - 'PAID', 'PENDING', or 'OVERDUE'
 * @param {string} [data.currency='USD'] - e.g. '$', 'USD', 'PKR'
 * @param {Array<{ description: string, quantity: number, unitPrice: number, amount?: number }>} [data.items]
 * @param {number} [data.taxRate=0] - e.g. 0.05 for 5%
 * @param {string} [data.actionUrl]
 * @param {string} [data.notes]
 * @returns {{ subject: string, html: string, text: string }}
 */
export function renderInvoiceEmail({
  invoiceNumber = `INV-${Date.now().toString().slice(-6)}`,
  customerName = 'Valued Client',
  customerEmail = '',
  issueDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  dueDate = 'On Receipt',
  status = 'PAID',
  currency = '$',
  items = [
    { description: 'Cloud Infrastructure & SMTP Relay', quantity: 1, unitPrice: 49.99 },
  ],
  taxRate = 0,
  actionUrl = 'http://localhost:3000/api/system/health',
  notes = 'Thank you for your business. For billing inquiries, contact billing@farmanullahansari.com.',
}) {
  const safeName = String(customerName).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const safeInvoiceNo = String(invoiceNumber).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const safeStatus = String(status).toUpperCase();

  // Calculate totals
  const processedItems = items.map((item) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unitPrice) || 0;
    const amount = item.amount !== undefined ? Number(item.amount) : qty * price;
    return {
      description: String(item.description || 'Service'),
      quantity: qty,
      unitPrice: price,
      amount,
    };
  });

  const subtotal = processedItems.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = subtotal * (Number(taxRate) || 0);
  const total = subtotal + taxAmount;

  const subject = `Invoice ${safeInvoiceNo} from Farmanullah Ansari Company - ${safeStatus}`;

  // Status badge styling
  const statusColors = {
    PAID: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0', label: 'PAID IN FULL' },
    PENDING: { bg: '#fffbeb', text: '#92400e', border: '#fde68a', label: 'PAYMENT PENDING' },
    OVERDUE: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca', label: 'PAYMENT OVERDUE' },
  };
  const badgeStyle = statusColors[safeStatus] || statusColors.PENDING;

  // Plain-text alternative
  const itemsText = processedItems
    .map((item) => ` - ${item.description} (x${item.quantity}) : ${currency}${item.amount.toFixed(2)}`)
    .join('\n');

  const text = `
Farmanullah Ansari Company
INVOICE: ${safeInvoiceNo}
Status: ${badgeStyle.label}
Date: ${issueDate}
Due: ${dueDate}

Billed To:
${customerName} ${customerEmail ? `(${customerEmail})` : ''}

Line Items:
${itemsText}

----------------------------------------
Subtotal: ${currency}${subtotal.toFixed(2)}
${taxAmount > 0 ? `Tax: ${currency}${taxAmount.toFixed(2)}\n` : ''}Total: ${currency}${total.toFixed(2)}
----------------------------------------

Notes:
${notes}

View or download receipt:
${actionUrl}

Farmanullah Ansari Company
123 Business Avenue, Suite 400, Karachi, Pakistan
© ${new Date().getFullYear()} Farmanullah Ansari Company. All rights reserved.
  `.trim();

  // Item rows HTML
  const itemsHtml = processedItems
    .map(
      (item, idx) => `
      <tr style="border-bottom: 1px solid #f0f4f8; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
        <td style="padding: 12px 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #102a43;">
          ${item.description}
        </td>
        <td align="center" style="padding: 12px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #486581;">
          ${item.quantity}
        </td>
        <td align="right" style="padding: 12px 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #486581;">
          ${currency}${item.unitPrice.toFixed(2)}
        </td>
        <td align="right" style="padding: 12px 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 700; color: #102a43;">
          ${currency}${item.amount.toFixed(2)}
        </td>
      </tr>
    `
    )
    .join('');

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
    Invoice ${safeInvoiceNo} from Farmanullah Ansari Company. Total: ${currency}${total.toFixed(2)}. Status: ${badgeStyle.label}.
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(180deg, #174251 0%, #102e38 100%); min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 12px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35);">
          
          ${renderBrandNavBar()}

          <!-- Invoice Banner -->
          <tr>
            <td style="padding: 16px 24px 0 24px; background-color: #ffffff;" class="p-mobile">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #1a384c 0%, #234c66 100%); border-radius: 16px; overflow: hidden;">
                <tr>
                  <td width="65%" valign="middle" style="padding: 28px 20px 28px 28px;" class="p-mobile">
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 800; color: #f5a623; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 6px;">
                      Official Transaction Invoice
                    </div>
                    <h1 style="margin: 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; font-size: 24px; font-weight: 900; color: #ffffff; line-height: 1.2;">
                      ${safeInvoiceNo}
                    </h1>
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #cbd5e1; margin-top: 6px;">
                      Issue Date: ${issueDate}
                    </div>
                  </td>
                  <td width="35%" valign="middle" align="center" style="padding: 20px 20px 20px 0;">
                    <div style="display: inline-block; background-color: ${badgeStyle.bg}; border: 1px solid ${badgeStyle.border}; color: ${badgeStyle.text}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; padding: 8px 14px; border-radius: 20px; text-transform: uppercase;">
                      ${badgeStyle.label}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Client Details & Metadata -->
          <tr>
            <td style="padding: 24px 28px 12px 28px; background-color: #ffffff;" class="p-mobile">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px;">
                <tr>
                  <td width="50%" valign="top" style="padding: 4px 12px;">
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
                      Billed To
                    </div>
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 800; color: #102a43;">
                      ${safeName}
                    </div>
                    ${customerEmail ? `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #486581;">${customerEmail}</div>` : ''}
                  </td>
                  <td width="50%" valign="top" style="padding: 4px 12px; border-left: 1px solid #e2e8f0;">
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
                      Payment Terms
                    </div>
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 700; color: #102a43;">
                      ${dueDate}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Itemized Table -->
          <tr>
            <td style="padding: 12px 28px; background-color: #ffffff;" class="p-mobile">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #1a384c; color: #ffffff;">
                    <th align="left" style="padding: 10px 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                      Description
                    </th>
                    <th align="center" width="50" style="padding: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                      Qty
                    </th>
                    <th align="right" width="80" style="padding: 10px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                      Price
                    </th>
                    <th align="right" width="90" style="padding: 10px 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Summary / Totals -->
          <tr>
            <td style="padding: 12px 28px 24px 28px; background-color: #ffffff;" class="p-mobile">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="55%" valign="top" style="padding-right: 20px;">
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #64748b; line-height: 1.6;">
                      ${notes}
                    </div>
                  </td>
                  <td width="45%" valign="top">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="left" style="padding: 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #64748b;">
                          Subtotal
                        </td>
                        <td align="right" style="padding: 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; color: #102a43;">
                          ${currency}${subtotal.toFixed(2)}
                        </td>
                      </tr>
                      ${taxAmount > 0 ? `
                      <tr>
                        <td align="left" style="padding: 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #64748b;">
                          Tax (${(taxRate * 100).toFixed(0)}%)
                        </td>
                        <td align="right" style="padding: 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; font-weight: 600; color: #102a43;">
                          ${currency}${taxAmount.toFixed(2)}
                        </td>
                      </tr>` : ''}
                      <tr>
                        <td colspan="2" style="border-top: 2px solid #e2e8f0; padding-top: 8px; margin-top: 4px;"></td>
                      </tr>
                      <tr>
                        <td align="left" style="padding: 4px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 800; color: #102a43;">
                          Total Amount
                        </td>
                        <td align="right" style="padding: 4px 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif; font-size: 18px; font-weight: 900; color: #f5a623;">
                          ${currency}${total.toFixed(2)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Action Button -->
          <tr>
            <td align="center" style="padding: 0 28px 32px 28px; background-color: #ffffff;" class="p-mobile">
              <table border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="border-radius: 30px; background: linear-gradient(135deg, #f5a623 0%, #e08e0b 100%); box-shadow: 0 4px 14px rgba(245, 166, 35, 0.4);">
                    <a href="${actionUrl}" target="_blank" style="display: inline-block; padding: 14px 36px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 800; color: #102a43; text-decoration: none; text-transform: uppercase; letter-spacing: 0.08em;">
                      View &amp; Download Receipt &rarr;
                    </a>
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

  return {
    subject,
    html,
    text,
    subtotal,
    taxAmount,
    total,
  };
}
