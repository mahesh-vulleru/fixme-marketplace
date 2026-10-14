import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCrossAppUrlForRole, SELLER_URL } from '../lib/urls';
import { ShieldCheck, Eye, EyeOff, UserPlus, ExternalLink } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { user, register, logout } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role === 'customer') {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const validateFields = (): boolean => {
    const errs: Record<string, string> = {};
    if (fullName.trim().length < 2) {
      errs.fullName = 'Full name must be at least 2 characters long.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }
    if (phone.trim() && (phone.trim().length < 10 || phone.trim().length > 15)) {
      errs.phone = 'Phone number must be between 10 and 15 digits.';
    }
    if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters long.';
    } else if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      errs.password = 'Password must include uppercase, lowercase, and at least one number.';
    }
    if (confirmPassword !== password) {
      errs.confirmPassword = 'Passwords do not match.';
    }
    if (!acceptTerms) {
      errs.acceptTerms = 'You must agree to the Terms of Service and Privacy Policy.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!validateFields()) {
      return;
    }

    setSubmitting(true);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() ? phone.trim() : undefined,
        password,
        confirmPassword,
        acceptTerms,
        role: 'customer',
      });

      setSuccessMessage('Account created successfully! Redirecting to marketplace...');
      setTimeout(() => {
        navigate('/');
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your information and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOutCurrent = async () => {
    try {
      await logout();
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to sign out.');
    }
  };

  const crossWorkspaceUrl = user && user.role !== 'customer' ? getCrossAppUrlForRole(user.role) : null;

  return (
    <div style={{ maxWidth: '500px', margin: '2rem auto', background: '#fff', padding: '2.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#eff6ff', color: '#1d4ed8', padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
          <ShieldCheck style={{ width: '13px', height: '13px' }} />
          CUSTOMER REGISTRATION
        </span>
        <h1 style={{ margin: '0.6rem 0 0.25rem', fontSize: '1.65rem', color: '#0f172a', fontWeight: 800 }}>
          Create your account
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem' }}>
          Join FixMe to purchase verified spare parts, request rare components, and track shipments.
        </p>
      </div>

      {user && user.role !== 'customer' && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            Currently signed in as <strong>{user.email}</strong> (<span style={{ textTransform: 'uppercase', fontWeight: 700 }}>{user.role}</span>).
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleSignOutCurrent}
              style={{ background: '#fef3c7', border: '1px solid #fcd34d', color: '#78350f', padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Sign Out
            </button>
            {crossWorkspaceUrl && (
              <a
                href={crossWorkspaceUrl}
                style={{ background: '#fff', border: '1px solid #cbd5e1', color: '#1e293b', padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none' }}
              >
                Go to {user.role} Portal &rarr;
              </a>
            )}
          </div>
        </div>
      )}

      {error && (
        <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
          {error}
        </div>
      )}

      {successMessage && (
        <div role="status" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '0.85rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label htmlFor="reg-fullname" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
            Full Name <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            id="reg-fullname"
            type="text"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: '' }));
            }}
            placeholder="John Doe"
            required
            autoComplete="name"
            style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: `1px solid ${fieldErrors.fullName ? '#ef4444' : '#cbd5e1'}`, fontSize: '0.9rem', boxSizing: 'border-box' }}
          />
          {fieldErrors.fullName && (
            <p style={{ margin: '0.25rem 0 0', color: '#ef4444', fontSize: '0.78rem' }}>{fieldErrors.fullName}</p>
          )}
        </div>

        <div>
          <label htmlFor="reg-email" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
            Email Address <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
            }}
            placeholder="you@example.com"
            required
            autoComplete="email"
            style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: `1px solid ${fieldErrors.email ? '#ef4444' : '#cbd5e1'}`, fontSize: '0.9rem', boxSizing: 'border-box' }}
          />
          {fieldErrors.email && (
            <p style={{ margin: '0.25rem 0 0', color: '#ef4444', fontSize: '0.78rem' }}>{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="reg-phone" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
            Phone Number <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>(Optional, 10 digits)</span>
          </label>
          <input
            id="reg-phone"
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: '' }));
            }}
            placeholder="9876543210"
            autoComplete="tel"
            style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: `1px solid ${fieldErrors.phone ? '#ef4444' : '#cbd5e1'}`, fontSize: '0.9rem', boxSizing: 'border-box' }}
          />
          {fieldErrors.phone && (
            <p style={{ margin: '0.25rem 0 0', color: '#ef4444', fontSize: '0.78rem' }}>{fieldErrors.phone}</p>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <label htmlFor="reg-password" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
              Password <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'none', border: 'none', color: '#2563eb', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              {showPassword ? <EyeOff style={{ width: '14px', height: '14px' }} /> : <Eye style={{ width: '14px', height: '14px' }} />}
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
            }}
            placeholder="Create a strong password"
            required
            autoComplete="new-password"
            style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: `1px solid ${fieldErrors.password ? '#ef4444' : '#cbd5e1'}`, fontSize: '0.9rem', boxSizing: 'border-box' }}
          />
          {fieldErrors.password ? (
            <p style={{ margin: '0.25rem 0 0', color: '#ef4444', fontSize: '0.78rem' }}>{fieldErrors.password}</p>
          ) : (
            <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.75rem' }}>
              Minimum 8 characters with at least 1 uppercase letter, 1 lowercase letter, and 1 number.
            </p>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <label htmlFor="reg-confirmpassword" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
              Confirm Password <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'none', border: 'none', color: '#2563eb', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
            >
              {showConfirmPassword ? <EyeOff style={{ width: '14px', height: '14px' }} /> : <Eye style={{ width: '14px', height: '14px' }} />}
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <input
            id="reg-confirmpassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
            }}
            placeholder="Confirm your password"
            required
            autoComplete="new-password"
            style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: `1px solid ${fieldErrors.confirmPassword ? '#ef4444' : '#cbd5e1'}`, fontSize: '0.9rem', boxSizing: 'border-box' }}
          />
          {fieldErrors.confirmPassword && (
            <p style={{ margin: '0.25rem 0 0', color: '#ef4444', fontSize: '0.78rem' }}>{fieldErrors.confirmPassword}</p>
          )}
        </div>

        <div style={{ marginTop: '0.25rem' }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#334155' }}>
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(e) => {
                setAcceptTerms(e.target.checked);
                if (fieldErrors.acceptTerms) setFieldErrors((prev) => ({ ...prev, acceptTerms: '' }));
              }}
              style={{ marginTop: '0.15rem' }}
            />
            <span>
              I agree to the FixMe <span style={{ color: '#2563eb', fontWeight: 600 }}>Terms of Service</span> and <span style={{ color: '#2563eb', fontWeight: 600 }}>Privacy Policy</span>.
            </span>
          </label>
          {fieldErrors.acceptTerms && (
            <p style={{ margin: '0.25rem 0 0', color: '#ef4444', fontSize: '0.78rem' }}>{fieldErrors.acceptTerms}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            background: '#0f172a',
            color: '#fff',
            border: 'none',
            padding: '0.8rem 1.25rem',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1,
            transition: 'background 0.2s',
            marginTop: '0.5rem',
          }}
        >
          <UserPlus style={{ width: '16px', height: '16px' }} />
          {submitting ? 'Creating account...' : 'Create Customer Account'}
        </button>
      </form>

      <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>
          Sign in
        </Link>
      </div>

      <div style={{ marginTop: '1rem', padding: '0.85rem', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center', fontSize: '0.82rem', color: '#64748b' }}>
        <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>Are you an electronics spare parts seller or distributor?</div>
        <div>
          Sell parts on FixMe with verified inventory and buyer protection.{' '}
          <a
            href={`${SELLER_URL}/register`}
            style={{ color: '#059669', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
          >
            Create Seller Account <ExternalLink style={{ width: '11px', height: '11px' }} />
          </a>
        </div>
      </div>
    </div>
  );
};
export default RegisterPage;
