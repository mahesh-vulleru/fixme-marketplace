import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCrossAppUrlForRole } from '../lib/urls';

const ADMIN_ROLES = ['administrator', 'super_administrator', 'catalogue_manager', 'support_staff'];

export const LoginPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      if (ADMIN_ROLES.includes(user.role)) {
        navigate('/admin', { replace: true });
      } else {
        const crossUrl = getCrossAppUrlForRole(user.role);
        if (crossUrl) {
          window.location.href = crossUrl;
        }
      }
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
        navigate('/admin', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Portal sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="max-w-md w-full bg-white rounded-xl p-8 shadow-xl border border-slate-200">
        <div className="mb-6">
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">
            FixMe.com Operations Console
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-3">Staff & Seller Sign In</h1>
          <p className="text-sm text-slate-600 mt-1">
            Role-based access for Admins, Catalogue Managers, Support/Moderation, Finance, and Verified Sellers.
          </p>
        </div>

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
              placeholder="admin@fixme.com or vendor@fixme.com"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-700">Password</label>
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-xs font-semibold text-indigo-600"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm cursor-pointer"
          >
            {submitting ? 'Authenticating...' : 'Sign In to Workspace'}
          </button>
        </form>
      </div>
    </div>
  );
};

