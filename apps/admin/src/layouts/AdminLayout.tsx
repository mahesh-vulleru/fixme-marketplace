import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Shield, Layers, Cpu, CheckSquare, Users, FileText, Store } from 'lucide-react';

export const AdminLayout: React.FC = () => {
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

        <nav className="flex-1 p-4 space-y-1.5 text-sm font-medium">
          <Link
            to="/admin"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 text-white"
          >
            <Layers className="w-4 h-4 text-indigo-400" />
            Admin Overview
          </Link>
          <Link
            to="/admin/catalogue"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300"
          >
            <Cpu className="w-4 h-4 text-blue-400" />
            Catalogue & Compatibility
          </Link>
          <Link
            to="/admin/moderation"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300"
          >
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            Seller & Listing Queue
          </Link>
          <Link
            to="/admin/users"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300"
          >
            <Users className="w-4 h-4 text-amber-400" />
            Roles & Disputes
          </Link>
          <Link
            to="/admin/audit-logs"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300"
          >
            <FileText className="w-4 h-4 text-purple-400" />
            Audit Logs
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <Link
            to="/seller"
            className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-300"
          >
            <Store className="w-4 h-4" />
            Switch to Seller Portal
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
          <h1 className="font-bold text-slate-800">Administrator Control Center</h1>
          <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
            Admin Workspace
          </span>
        </header>
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

