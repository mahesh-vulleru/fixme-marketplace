import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CLIENT_URL, getCrossAppUrlForRole } from '../lib/urls';
import { ShieldCheck, Eye, EyeOff, LogIn, ExternalLink, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role === 'seller') {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please provide both your registered seller email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const loggedIn = await login(email.trim().toLowerCase(), password);
      if (loggedIn.role !== 'seller') {
        const crossUrl = getCrossAppUrlForRole(loggedIn.role);
        if (crossUrl) {
          window.location.href = crossUrl;
          return;
        }
      }
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please verify your credentials.');
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
    <div className="min-h-screen flex items-center justify-center bg-emerald-950 p-4">
      <div className="max-w-md w-full bg-white rounded-xl p-8 shadow-xl border border-slate-200">
        <div className="mb-6">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            FixMe.com Seller Hub
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-3">Seller Portal Sign In</h1>
          <p className="text-sm text-slate-600 mt-1">
            Sign in to manage your spare parts listings, inventory movements, order shipments, and wanted-part offers.
          </p>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Seller Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="vendor@fixme.com"
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
                className="text-xs font-semibold text-emerald-700 flex items-center gap-1"
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
              placeholder="Enter your password"
              autoComplete="current-password"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div className="flex justify-end">
            <a
              href={`${CLIENT_URL}/forgot-password`}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold text-sm cursor-pointer flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            {submitting ? 'Signing in...' : 'Sign In to Seller Hub'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600 border-t border-slate-100 pt-4">
          New electronics merchant?{' '}
          <Link to="/register" className="text-emerald-700 font-semibold hover:underline">
            Register a Seller Account
          </Link>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-center text-xs text-slate-600">
          Looking to purchase parts as a customer?{' '}
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
export default LoginPage;
