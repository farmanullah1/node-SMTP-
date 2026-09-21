import React, { useState, useEffect, useCallback } from 'react';
import PreviewCanvas from './PreviewCanvas';
import SendModal from './SendModal';
import AuditLogsModal from './AuditLogsModal';

const TEMPLATE_PRESETS = {
  signup: {
    title: '🚀 Welcome / Sign-up',
    alias: 'signup',
    fields: [
      { id: 'name', label: 'Member Name', type: 'text', default: 'Farmanullah Ansari' },
      { id: 'verificationUrl', label: 'Email Verification URL', type: 'url', default: 'http://localhost:3000/api/auth/verify-email?token=welcome_tok_123' },
      { id: 'actionUrl', label: 'Get Started Action URL', type: 'url', default: 'http://localhost:3000/dashboard' },
      { id: 'ctaText', label: 'CTA Button Text', type: 'text', default: 'Get Started Now →' },
    ],
  },
  verifyEmail: {
    title: '✉️ Verify Email',
    alias: 'verify-email',
    fields: [
      { id: 'name', label: 'User Name', type: 'text', default: 'Farmanullah Ansari' },
      { id: 'verificationUrl', label: 'Verification URL', type: 'url', default: 'http://localhost:3000/api/auth/verify-email?token=verif_8892' },
      { id: 'token', label: 'Manual Security Token', type: 'text', default: 'VERIF-9921-X' },
      { id: 'expiresInHours', label: 'Expires In (Hours)', type: 'number', default: 24 },
    ],
  },
  otp: {
    title: '🔒 2FA Passcode',
    alias: 'otp-hbs',
    fields: [
      { id: 'name', label: 'Recipient Name', type: 'text', default: 'Farmanullah' },
      { id: 'otp', label: '6-Digit Passcode', type: 'text', default: '849201' },
      { id: 'purpose', label: 'Authorization Purpose', type: 'text', default: 'High-Value Payment Authorization' },
      { id: 'expiresInMinutes', label: 'Expires In (Minutes)', type: 'number', default: 10 },
    ],
  },
  resetPassword: {
    title: '🔑 Reset Password',
    alias: 'reset-password-hbs',
    fields: [
      { id: 'name', label: 'Account Name', type: 'text', default: 'Farmanullah Ansari' },
      { id: 'resetUrl', label: 'Password Reset URL', type: 'url', default: 'http://localhost:3000/api/auth/reset-password?token=sec_reset_482' },
      { id: 'token', label: 'Security Token', type: 'text', default: 'TOKEN_XYZ_89' },
    ],
  },
  passwordChanged: {
    title: '✅ Password Changed',
    alias: 'password-changed',
    fields: [
      { id: 'name', label: 'Account Name', type: 'text', default: 'Farmanullah Ansari' },
      { id: 'timestamp', label: 'Event Timestamp', type: 'text', default: new Date().toUTCString() },
      { id: 'ipAddress', label: 'IP Address', type: 'text', default: '198.51.100.42' },
      { id: 'device', label: 'Client Device', type: 'text', default: 'Chrome 128 on Windows 11' },
      { id: 'securityUrl', label: 'Lock Account URL', type: 'url', default: 'http://localhost:3000/account/lock' },
    ],
  },
  loginAlert: {
    title: '🛡️ Login Alert',
    alias: 'login-alert',
    fields: [
      { id: 'name', label: 'Account Holder', type: 'text', default: 'Farmanullah Ansari' },
      { id: 'timestamp', label: 'Sign-in Time', type: 'text', default: new Date().toUTCString() },
      { id: 'ipAddress', label: 'Client IP', type: 'text', default: '203.0.113.195' },
      { id: 'device', label: 'Browser & OS', type: 'text', default: 'Firefox 129 on macOS Sonoma' },
      { id: 'location', label: 'Approximate Location', type: 'text', default: 'Karachi, Pakistan' },
      { id: 'lockUrl', label: 'Secure Account URL', type: 'url', default: 'http://localhost:3000/account/secure' },
    ],
  },
  invoice: {
    title: '🧾 Invoice Billing',
    alias: 'invoice-hbs',
    fields: [
      { id: 'invoiceNumber', label: 'Invoice Number', type: 'text', default: 'INV-2026-0042' },
      { id: 'customerName', label: 'Customer / Organization', type: 'text', default: 'Acme Enterprise Ltd' },
      { id: 'customerEmail', label: 'Billing Email', type: 'email', default: 'billing@acme-corp.internal' },
      { id: 'invoiceDate', label: 'Billing Date', type: 'text', default: 'September 21, 2026' },
      { id: 'dueDate', label: 'Due Date', type: 'text', default: 'October 21, 2026' },
      { id: 'currency', label: 'Currency Symbol', type: 'text', default: '$' },
      { id: 'isPaid', label: 'Paid in Full?', type: 'select', options: ['true', 'false'], default: 'true' },
    ],
  },
};

export default function EmailStudio({
  activeTemplate = 'signup',
  onTemplateChange,
  onVariablesChange,
  onOpenSend,
  onOpenLogs,
}) {
  const [currentTemplate, setCurrentTemplate] = useState(activeTemplate);
  const [formData, setFormData] = useState({});
  const [activeView, setActiveView] = useState('rendered');
  const [activeDevice, setActiveDevice] = useState('desktop');
  const [previewData, setPreviewData] = useState(null);
  const [isRendering, setIsRendering] = useState(false);

  // Sync external template changes if any
  useEffect(() => {
    if (activeTemplate && activeTemplate !== currentTemplate) {
      setCurrentTemplate(activeTemplate);
    }
  }, [activeTemplate]);

  // Initialize form data when template changes
  useEffect(() => {
    const config = TEMPLATE_PRESETS[currentTemplate];
    if (config) {
      const initial = {};
      config.fields.forEach((f) => {
        initial[f.id] = f.default;
      });
      if (currentTemplate === 'invoice') {
        initial.items = [
          { description: 'Cloud Transactional SMTP Cluster Setup', quantity: 1, amount: 250 },
          { description: 'DKIM & SPF Authentication Provisioning', quantity: 1, amount: 150 },
          { description: 'Handlebars Dynamic Templates Customization', quantity: 1, amount: 72.5 },
        ];
      }
      setFormData(initial);
      if (onVariablesChange) onVariablesChange(initial);
    }
  }, [currentTemplate]);

  // Request preview from backend
  const fetchPreview = useCallback(async (templateKey, data) => {
    setIsRendering(true);
    try {
      const alias = TEMPLATE_PRESETS[templateKey]?.alias || templateKey;
      const res = await fetch('/api/email/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: alias,
          data,
        }),
      });
      const result = await res.json();
      if (result.success && result.data) {
        setPreviewData(result.data);
      }
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setIsRendering(false);
    }
  }, []);

  // Debounced preview update on form data changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPreview(currentTemplate, formData);
      if (onVariablesChange) onVariablesChange(formData);
    }, 180);
    return () => clearTimeout(timer);
  }, [currentTemplate, formData, fetchPreview]);

  function handleTemplateSelect(key) {
    setCurrentTemplate(key);
    if (onTemplateChange) onTemplateChange(key);
  }

  function handleFieldChange(fieldId, value) {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  }

  function handleReset() {
    const config = TEMPLATE_PRESETS[currentTemplate];
    if (config) {
      const initial = {};
      config.fields.forEach((f) => {
        initial[f.id] = f.default;
      });
      if (currentTemplate === 'invoice') {
        initial.items = [
          { description: 'Cloud Transactional SMTP Cluster Setup', quantity: 1, amount: 250 },
          { description: 'DKIM & SPF Authentication Provisioning', quantity: 1, amount: 150 },
          { description: 'Handlebars Dynamic Templates Customization', quantity: 1, amount: 72.5 },
        ];
      }
      setFormData(initial);
      if (onVariablesChange) onVariablesChange(initial);
    }
  }

  const currentConfig = TEMPLATE_PRESETS[currentTemplate];

  return (
    <main class="app-main">
      {/* Left Sidebar Form */}
      <aside class="sidebar">
        <div class="sidebar-header">
          <div class="section-label">Select Handlebars Template</div>
          <div class="template-pills" role="tablist">
            {Object.entries(TEMPLATE_PRESETS).map(([key, item]) => (
              <button
                key={key}
                type="button"
                class={`template-pill ${currentTemplate === key ? 'active' : ''}`}
                onClick={() => handleTemplateSelect(key)}
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Fields */}
        <div class="sidebar-body">
          <div class="section-label" style={{ marginBottom: '12px' }}>
            Template Variables
          </div>

          {currentConfig?.fields.map((field) => (
            <div class="form-group" key={field.id}>
              <label htmlFor={`field-${field.id}`}>{field.label}</label>
              {field.type === 'select' ? (
                <select
                  id={`field-${field.id}`}
                  class="form-control"
                  value={formData[field.id] ?? field.default}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                >
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  id={`field-${field.id}`}
                  type={field.type}
                  class="form-control"
                  value={formData[field.id] ?? ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        <div class="sidebar-footer">
          <button
            type="button"
            class="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => fetchPreview(currentTemplate, formData)}
            disabled={isRendering}
          >
            {isRendering ? 'Rendering...' : '🔄 Refresh Preview'}
          </button>
          <button
            type="button"
            class="btn btn-secondary"
            onClick={handleReset}
            title="Reset variables to defaults"
          >
            ↺ Reset
          </button>
        </div>
      </aside>

      {/* Center Preview */}
      <PreviewCanvas
        previewData={previewData}
        activeView={activeView}
        activeDevice={activeDevice}
        onViewChange={setActiveView}
        onDeviceChange={setActiveDevice}
      />
    </main>
  );
}
