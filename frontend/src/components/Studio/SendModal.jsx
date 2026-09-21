import React, { useState, useEffect } from 'react';

export default function SendModal({ isOpen, onClose, activeTemplate, templateVariables }) {
  const [recipient, setRecipient] = useState('');
  const [subjectOverride, setSubjectOverride] = useState('');
  const [typoWarning, setTypoWarning] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setRecipient('');
      setSubjectOverride('');
      setTypoWarning(null);
      setSendResult(null);
      setErrorMsg(null);
    }
  }, [isOpen]);

  // Check domain typo on recipient blur
  async function checkTypo() {
    if (!recipient || !recipient.includes('@')) {
      setTypoWarning(null);
      return;
    }

    try {
      const res = await fetch('/api/system/validate-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recipient }),
      });
      const data = await res.json();
      if (data.success && data.data?.suggestion) {
        setTypoWarning(data.data.suggestion);
      } else {
        setTypoWarning(null);
      }
    } catch {
      setTypoWarning(null);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    setErrorMsg(null);
    setSendResult(null);
    setIsSending(true);

    try {
      const aliasMap = {
        signup: 'signup',
        verifyEmail: 'verify-email',
        otp: 'otp-hbs',
        resetPassword: 'reset-password-hbs',
        passwordChanged: 'password-changed',
        loginAlert: 'login-alert',
        invoice: 'invoice-hbs',
      };

      const templateParam = aliasMap[activeTemplate] || activeTemplate;

      const res = await fetch('/api/email/send-handlebars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipient,
          template: templateParam,
          data: templateVariables,
          subjectOverride: subjectOverride.trim() || undefined,
        }),
      });

      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to dispatch email.');
      }

      setSendResult(result.data);
    } catch (err) {
      setErrorMsg(err.message || 'Dispatch failed.');
    } finally {
      setIsSending(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-title">Dispatch Live Handlebars Email</div>
          <button type="button" class="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSend}>
          <div class="modal-body">
            {errorMsg && (
              <div style={{
                padding: '10px 14px',
                backgroundColor: 'var(--color-danger-bg)',
                border: '1px solid var(--color-danger)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                color: '#fca5a5',
                marginBottom: '16px',
              }}>
                ⚠️ {errorMsg}
              </div>
            )}

            {sendResult && (
              <div style={{
                padding: '12px 14px',
                backgroundColor: 'var(--color-success-bg)',
                border: '1px solid var(--color-success)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                color: '#86efac',
                marginBottom: '16px',
              }}>
                <p style={{ fontWeight: 600 }}>✅ Email Dispatched Successfully!</p>
                <p style={{ fontSize: '11px', marginTop: '4px' }}>
                  Message ID: <code style={{ fontFamily: 'var(--font-mono)' }}>{sendResult.messageId}</code>
                </p>
                {sendResult.previewUrl && (
                  <div style={{ marginTop: '8px' }}>
                    <a
                      href={sendResult.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        color: 'var(--color-accent)',
                        fontWeight: 600,
                        textDecoration: 'underline',
                      }}
                    >
                      📬 Open in Ethereal Sandbox Inbox &rarr;
                    </a>
                  </div>
                )}
              </div>
            )}

            <div class="form-group">
              <label htmlFor="sendRecipient">
                Recipient Email Address <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                id="sendRecipient"
                type="email"
                class="form-control"
                placeholder="recipient@example.com"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                onBlur={checkTypo}
                required
              />
              {typoWarning && (
                <div style={{ color: 'var(--color-warning)', fontSize: '11px', marginTop: '4px' }}>
                  💡 Did you mean: <button
                    type="button"
                    onClick={() => { setRecipient(typoWarning); setTypoWarning(null); }}
                    style={{ background: 'none', border: 'none', color: 'var(--color-accent)', textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    {typoWarning}
                  </button>?
                </div>
              )}
            </div>

            <div class="form-group">
              <label htmlFor="sendSubjectOverride">Subject Override (Optional)</label>
              <input
                id="sendSubjectOverride"
                type="text"
                class="form-control"
                placeholder="Leave blank to use default template subject"
                value={subjectOverride}
                onChange={(e) => setSubjectOverride(e.target.value)}
              />
            </div>

            <div class="form-group">
              <label htmlFor="sendActiveTemplate">Active Template</label>
              <input
                id="sendActiveTemplate"
                type="text"
                class="form-control form-control-mono"
                value={activeTemplate}
                readOnly
              />
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <button type="submit" class="btn btn-primary" disabled={isSending}>
              {isSending ? 'Transmitting SMTP...' : '🚀 Transmit Email Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
