import React from 'react';
import { Link, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { Shield, Layers, Cpu, CheckSquare, Users, FileText, ShoppingBag, AlertCircle, IndianRupee, Store, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getCrossAppUrlForRole } from '../lib/urls';

const ADMIN_ROLES = ['administrator', 'super_administrator', 'catalogue_manager', 'support_staff'];

export const AdminLayout: React.FC = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-sm animate-pulse">
        Restoring administrator session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!ADMIN_ROLES.includes(user.role)) {
    const crossUrl = getCrossAppUrlForRole(user.role);
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
        <div className="max-w-md w-full bg-slate-800 p-6 rounded-xl text-center space-y-4 border border-slate-700 shadow-xl">
          <h2 className="text-xl font-bold text-rose-400">403 — Unauthorized Workspace</h2>
          <p className="text-sm text-slate-300">
            You are signed in as <strong>{user.email}</strong> (<span className="uppercase font-semibold text-amber-300">{user.role}</span>). This operations console requires administrator or staff privileges.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded-lg text-sm font-semibold cursor-pointer"
            >
              Sign Out & Switch Account
            </button>
            {crossUrl && (
              <a
                href={crossUrl}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-semibold text-slate-200"
              >
                Go to {user.role} Workspace
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-100 text-slate-900">
      <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800">
        <div className="p-5 border-b border-slate-800 flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-600 text-white">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white block leading-none">FixMe Admin</span>
            <span className="text-xs text-indigo-300">Governance & Catalogue</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 text-sm font-medium overflow-y-auto">
          <Link
            to="/admin"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 text-white"
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            1. Dashboard Overview
          </Link>
          <Link
            to="/admin/users"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300"
          >
            <Users className="w-4 h-4 text-amber-400" />
            2. User & Seller Mgmt
          </Link>
          <Link
            to="/admin/catalogue"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300"
          >
            <Cpu className="w-4 h-4 text-blue-400" />
            3. Catalogue Engine
          </Link>
          <Link
            to="/admin/moderation"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300"
          >
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            4. Listing Moderation
          </Link>
          <Link
            to="/admin/orders"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300"
          >
            <ShoppingBag className="w-4 h-4 text-sky-400" />
            5. Orders & Payments
          </Link>
          <Link
            to="/admin/disputes"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300"
          >
            <AlertCircle className="w-4 h-4 text-rose-400" />
            6. Disputes & Trust
          </Link>
          <Link
            to="/admin/finance"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300"
          >
            <IndianRupee className="w-4 h-4 text-teal-400" />
            7. Finance & Reports
          </Link>
          <Link
            to="/admin/audit-logs"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300"
          >
            <FileText className="w-4 h-4 text-purple-400" />
            8. Audit Logs & Settings
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <a
            href="http://localhost:5175"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-300"
          >
            <Store className="w-4 h-4" />
            Open Seller Portal (Port 5175)
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-xs font-semibold text-rose-200 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out ({user.fullName.split(' ')[0]})
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
          <h1 className="font-bold text-slate-800">Administrator Control Center</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
              {user.email} ({user.role})
            </span>
          </div>
        </header>
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
