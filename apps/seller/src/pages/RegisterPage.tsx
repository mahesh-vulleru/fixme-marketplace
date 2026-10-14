import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CLIENT_URL, getCrossAppUrlForRole } from '../lib/urls';
import { ShieldCheck, Eye, EyeOff, Store, UserPlus, ExternalLink, AlertCircle } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { user, register, logout } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
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
    if (user && user.role === 'seller') {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const validateFields = (): boolean => {
    const errs: Record<string, string> = {};
    if (fullName.trim().length < 2) {
      errs.fullName = 'Full name must be at least 2 characters long.';
    }
    if (storeName.trim().length < 3) {
      errs.storeName = 'Store or trade name must be at least 3 characters.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid business email address.';
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
    if (businessAddress.trim() && businessAddress.trim().length < 5) {
      errs.businessAddress = 'Business address must be at least 5 characters.';
    }
    if (!acceptTerms) {
      errs.acceptTerms = 'You must agree to the Seller Terms of Service and Merchant Guidelines.';
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
        storeName: storeName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() ? phone.trim() : undefined,
        businessAddress: businessAddress.trim() ? businessAddress.trim() : undefined,
        password,
        confirmPassword,
        acceptTerms,
      });

      setSuccessMessage('Seller account created! Redirecting to Seller Hub dashboard...');
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 900);
    } catch (err: any) {
      setError(err.message || 'Seller registration failed. Please verify your details.');
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

  const crossWorkspaceUrl = user && user.role !== 'seller' ? getCrossAppUrlForRole(user.role) : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-950 p-4 py-8">
      <div className="max-w-lg w-full bg-white rounded-xl p-8 shadow-xl border border-slate-200">
        <div className="mb-6">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
            <Store className="w-3.5 h-3.5" />
            FixMe.com Seller Portal
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-3">Register as a Verified Seller</h1>
          <p className="text-sm text-slate-600 mt-1">
            Create your merchant account to list replacement electronics parts, manage inventory, and fulfill customer requests.
          </p>
        </div>

        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <strong>Merchant Verification Notice:</strong> Newly registered seller accounts start in <em>Pending Verification</em> status. You can configure your store profile immediately; active inventory publishing and wanted offers unlock upon administrator review.
          </div>
        </div>

        {user && user.role !== 'seller' && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-2">
            <div>
              Currently authenticated as <strong>{user.email}</strong> (<span className="uppercase font-semibold">{user.role}</span>).
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSignOutCurrent}
                className="px-2.5 py-1 rounded bg-amber-200 hover:bg-amber-300 font-semibold cursor-pointer"
              >
                Sign Out Current Session
              </button>
              {crossWorkspaceUrl && (
                <a
                  href={crossWorkspaceUrl}
                  className="px-2.5 py-1 rounded bg-white border border-amber-300 font-semibold text-amber-900"
                >
                  Return to Workspace
                </a>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Store / Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => {
                setStoreName(e.target.value);
                if (fieldErrors.storeName) setFieldErrors((prev) => ({ ...prev, storeName: '' }));
              }}
              required
              placeholder="e.g. Apex Circuit & Spares Hub"
              className={`w-full px-3 py-2 rounded-lg border text-sm ${fieldErrors.storeName ? 'border-red-500' : 'border-slate-300'}`}
            />
            {fieldErrors.storeName && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.storeName}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contact Person / Owner Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (fieldErrors.fullName) setFieldErrors((prev) => ({ ...prev, fullName: '' }));
              }}
              required
              placeholder="e.g. Johnathan Spares"
              autoComplete="name"
              className={`w-full px-3 py-2 rounded-lg border text-sm ${fieldErrors.fullName ? 'border-red-500' : 'border-slate-300'}`}
            />
            {fieldErrors.fullName && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.fullName}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Business Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
              }}
              required
              placeholder="merchant@example.com"
              autoComplete="email"
              className={`w-full px-3 py-2 rounded-lg border text-sm ${fieldErrors.email ? 'border-red-500' : 'border-slate-300'}`}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contact Phone <span className="text-xs font-normal text-slate-500">(Optional, 10 digits)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: '' }));
              }}
              placeholder="9876543210"
              autoComplete="tel"
              className={`w-full px-3 py-2 rounded-lg border text-sm ${fieldErrors.phone ? 'border-red-500' : 'border-slate-300'}`}
            />
            {fieldErrors.phone && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Warehouse / Business Address <span className="text-xs font-normal text-slate-500">(Optional)</span>
            </label>
            <input
              type="text"
              value={businessAddress}
              onChange={(e) => {
                setBusinessAddress(e.target.value);
                if (fieldErrors.businessAddress) setFieldErrors((prev) => ({ ...prev, businessAddress: '' }));
              }}
              placeholder="Suite 400, Industrial Area, Bangalore 560001"
              className={`w-full px-3 py-2 rounded-lg border text-sm ${fieldErrors.businessAddress ? 'border-red-500' : 'border-slate-300'}`}
            />
            {fieldErrors.businessAddress && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.businessAddress}</p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Password <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-xs font-semibold text-emerald-700 flex items-center gap-1"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
              }}
              required
              placeholder="Create seller password"
              autoComplete="new-password"
              className={`w-full px-3 py-2 rounded-lg border text-sm ${fieldErrors.password ? 'border-red-500' : 'border-slate-300'}`}
            />
            {fieldErrors.password ? (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                Minimum 8 characters with at least 1 uppercase letter, 1 lowercase letter, and 1 number.
              </p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="text-xs font-semibold text-emerald-700 flex items-center gap-1"
              >
                {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
              }}
              required
              placeholder="Confirm seller password"
              autoComplete="new-password"
              className={`w-full px-3 py-2 rounded-lg border text-sm ${fieldErrors.confirmPassword ? 'border-red-500' : 'border-slate-300'}`}
            />
            {fieldErrors.confirmPassword && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          <div className="pt-1">
            <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-700">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => {
                  setAcceptTerms(e.target.checked);
                  if (fieldErrors.acceptTerms) setFieldErrors((prev) => ({ ...prev, acceptTerms: '' }));
                }}
                className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>
                I agree to the FixMe <span className="text-emerald-700 font-semibold">Seller Terms of Service</span>, <span className="text-emerald-700 font-semibold">Quality Standards</span>, and <span className="text-emerald-700 font-semibold">Return & Replacement Obligations</span>.
              </span>
            </label>
            {fieldErrors.acceptTerms && (
              <p className="mt-1 text-xs text-red-500">{fieldErrors.acceptTerms}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold text-sm cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            <UserPlus className="w-4 h-4" />
            {submitting ? 'Registering Seller Account...' : 'Complete Seller Registration'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600 border-t border-slate-100 pt-4">
          Already registered as a FixMe seller?{' '}
          <Link to="/login" className="text-emerald-700 font-semibold hover:underline">
            Sign In here
          </Link>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-center text-xs text-slate-600">
          Looking to purchase spare parts as a customer?{' '}
          <a
            href={CLIENT_URL}
            className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1"
          >
            FixMe Customer Marketplace <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
export default RegisterPage;

