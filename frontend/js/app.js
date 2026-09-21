/**
 * Farmanullah Ansari Company - Transactional Email Studio
 * Client application for live Handlebars template previewing, inspection, and dispatch.
 */

// State Management
const state = {
  activeTemplate: 'signup',
  activeView: 'rendered', // 'rendered' | 'plaintext' | 'source'
  activeDevice: 'desktop', // 'desktop' | 'mobile' | 'full'
  lastRenderedData: null,
  isFetchingPreview: false,
  previewDebounceTimer: null,
};

// Preset sample data for all 7 Handlebars templates
const TEMPLATE_PRESETS = {
  signup: {
    title: '🚀 Welcome / Onboarding',
    fields: [
      { id: 'name', label: 'Member Name', type: 'text', default: 'Farmanullah Ansari' },
      { id: 'verificationUrl', label: 'Email Verification URL', type: 'url', default: 'http://localhost:3000/api/auth/verify-email?token=welcome_tok_123' },
      { id: 'actionUrl', label: 'Get Started Action URL', type: 'url', default: 'http://localhost:3000/dashboard' },
      { id: 'ctaText', label: 'CTA Button Text', type: 'text', default: 'Get Started Now →' },
    ],
  },
  verifyEmail: {
    title: '✉️ Verify Email Address',
    fields: [
      { id: 'name', label: 'User Name', type: 'text', default: 'Farmanullah Ansari' },
      { id: 'verificationUrl', label: 'Verification URL', type: 'url', default: 'http://localhost:3000/api/auth/verify-email?token=verif_8892' },
      { id: 'token', label: 'Manual Security Token', type: 'text', default: 'VERIF-9921-X' },
      { id: 'expiresInHours', label: 'Expires In (Hours)', type: 'number', default: 24 },
    ],
  },
  otp: {
    title: '🔒 Two-Factor Passcode',
    fields: [
      { id: 'name', label: 'Recipient Name', type: 'text', default: 'Farmanullah' },
      { id: 'otp', label: '6-Digit One-Time Passcode', type: 'text', default: '849201' },
      { id: 'purpose', label: 'Authorization Purpose', type: 'text', default: 'High-Value Payment Authorization' },
      { id: 'expiresInMinutes', label: 'Expires In (Minutes)', type: 'number', default: 10 },
    ],
  },
  resetPassword: {
    title: '🔑 Password Reset Request',
    fields: [
      { id: 'name', label: 'Account Name', type: 'text', default: 'Farmanullah Ansari' },
      { id: 'resetUrl', label: 'Password Reset URL', type: 'url', default: 'http://localhost:3000/api/auth/reset-password?token=sec_reset_482' },
      { id: 'token', label: 'Security Token', type: 'text', default: 'TOKEN_XYZ_89' },
    ],
  },
  passwordChanged: {
    title: '✅ Password Changed Security Alert',
    fields: [
      { id: 'name', label: 'Account Name', type: 'text', default: 'Farmanullah Ansari' },
      { id: 'timestamp', label: 'Event Timestamp', type: 'text', default: new Date().toUTCString() },
      { id: 'ipAddress', label: 'IP Address', type: 'text', default: '198.51.100.42' },
      { id: 'device', label: 'Client Device', type: 'text', default: 'Chrome 128 on Windows 11' },
      { id: 'securityUrl', label: 'Lock Account Action URL', type: 'url', default: 'http://localhost:3000/account/lock' },
    ],
  },
  loginAlert: {
    title: '🛡️ New Sign-in Detected',
    fields: [
      { id: 'name', label: 'Member Name', type: 'text', default: 'Farmanullah' },
      { id: 'device', label: 'Device / Browser', type: 'text', default: 'Safari 18 on iOS 18 (iPhone 16 Pro)' },
      { id: 'ipAddress', label: 'IP Address', type: 'text', default: '172.56.21.89' },
      { id: 'location', label: 'Approximate Location', type: 'text', default: 'Karachi, Pakistan' },
      { id: 'timestamp', label: 'Login Time', type: 'text', default: new Date().toUTCString() },
      { id: 'securityUrl', label: 'Secure Account Link', type: 'url', default: 'http://localhost:3000/api/auth/forgot-password' },
    ],
  },
  invoice: {
    title: '🧾 Corporate Billing Statement',
    fields: [
      { id: 'clientName', label: 'Client / Enterprise Name', type: 'text', default: 'Farmanullah Ansari Technologies' },
      { id: 'invoiceNumber', label: 'Invoice Number', type: 'text', default: 'INV-2026-9042' },
      { id: 'isPaid', label: 'Payment Status (true = Paid, false = Due)', type: 'text', default: 'true' },
      { id: 'subtotal', label: 'Subtotal ($)', type: 'number', default: 450 },
      { id: 'tax', label: 'Tax Amount ($)', type: 'number', default: 22.5 },
      { id: 'total', label: 'Total Amount ($)', type: 'number', default: 472.5 },
      { id: 'paymentUrl', label: 'Invoice / Payment URL', type: 'url', default: 'http://localhost:3000/billing/pay/INV-2026-9042' },
    ],
  },
};

// UI Elements
const els = {
  templatePills: document.getElementById('templatePillsContainer'),
  formContainer: document.getElementById('dynamicFormContainer'),
  refreshPreviewBtn: document.getElementById('refreshPreviewBtn'),
  resetDataBtn: document.getElementById('resetDataBtn'),
  subjectText: document.getElementById('subjectPreviewText'),
  emailFrameWrapper: document.getElementById('emailFrameWrapper'),
  previewIframe: document.getElementById('previewIframe'),
  plainTextPane: document.getElementById('plainTextPane'),
  htmlSourcePane: document.getElementById('htmlSourcePane'),
  viewTabs: document.querySelectorAll('.view-tab'),
  deviceButtons: document.querySelectorAll('.device-btn'),
  copyCodeBtn: document.getElementById('copyCodeBtn'),
  smtpBadge: document.getElementById('smtpStatusBadge'),
  smtpDot: document.getElementById('smtpStatusDot'),
  smtpText: document.getElementById('smtpStatusText'),
  openSendModalBtn: document.getElementById('openSendModalBtn'),
  sendEmailModal: document.getElementById('sendEmailModal'),
  closeSendModalBtn: document.getElementById('closeSendModalBtn'),
  cancelSendBtn: document.getElementById('cancelSendBtn'),
  confirmSendBtn: document.getElementById('confirmSendBtn'),
  modalRecipientInput: document.getElementById('modalRecipientInput'),
  modalSubjectInput: document.getElementById('modalSubjectInput'),
  modalActiveTemplate: document.getElementById('modalActiveTemplate'),
  domainTypoWarning: document.getElementById('domainTypoWarning'),
  sendProgressAlert: document.getElementById('sendProgressAlert'),
  openLogsBtn: document.getElementById('openLogsBtn'),
  logsModal: document.getElementById('logsModal'),
  closeLogsModalBtn: document.getElementById('closeLogsModalBtn'),
  closeLogsFooterBtn: document.getElementById('closeLogsFooterBtn'),
  refreshLogsBtn: document.getElementById('refreshLogsBtn'),
  logsTableContainer: document.getElementById('logsTableContainer'),
  logSearchInput: document.getElementById('logSearchInput'),
  toastContainer: document.getElementById('toastContainer'),
};

/**
 * Shows a temporary floating toast message.
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> <div>${message}</div>`;
  els.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

/**
 * Builds the interactive form based on active template fields.
 */
function renderForm() {
  const preset = TEMPLATE_PRESETS[state.activeTemplate];
  if (!preset) return;

  let html = `
    <div style="font-size: 14px; font-weight: 800; color: var(--color-accent); margin-bottom: 16px;">
      ${preset.title}
    </div>
  `;

  preset.fields.forEach(field => {
    html += `
      <div class="form-group">
        <label for="field-${field.id}">${field.label}</label>
        <input 
          type="${field.type}" 
          id="field-${field.id}" 
          class="form-control" 
          value="${field.default}"
          data-field="${field.id}"
        >
      </div>
    `;
  });

  els.formContainer.innerHTML = html;

  // Attach live input listeners for real-time preview updates
  els.formContainer.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', () => {
      clearTimeout(state.previewDebounceTimer);
      state.previewDebounceTimer = setTimeout(triggerPreview, 300);
    });
  });
}

/**
 * Extracts form field values into a dynamic data payload.
 */
function extractFormData() {
  const data = {};
  els.formContainer.querySelectorAll('input').forEach(input => {
    const fieldId = input.getAttribute('data-field');
    if (fieldId) {
      let val = input.value;
      if (input.type === 'number') val = Number(val);
      if (val === 'true') val = true;
      if (val === 'false') val = false;
      data[fieldId] = val;
    }
  });

  // Attach sample items if invoice template
  if (state.activeTemplate === 'invoice') {
    data.items = [
      { description: 'Cloud Transactional SMTP Cluster Setup', quantity: 1, amount: 250 },
      { description: 'DKIM & SPF Authentication Provisioning', quantity: 1, amount: 150 },
      { description: 'Handlebars Dynamic Templates Customization', quantity: 1, amount: 72.5 },
    ];
  }

  return data;
}

/**
 * Requests rendered HTML and plaintext from the backend preview API.
 */
async function triggerPreview() {
  if (state.isFetchingPreview) return;
  state.isFetchingPreview = true;

  try {
    const dataPayload = extractFormData();
    
    // Map template name for preview endpoint
    const previewAliasMap = {
      signup: 'signup',
      verifyEmail: 'verify-email',
      otp: 'otp-hbs',
      resetPassword: 'reset-password-hbs',
      passwordChanged: 'password-changed',
      loginAlert: 'login-alert',
      invoice: 'invoice-hbs',
    };

    const templateParam = previewAliasMap[state.activeTemplate] || state.activeTemplate;

    const res = await fetch('/api/email/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template: templateParam,
        data: dataPayload,
      }),
    });

    const result = await res.json();
    if (!result.success) {
      throw new Error(result.error?.message || 'Preview generation failed');
    }

    state.lastRenderedData = result.data;

    // Update Subject preview
    els.subjectText.textContent = result.data.subject || 'No Subject Defined';

    // Update views
    renderActiveView();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    state.isFetchingPreview = false;
  }
}

/**
 * Renders the active view (Iframe, Plain text, or HTML source).
 */
function renderActiveView() {
  if (!state.lastRenderedData) return;

  if (state.activeView === 'rendered') {
    els.emailFrameWrapper.style.display = 'flex';
    els.plainTextPane.style.display = 'none';
    els.htmlSourcePane.style.display = 'none';

    const doc = els.previewIframe.contentDocument || els.previewIframe.contentWindow.document;
    doc.open();
    doc.write(state.lastRenderedData.html);
    doc.close();
  } else if (state.activeView === 'plaintext') {
    els.emailFrameWrapper.style.display = 'none';
    els.plainTextPane.style.display = 'block';
    els.htmlSourcePane.style.display = 'none';
    els.plainTextPane.textContent = state.lastRenderedData.text || 'No plain text fallback generated.';
  } else if (state.activeView === 'source') {
    els.emailFrameWrapper.style.display = 'none';
    els.plainTextPane.style.display = 'none';
    els.htmlSourcePane.style.display = 'block';
    els.htmlSourcePane.textContent = state.lastRenderedData.html || '';
  }
}

/**
 * Probes SMTP server health and diagnostics.
 */
async function checkSmtpHealth() {
  try {
    const res = await fetch('/api/system/smtp-diag');
    const result = await res.json();
    if (result.success && result.data?.healthy) {
      els.smtpDot.className = 'status-indicator online';
      els.smtpText.textContent = `SMTP Connected (${result.data.latencyMs}ms)`;
    } else {
      els.smtpDot.className = 'status-indicator offline';
      els.smtpText.textContent = 'SMTP Disconnected';
    }
  } catch (_) {
    els.smtpDot.className = 'status-indicator offline';
    els.smtpText.textContent = 'SMTP Unreachable';
  }
}

/**
 * Validates domain typos on recipient email input.
 */
async function checkDomainTypo(email) {
  if (!email || !email.includes('@')) {
    els.domainTypoWarning.style.display = 'none';
    return;
  }
  try {
    const res = await fetch('/api/system/validate-domain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const result = await res.json();
    if (result.success && result.data?.hasTypo) {
      els.domainTypoWarning.style.display = 'block';
      els.domainTypoWarning.textContent = `💡 Did you mean ${result.data.suggestion}? (${result.data.domain} looks misspelled)`;
    } else {
      els.domainTypoWarning.style.display = 'none';
    }
  } catch (_) {}
}

/**
 * Dispatches an email via the Handlebars API.
 */
async function sendLiveEmail() {
  const recipient = els.modalRecipientInput.value.trim();
  if (!recipient) {
    showToast('Recipient email is required', 'error');
    els.modalRecipientInput.focus();
    return;
  }

  els.confirmSendBtn.disabled = true;
  els.sendProgressAlert.style.display = 'block';
  els.sendProgressAlert.style.backgroundColor = 'var(--color-bg-elevated)';
  els.sendProgressAlert.style.color = 'var(--color-text-main)';
  els.sendProgressAlert.textContent = 'Connecting to SMTP server & dispatching email...';

  try {
    const dataPayload = extractFormData();
    const subjectOverride = els.modalSubjectInput.value.trim() || undefined;

    const res = await fetch('/api/email/send-handlebars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template: state.activeTemplate,
        to: recipient,
        subject: subjectOverride,
        data: dataPayload,
      }),
    });

    const result = await res.json();
    if (!result.success) {
      throw new Error(result.error?.message || 'Email dispatch failed');
    }

    els.sendProgressAlert.style.backgroundColor = 'var(--color-success-bg)';
    els.sendProgressAlert.style.color = 'var(--color-success)';
    els.sendProgressAlert.innerHTML = `
      <strong>Success!</strong> Email delivered via messageId: <code>${result.data?.messageId || 'N/A'}</code>
      ${result.data?.previewUrl ? `<br><a href="${result.data.previewUrl}" target="_blank" style="color: var(--color-accent); text-decoration: underline;">Open Ethereal Preview &rarr;</a>` : ''}
    `;

    showToast(`Email dispatched to ${recipient}!`, 'success');
  } catch (err) {
    els.sendProgressAlert.style.backgroundColor = 'var(--color-danger-bg)';
    els.sendProgressAlert.style.color = 'var(--color-danger)';
    els.sendProgressAlert.textContent = `Dispatch Error: ${err.message}`;
    showToast(err.message, 'error');
  } finally {
    els.confirmSendBtn.disabled = false;
  }
}

/**
 * Fetches recent audit logs from MSSQL database.
 */
async function loadLogs() {
  els.logsTableContainer.innerHTML = '<p style="color: var(--color-text-dim); text-align: center; padding: 20px;">Fetching records from MSSQL...</p>';
  try {
    const query = els.logSearchInput?.value?.trim() || '';
    const url = `/api/email/logs?limit=25${query ? `&search=${encodeURIComponent(query)}` : ''}`;
    const res = await fetch(url);
    const result = await res.json();
    
    if (!result.success || !result.data?.length) {
      els.logsTableContainer.innerHTML = '<p style="color: var(--color-text-dim); text-align: center; padding: 20px;">No delivery logs found in MSSQL database.</p>';
      return;
    }

    let tableHtml = `
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
        <thead>
          <tr style="background-color: var(--color-bg-elevated); color: var(--color-text-muted); border-bottom: 1px solid var(--color-border);">
            <th style="padding: 10px 12px;">ID</th>
            <th style="padding: 10px 12px;">Recipient</th>
            <th style="padding: 10px 12px;">Subject</th>
            <th style="padding: 10px 12px;">Category</th>
            <th style="padding: 10px 12px;">Status</th>
            <th style="padding: 10px 12px;">Latency</th>
            <th style="padding: 10px 12px;">Time</th>
            <th style="padding: 10px 12px;">Action</th>
          </tr>
        </thead>
        <tbody>
    `;

    result.data.forEach(log => {
      const isOk = log.status === 'ACCEPTED';
      tableHtml += `
        <tr style="border-bottom: 1px solid var(--color-border);">
          <td style="padding: 10px 12px; font-family: var(--font-mono); color: var(--color-text-dim);">#${log.id}</td>
          <td style="padding: 10px 12px; font-weight: 600;">${log.recipient}</td>
          <td style="padding: 10px 12px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${log.subject || 'N/A'}</td>
          <td style="padding: 10px 12px;"><span style="font-size: 10px; background: rgba(245,166,35,0.15); color: var(--color-accent); padding: 2px 6px; border-radius: 4px;">${log.category}</span></td>
          <td style="padding: 10px 12px;">
            <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; ${isOk ? 'background: var(--color-success-bg); color: var(--color-success);' : 'background: var(--color-danger-bg); color: var(--color-danger);'}">
              ${log.status}
            </span>
          </td>
          <td style="padding: 10px 12px; font-family: var(--font-mono);">${log.deliveryDurationMs ? `${log.deliveryDurationMs}ms` : '-'}</td>
          <td style="padding: 10px 12px; color: var(--color-text-dim);">${new Date(log.createdAt).toLocaleTimeString()}</td>
          <td style="padding: 10px 12px;">
            <button class="btn btn-secondary btn-sm retry-btn" data-id="${log.id}" style="padding: 3px 8px; font-size: 11px;">Resend</button>
          </td>
        </tr>
      `;
    });

    tableHtml += '</tbody></table>';
    els.logsTableContainer.innerHTML = tableHtml;

    // Attach resend handlers
    els.logsTableContainer.querySelectorAll('.retry-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        btn.disabled = true;
        btn.textContent = 'Retrying...';
        try {
          const res = await fetch(`/api/email/logs/${id}/retry`, { method: 'POST' });
          const resJson = await res.json();
          if (resJson.success) {
            showToast(`Log #${id} re-sent successfully!`, 'success');
            loadLogs();
          } else {
            showToast(resJson.error?.message || 'Resend failed', 'error');
          }
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          btn.disabled = false;
          btn.textContent = 'Resend';
        }
      });
    });

  } catch (err) {
    els.logsTableContainer.innerHTML = `<p style="color: var(--color-danger); text-align: center; padding: 20px;">Error loading audit logs: ${err.message}</p>`;
  }
}

// Event Listeners
function setupEvents() {
  // Template pill selection
  els.templatePills.addEventListener('click', (e) => {
    const pill = e.target.closest('.template-pill');
    if (!pill) return;
    
    document.querySelectorAll('.template-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');

    state.activeTemplate = pill.getAttribute('data-template');
    renderForm();
    triggerPreview();
  });

  // View tabs (Rendered, Plaintext, Source)
  els.viewTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      els.viewTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.activeView = tab.getAttribute('data-view');
      renderActiveView();
    });
  });

  // Device switcher
  els.deviceButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      els.deviceButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const device = btn.getAttribute('data-device');
      state.activeDevice = device;
      els.emailFrameWrapper.className = `email-frame-wrapper ${device}`;
    });
  });

  // Refresh preview button
  els.refreshPreviewBtn.addEventListener('click', triggerPreview);

  // Reset data button
  els.resetDataBtn.addEventListener('click', () => {
    renderForm();
    triggerPreview();
    showToast('Form reset to default sample variables.');
  });

  // Copy code button
  els.copyCodeBtn.addEventListener('click', async () => {
    if (!state.lastRenderedData) return;
    const textToCopy = state.activeView === 'plaintext' 
      ? state.lastRenderedData.text 
      : state.lastRenderedData.html;
    
    await navigator.clipboard.writeText(textToCopy);
    showToast(`Copied ${state.activeView === 'plaintext' ? 'Plain Text' : 'HTML'} to clipboard!`, 'success');
  });

  // Send modal controls
  els.openSendModalBtn.addEventListener('click', () => {
    els.modalActiveTemplate.value = state.activeTemplate;
    els.modalSubjectInput.value = state.lastRenderedData?.subject || '';
    els.sendProgressAlert.style.display = 'none';
    els.sendEmailModal.classList.add('open');
    els.modalRecipientInput.focus();
  });

  const closeSendModal = () => els.sendEmailModal.classList.remove('open');
  els.closeSendModalBtn.addEventListener('click', closeSendModal);
  els.cancelSendBtn.addEventListener('click', closeSendModal);
  els.confirmSendBtn.addEventListener('click', sendLiveEmail);

  // Typo check on recipient
  els.modalRecipientInput.addEventListener('blur', () => {
    checkDomainTypo(els.modalRecipientInput.value.trim());
  });

  // Logs modal controls
  els.openLogsBtn.addEventListener('click', () => {
    els.logsModal.classList.add('open');
    loadLogs();
  });
  const closeLogsModal = () => els.logsModal.classList.remove('open');
  els.closeLogsModalBtn.addEventListener('click', closeLogsModal);
  els.closeLogsFooterBtn.addEventListener('click', closeLogsModal);
  els.refreshLogsBtn.addEventListener('click', loadLogs);
  els.logSearchInput.addEventListener('input', () => {
    clearTimeout(state.previewDebounceTimer);
    state.previewDebounceTimer = setTimeout(loadLogs, 400);
  });
}

// Initial Boot
function init() {
  setupEvents();
  renderForm();
  triggerPreview();
  checkSmtpHealth();
  setInterval(checkSmtpHealth, 30000); // Probe SMTP every 30s
}

document.addEventListener('DOMContentLoaded', init);
