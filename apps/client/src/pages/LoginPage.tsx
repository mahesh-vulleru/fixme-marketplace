import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCrossAppUrlForRole } from '../lib/urls';

export const LoginPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSafeRedirect = (): string => {
    const params = new URLSearchParams(location.search);
    const redirectParam = params.get('redirect');
    if (redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')) {
      return redirectParam;
    }
    const stateFrom = (location.state as { from?: string } | null)?.from;
    if (stateFrom && stateFrom.startsWith('/') && !stateFrom.startsWith('//')) {
      return stateFrom;
    }
    return '/';
  };

  useEffect(() => {
    if (user) {
      const crossUrl = getCrossAppUrlForRole(user.role);
      if (crossUrl) {
        window.location.href = crossUrl;
      } else {
        navigate(getSafeRedirect(), { replace: true });
      }
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setSubmitting(true);
    try {
      const loggedIn = await login({ email: email.trim().toLowerCase(), password });
      const crossUrl = getCrossAppUrlForRole(loggedIn.role);
      if (crossUrl) {
        window.location.href = crossUrl;
        return;
      }
      navigate(getSafeRedirect(), { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '460px', margin: '2rem auto', background: '#fff', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
          SECURE SIGN IN
        </span>
        <h1 style={{ margin: '0.6rem 0 0.25rem', fontSize: '1.65rem', color: '#0f172a' }}>Welcome back</h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem' }}>
          Sign in to manage your spare-parts cart, orders, and warranty returns.
        </p>
      </div>

      {error && (
        <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label htmlFor="login-email" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
            Email Address
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <label htmlFor="login-password" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Link to="/forgot-password" style={{ color: '#2563eb', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            background: '#0f172a',
            color: '#fff',
            border: 'none',
            padding: '0.8rem 1.25rem',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1
          }}
        >
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.9rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
        New to FixMe.com?{' '}
        <Link to="/register" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
          Create an account
        </Link>
      </div>
    </div>
  );
};

