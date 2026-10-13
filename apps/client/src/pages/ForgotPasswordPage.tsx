import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [devResetToken, setDevResetToken] = useState<string | undefined>(undefined);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setDevResetToken(undefined);

    if (!email.trim()) {
      setError('Please enter your account email address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<{ message: string; devResetToken?: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      setMessage(res.message);
      if (res.devResetToken) {
        setDevResetToken(res.devResetToken);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to process password reset request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '460px', margin: '2rem auto', background: '#fff', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
      <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.5rem', color: '#0f172a' }}>Password Recovery</h1>
      <p style={{ margin: '0 0 1.25rem', color: '#64748b', fontSize: '0.9rem' }}>
        Enter your registered email address and we will issue a time-limited single-use reset token.
      </p>

      {error && (
        <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {message && (
        <div role="status" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
          <div>{message}</div>
          {devResetToken && (
            <div style={{ marginTop: '0.65rem', padding: '0.6rem', background: '#dcfce7', borderRadius: '6px', fontSize: '0.82rem' }}>
              <strong>Non-production Reset Link:</strong>{' '}
              <Link to={`/reset-password?token=${encodeURIComponent(devResetToken)}`} style={{ color: '#15803d', fontWeight: 700 }}>
                Continue to Reset Password
              </Link>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label htmlFor="forgot-email" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
            Email Address
          </label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.75rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
        >
          {submitting ? 'Sending...' : 'Request Reset Link'}
        </button>
      </form>

      <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.88rem' }}>
        <Link to="/login" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
          Back to Sign In
        </Link>
      </div>
    </div>
  );
};
