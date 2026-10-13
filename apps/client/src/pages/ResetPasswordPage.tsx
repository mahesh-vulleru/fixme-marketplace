import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState(searchParams.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token.trim()) {
      setError('Reset token is required.');
      return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must be at least 8 characters and include uppercase, lowercase, and a number.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: token.trim(), password, confirmPassword })
      });
      setSuccess(res.message);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(err.message || 'Password reset failed. The token may have expired or already been used.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '460px', margin: '2rem auto', background: '#fff', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
      <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.5rem', color: '#0f172a' }}>Set New Password</h1>
      <p style={{ margin: '0 0 1.25rem', color: '#64748b', fontSize: '0.9rem' }}>
        Choose a strong new password. All existing active sessions will be invalidated immediately.
      </p>

      {error && (
        <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {success && (
        <div role="status" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600 }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label htmlFor="reset-token" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
            Reset Token
          </label>
          <input
            id="reset-token"
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste reset token"
            required
            style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
            <label htmlFor="reset-password" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
              New Password
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
            id="reset-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label htmlFor="reset-confirm" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
            Confirm New Password
          </label>
          <input
            id="reset-confirm"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{ background: '#0f172a', color: '#fff', border: 'none', padding: '0.75rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
        >
          {submitting ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>

      <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.88rem' }}>
        <Link to="/login" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}>
          Return to Sign In
        </Link>
      </div>
    </div>
  );
};
