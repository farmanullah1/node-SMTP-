import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('smtp_lab_token') || null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Validate active token on initial load
  useEffect(() => {
    async function checkAuth() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const result = await res.json();
          if (result.success && result.data?.user) {
            setUser(result.data.user);
          } else {
            // Token invalid
            logout();
          }
        } else {
          logout();
        }
      } catch (err) {
        console.warn('Auth token validation network error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [token]);

  /**
   * Register a new user with real Nodemailer verification email trigger.
   */
  async function register({ name, email, password }) {
    setAuthError(null);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const result = await res.json();
    if (!result.success) {
      const msg = result.error?.message || 'Registration failed.';
      setAuthError(msg);
      throw new Error(msg);
    }

    if (result.data?.token) {
      setToken(result.data.token);
      localStorage.setItem('smtp_lab_token', result.data.token);
      setUser(result.data.user);
    }

    return result;
  }

  /**
   * Authenticate user with credentials and store JWT token.
   */
  async function login({ email, password }) {
    setAuthError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const result = await res.json();
    if (!result.success) {
      const msg = result.error?.message || 'Invalid credentials.';
      setAuthError(msg);
      throw new Error(msg);
    }

    if (result.data?.token) {
      setToken(result.data.token);
      localStorage.setItem('smtp_lab_token', result.data.token);
      setUser(result.data.user);
    }

    return result;
  }

  /**
   * Log out and clear session.
   */
  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors during logout
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('smtp_lab_token');
  }

  /**
   * Request password reset email via Nodemailer.
   */
  async function forgotPassword(email) {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const result = await res.json();
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to send password reset email.');
    }
    return result;
  }

  const value = {
    user,
    token,
    isLoggedIn: !!user,
    isLoading,
    authError,
    register,
    login,
    logout,
    forgotPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
