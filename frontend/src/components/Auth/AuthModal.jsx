import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function AuthModal({ onBypassGuest }) {
  const { login, register, forgotPassword, authError } = useAuth();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'signup' | 'forgot'
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form state
  const [name, setName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  
  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState('');
  
  // Feedback states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successInfo, setSuccessInfo] = useState(null);

  // Simple password strength calculation
  const hasLetter = /[a-zA-Z]/.test(signupPassword);
  const hasNumber = /[0-9]/.test(signupPassword);
  const hasMinLength = signupPassword.length >= 8;
  const strengthScore = (hasLetter ? 1 : 0) + (hasNumber ? 1 : 0) + (hasMinLength ? 1 : 0);

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      await login({ email: loginEmail, password: loginPassword });
    } catch (err) {
      setErrorMsg(err.message || 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignupSubmit(e) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessInfo(null);
    setIsSubmitting(true);

    try {
      const result = await register({ name, email: signupEmail, password: signupPassword });
      setSuccessInfo({
        message: 'Account created successfully! Verification email has been sent.',
        previewUrl: result.data?.previewUrl,
      });
      // Clear password
      setSignupPassword('');
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotSubmit(e) {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const result = await forgotPassword(forgotEmail);
      setSuccessInfo({
        message: 'Password reset email sent! Check your inbox.',
        previewUrl: result.data?.previewUrl,
      });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send reset email.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div class="auth-page-wrapper">
      <div class="auth-card">
        {/* Brand Header */}
        <div class="auth-header">
          <div class="auth-badge">
            <span>🛡️</span> SMTP & Nodemailer Production Lab
          </div>
          <h2>Farmanullah Ansari Company</h2>
          <p>Sign in or register to access the Transactional Handlebars Studio</p>
        </div>

        {/* Tab Selection */}
        {activeTab !== 'forgot' && (
          <div class="auth-tabs" role="tablist">
            <button
              type="button"
              class={`auth-tab-btn ${activeTab === 'login' ? 'active' : ''}`}
              onClick={() => { setActiveTab('login'); setErrorMsg(null); setSuccessInfo(null); }}
            >
              Sign In
            </button>
            <button
              type="button"
              class={`auth-tab-btn ${activeTab === 'signup' ? 'active' : ''}`}
              onClick={() => { setActiveTab('signup'); setErrorMsg(null); setSuccessInfo(null); }}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Global Error Banner */}
        {(errorMsg || authError) && (
          <div style={{
            padding: '10px 14px',
            backgroundColor: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            color: '#fca5a5',
            marginBottom: '16px',
            lineHeight: 1.4,
          }}>
            ⚠️ {errorMsg || authError}
          </div>
        )}

        {/* Global Success / Preview Notification */}
        {successInfo && (
          <div style={{
            padding: '12px 14px',
            backgroundColor: 'var(--color-success-bg)',
            border: '1px solid var(--color-success)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            color: '#86efac',
            marginBottom: '16px',
            lineHeight: 1.4,
          }}>
            <p style={{ fontWeight: 600, marginBottom: successInfo.previewUrl ? '8px' : 0 }}>
              ✅ {successInfo.message}
            </p>
            {successInfo.previewUrl && (
              <a
                href={successInfo.previewUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  color: 'var(--color-accent)',
                  fontWeight: 600,
                  textDecoration: 'underline',
                }}
              >
                📬 View Dispatched Email in Ethereal Sandbox &rarr;
              </a>
            )}
          </div>
        )}

        {/* 1. Sign In Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            <div class="form-group">
              <label htmlFor="loginEmail">Work Email Address</label>
              <input
                id="loginEmail"
                type="email"
                class="form-control"
                placeholder="name@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </div>

            <div class="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="loginPassword">Password</label>
                <button
                  type="button"
                  onClick={() => { setActiveTab('forgot'); setErrorMsg(null); setSuccessInfo(null); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-accent)',
                    fontSize: '11px',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="loginPassword"
                type="password"
                class="form-control"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              class="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '8px' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In to Studio &rarr;'}
            </button>
          </form>
        )}

        {/* 2. Sign Up Form */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignupSubmit}>
            <div class="form-group">
              <label htmlFor="signupName">Full Name</label>
              <input
                id="signupName"
                type="text"
                class="form-control"
                placeholder="Farmanullah Ansari"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div class="form-group">
              <label htmlFor="signupEmail">Email Address</label>
              <input
                id="signupEmail"
                type="email"
                class="form-control"
                placeholder="name@example.com"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                required
              />
              <span class="form-hint">A real Nodemailer verification email will be generated.</span>
            </div>

            <div class="form-group">
              <label htmlFor="signupPassword">Password</label>
              <input
                id="signupPassword"
                type="password"
                class="form-control"
                placeholder="At least 8 chars (letters & numbers)"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                required
              />
              {/* Password strength meter */}
              <div class="password-meter">
                <div class={`meter-bar ${strengthScore >= 1 ? 'active weak' : ''}`}></div>
                <div class={`meter-bar ${strengthScore >= 2 ? 'active medium' : ''}`}></div>
                <div class={`meter-bar ${strengthScore === 3 ? 'active strong' : ''}`}></div>
              </div>
              <span class="form-hint" style={{ color: strengthScore === 3 ? 'var(--color-success)' : 'var(--color-text-dim)' }}>
                {strengthScore === 3 ? '✓ Strong password' : 'Must contain at least 8 characters, letters & numbers'}
              </span>
            </div>

            <button
              type="submit"
              class="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '8px' }}
              disabled={isSubmitting || strengthScore < 3}
            >
              {isSubmitting ? 'Creating Account & Sending Email...' : 'Register & Send Verification &rarr;'}
            </button>
          </form>
        )}

        {/* 3. Forgot Password Form */}
        {activeTab === 'forgot' && (
          <form onSubmit={handleForgotSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => { setActiveTab('login'); setErrorMsg(null); setSuccessInfo(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginBottom: '12px',
                }}
              >
                &larr; Back to Sign In
              </button>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-main)' }}>
                Reset Your Password
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-dim)', marginTop: '4px' }}>
                Enter your account email. Nodemailer will dispatch a secure password reset email with action token.
              </p>
            </div>

            <div class="form-group">
              <label htmlFor="forgotEmail">Email Address</label>
              <input
                id="forgotEmail"
                type="email"
                class="form-control"
                placeholder="name@example.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              class="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '8px' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Dispatching Reset Email...' : 'Send Password Reset Email &rarr;'}
            </button>
          </form>
        )}

        {/* Guest Preview Shortcut */}
        <div style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid var(--color-border)',
          textAlign: 'center',
        }}>
          <button
            type="button"
            onClick={onBypassGuest}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-accent)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🎨 Preview Handlebars Email Studio Directly &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
