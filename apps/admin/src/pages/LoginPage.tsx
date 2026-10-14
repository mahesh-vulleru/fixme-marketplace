import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CLIENT_URL, SELLER_URL, getCrossAppUrlForRole } from '../lib/urls';
import { ShieldAlert, ShieldCheck, Eye, EyeOff, LogIn, ExternalLink } from 'lucide-react';

const ADMIN_ROLES = ['administrator', 'super_administrator', 'catalogue_manager', 'support_staff'];

export const LoginPage: React.FC = () => {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && ADMIN_ROLES.includes(user.role)) {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const loggedIn = await login(email.trim().toLowerCase(), password);
      if (ADMIN_ROLES.includes(loggedIn.role)) {
        navigate('/admin', { replace: true });
      } else {
        const crossUrl = getCrossAppUrlForRole(loggedIn.role);
        if (crossUrl) {
          window.location.href = crossUrl;
          return;
        }
        setError(`Your account has role '${loggedIn.role}' which does not have administrative dashboard access.`);
      }
    } catch (err: any) {
      setError(err.message || 'Staff portal authentication failed.');
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

  const crossWorkspaceUrl = user ? getCrossAppUrlForRole(user.role) : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-md w-full bg-white rounded-xl p-8 shadow-xl border border-slate-200">
        <div className="mb-6">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            FixMe.com Operations Console
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-3">Staff & Admin Sign In</h1>
          <p className="text-sm text-slate-600 mt-1">
            Restricted access for System Administrators, Catalogue Managers, and Moderation Staff.
          </p>
        </div>

        <div className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <strong>Public Registration Prohibited:</strong> Admin and staff credentials cannot be created through public self-registration. All staff accounts must be provisioned by super-administrators or initialized via secure deployment scripts.
          </div>
        </div>

        {user && !ADMIN_ROLES.includes(user.role) && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-2">
            <div>
              Currently authenticated as <strong>{user.email}</strong> (<span className="uppercase font-semibold">{user.role}</span>). This role cannot access operations console.
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
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@fixme.com"
              autoComplete="email"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700">Password</label>
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-xs font-semibold text-indigo-600 flex items-center gap-1"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your administrative password"
              autoComplete="current-password"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold text-sm cursor-pointer flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            {submitting ? 'Authenticating...' : 'Sign In to Workspace'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2 text-center text-xs text-slate-500">
          <div>Looking for customer marketplace or seller portal?</div>
          <div className="flex justify-center gap-4">
            <a href={CLIENT_URL} className="text-blue-600 hover:underline inline-flex items-center gap-1 font-medium">
              Customer Store <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-300">|</span>
            <a href={SELLER_URL} className="text-emerald-700 hover:underline inline-flex items-center gap-1 font-medium">
              Seller Hub <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;
