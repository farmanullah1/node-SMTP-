import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import AuthModal from './components/Auth/AuthModal';
import EmailStudio from './components/Studio/EmailStudio';
import SendModal from './components/Studio/SendModal';
import AuditLogsModal from './components/Studio/AuditLogsModal';

export default function App() {
  const { user, isLoggedIn, logout, isLoading } = useAuth();
  
  // Navigation / Modal States
  const [guestMode, setGuestMode] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [smtpStatus, setSmtpStatus] = useState({ state: 'checking', text: 'Connecting...' });

  // Check system & SMTP health status
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('/api/system/health');
        if (res.ok) {
          const data = await res.json();
          if (data.data?.services?.smtp?.healthy) {
            const host = data.data?.services?.smtp?.config?.host || 'SMTP';
            setSmtpStatus({
              state: 'online',
              text: `${host}:587 (Ready)`,
            });
          } else {
            setSmtpStatus({ state: 'warning', text: 'SMTP Idle / Sandbox' });
          }
        } else {
          setSmtpStatus({ state: 'offline', text: 'Backend Offline' });
        }
      } catch {
        setSmtpStatus({ state: 'offline', text: 'Backend Unreachable' });
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Show loading spinner while determining session
  if (isLoading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-bg-base)',
        color: 'var(--color-text-main)',
        fontFamily: 'var(--font-sans)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid var(--color-border)',
            borderTopColor: 'var(--color-accent)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px auto',
          }} />
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
            Loading Farmanullah Email Studio...
          </p>
        </div>
      </div>
    );
  }

  // If not logged in and not in guest preview mode, show Signup & Login
  const showAuthGate = !isLoggedIn && !guestMode;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Application Header */}
      <header class="app-header">
        <div class="brand-container" onClick={() => setGuestMode(false)}>
          <div class="brand-logo" aria-hidden="true">FA</div>
          <div class="brand-text">
            <h1>Farmanullah Ansari Company</h1>
            <span>Transactional Email Studio (React + Vite)</span>
          </div>
        </div>

        <div class="header-actions">
          {/* SMTP Health Telemetry Pill */}
          <div class="smtp-status-badge" title="Live SMTP Transport Handshake">
            <span class={`status-indicator ${smtpStatus.state}`} />
            <span>{smtpStatus.text}</span>
          </div>

          {/* User Account Controls */}
          {isLoggedIn ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div class="user-pill">
                <div class="user-pill-avatar">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span>{user?.name || user?.email}</span>
              </div>
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                onClick={logout}
                title="Sign out of account"
              >
                Sign Out
              </button>
            </div>
          ) : (
            guestMode && (
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                onClick={() => setGuestMode(false)}
              >
                Sign In / Register
              </button>
            )
          )}

          {/* Action Modals Triggers */}
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            onClick={() => setIsLogsModalOpen(true)}
          >
            📋 Delivery Logs
          </button>

          <button
            type="button"
            class="btn btn-primary btn-sm"
            onClick={() => setIsSendModalOpen(true)}
          >
            🚀 Send Live Email
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      {showAuthGate ? (
        <AuthModal onBypassGuest={() => setGuestMode(true)} />
      ) : (
        <EmailStudio
          onOpenSend={() => setIsSendModalOpen(true)}
          onOpenLogs={() => setIsLogsModalOpen(true)}
        />
      )}

      {/* Modals */}
      <SendModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        activeTemplate="signup"
        templateVariables={{
          name: user?.name || 'Farmanullah Ansari',
          verificationUrl: 'http://localhost:3000/api/auth/verify-email?token=preview_123',
          actionUrl: 'http://localhost:3000/dashboard',
          ctaText: 'Get Started Now →',
        }}
      />

      <AuditLogsModal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
      />
    </div>
  );
}
