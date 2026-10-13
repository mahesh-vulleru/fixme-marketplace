import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SELLER_URL } from '../lib/urls';
import { User, Store, ShieldCheck } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [category, setCategory] = useState<'customer' | 'seller'>('customer');
  const [fullName, setFullName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
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
    if (category === 'seller' && storeName.trim().length < 2) {
      errs.storeName = 'Store or business name is required for seller registration.';
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
      const createdUser = await register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
        phone: phone.trim() || undefined,
        acceptTerms,
        role: category,
        storeName: category === 'seller' ? storeName.trim() : undefined,
        businessAddress: category === 'seller' ? businessAddress.trim() : undefined,
      });

      if (createdUser.role === 'seller') {
        setSuccessMessage('Seller account created! Redirecting to Seller Hub (Port 5175)...');
        setTimeout(() => {
          window.location.href = SELLER_URL;
        }, 900);
      } else {
        setSuccessMessage('Client account created! Redirecting to marketplace...');
        setTimeout(() => navigate('/'), 900);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please verify your details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '540px', margin: '1.5rem auto', background: '#fff', padding: '2rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <span style={{
          background: category === 'seller' ? '#ecfdf5' : '#eff6ff',
          color: category === 'seller' ? '#047857' : '#1d4ed8',
          padding: '0.25rem 0.65rem',
          borderRadius: '999px',
          fontSize: '0.75rem',
          fontWeight: 700
        }}>
          {category === 'seller' ? 'VERIFIED SELLER REGISTRATION' : 'CLIENT / BUYER REGISTRATION'}
        </span>
        <h1 style={{ margin: '0.6rem 0 0.25rem', fontSize: '1.65rem', color: '#0f172a' }}>
          Create your FixMe account
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.92rem' }}>
          {category === 'seller'
            ? 'Register as an electronics spare-parts vendor to list stock and fulfill orders.'
            : 'Track orders, verify part compatibility, and submit wanted-part requests.'}
        </p>
      </div>

      {/* Account Category Selector */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
          Select Account Category *
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => setCategory('customer')}
            style={{
              padding: '0.85rem 0.75rem',
              borderRadius: '10px',
              border: category === 'customer' ? '2px solid #2563eb' : '1px solid #cbd5e1',
              background: category === 'customer' ? '#eff6ff' : '#f8fafc',
              color: category === 'customer' ? '#1e40af' : '#475569',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.9rem' }}>
              <User style={{ width: '16px', height: '16px' }} />
              Client (Buyer)
            </div>
            <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>
              Buy parts, verify fit & manage repairs
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCategory('seller')}
            style={{
              padding: '0.85rem 0.75rem',
              borderRadius: '10px',
              border: category === 'seller' ? '2px solid #059669' : '1px solid #cbd5e1',
              background: category === 'seller' ? '#ecfdf5' : '#f8fafc',
              color: category === 'seller' ? '#065f46' : '#475569',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.9rem' }}>
              <Store style={{ width: '16px', height: '16px' }} />
              Seller (Vendor)
            </div>
            <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>
              Sell spare parts & receive payouts
            </span>
          </button>
        </div>
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
        {category === 'seller' && (
          <>
            <div>
              <label htmlFor="reg-storename" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Store / Business Name *
              </label>
              <input
                id="reg-storename"
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="e.g. Apex Electronics & Spares"
                required
                style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: fieldErrors.storeName ? '1px solid #ef4444' : '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
              {fieldErrors.storeName && <div style={{ color: '#dc2626', fontSize: '0.8rem', marginTop: '0.25rem' }}>{fieldErrors.storeName}</div>}
            </div>

            <div>
              <label htmlFor="reg-address" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Business Address (City / Market)
              </label>
              <input
                id="reg-address"
                type="text"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder="e.g. Shop 12, Nehru Place, New Delhi"
                style={{ width: '100%', padding: '0.65rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              />
            </div>
          </>
        )}

        <div>
          <label htmlFor="reg-fullname" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
            {category === 'seller' ? 'Authorized Representative / Contact Name *' : 'Full Name *'}
          </label>
          <input
            id="reg-fullname"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={category === 'seller' ? 'e.g. Rajesh Kumar' : 'Alex Rivera'}
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
            background: category === 'seller' ? '#059669' : '#2563eb',
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
          {submitting
            ? 'Creating Account...'
            : category === 'seller'
            ? 'Register as Spare-Parts Seller'
            : 'Register Client Account'}
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

