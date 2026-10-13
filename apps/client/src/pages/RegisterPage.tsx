import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validateFields = (): boolean => {
    const errs: Record<string, string> = {};
    if (fullName.trim().length < 2) {
      errs.fullName = 'Full name must be at least 2 characters.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }
    if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters long.';
    } else if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      errs.password = 'Password must include uppercase, lowercase, and at least one number.';
    }
    if (confirmPassword !== password) {
      errs.confirmPassword = 'Passwords do not match.';
    }
    if (phone.trim() && phone.trim().length < 7) {
      errs.phone = 'Please enter a valid phone number.';
    }
    if (!acceptTerms) {
      errs.acceptTerms = 'You must accept the Terms of Service and Privacy Policy.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    if (!validateFields()) return;

    setSubmitting(true);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
        phone: phone.trim() || undefined,
        acceptTerms
      });
      setSuccessMessage('Account created! Redirecting to marketplace...');
      setTimeout(() => navigate('/'), 900);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please verify your details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '520px', margin: '1.5rem auto', background: '#fff', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
          CUSTOMER REGISTRATION
        </span>
        <h1 style={{ margin: '0.6rem 0 0.25rem', fontSize: '1.65rem', color: '#0f172a' }}>Create your FixMe account</h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem' }}>
          Track orders, save compatible parts, and submit wanted-part requests.
        </p>
      </div>

      {error && (
        <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {successMessage && (
        <div role="status" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600 }}>
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label htmlFor="reg-fullname" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
            Full Name *
          </label>
          <input
            id="reg-fullname"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Alex Rivera"
            required
            style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: fieldErrors.fullName ? '1px solid #ef4444' : '1px solid #cbd5e1', boxSizing: 'border-box' }}
          />
          {fieldErrors.fullName && <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.25rem' }}>{fieldErrors.fullName}</div>}
        </div>

        <div>
          <label htmlFor="reg-email" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
            Email Address *
          </label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex@example.com"
            required
            style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: fieldErrors.email ? '1px solid #ef4444' : '1px solid #cbd5e1', boxSizing: 'border-box' }}
          />
          {fieldErrors.email && <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.25rem' }}>{fieldErrors.email}</div>}
        </div>

        <div>
          <label htmlFor="reg-phone" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
            Phone Number (Optional — for courier updates)
          </label>
          <input
            id="reg-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 234 5678"
            style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: fieldErrors.phone ? '1px solid #ef4444' : '1px solid #cbd5e1', boxSizing: 'border-box' }}
          />
          {fieldErrors.phone && <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.25rem' }}>{fieldErrors.phone}</div>}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <label htmlFor="reg-password" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
              Password *
            </label>
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              {showPassword ? 'Hide password' : 'Show password'}
            </button>
          </div>
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 chars, uppercase, lowercase & number"
            required
            style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: fieldErrors.password ? '1px solid #ef4444' : '1px solid #cbd5e1', boxSizing: 'border-box' }}
          />
          {fieldErrors.password && <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.25rem' }}>{fieldErrors.password}</div>}
        </div>

        <div>
          <label htmlFor="reg-confirm-password" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
            Confirm Password *
          </label>
          <input
            id="reg-confirm-password"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            required
            style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: fieldErrors.confirmPassword ? '1px solid #ef4444' : '1px solid #cbd5e1', boxSizing: 'border-box' }}
          />
          {fieldErrors.confirmPassword && <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.25rem' }}>{fieldErrors.confirmPassword}</div>}
        </div>

        <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.85rem', color: '#334155', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              style={{ marginTop: '0.2rem' }}
            />
            <span>
              I agree to the FixMe.com <Link to="/policies" style={{ color: '#2563eb', fontWeight: 600 }}>Terms of Service, Privacy Policy, and Return Rules</Link>.
            </span>
          </label>
          {fieldErrors.acceptTerms && <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.35rem' }}>{fieldErrors.acceptTerms}</div>}
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            background: '#2563eb',
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
          {submitting ? 'Creating Account...' : 'Create Customer Account'}
        </button>
      </form>

      <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.9rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
          Sign in here
        </Link>
      </div>
    </div>
  );
};
