import React from 'react';
import { Link, Outlet, useNavigate, Navigate } from 'react-router-dom';
import {
  Store,
  Package,
  PlusCircle,
  Layers,
  History,
  Truck,
  HelpCircle,
  IndianRupee,
  ShieldCheck,
  Settings,
  LogOut,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getCrossAppUrlForRole } from '../lib/urls';

export const SellerLayout: React.FC = () => {
  const { user, sellerProfile, loading, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-950 text-emerald-100 text-sm animate-pulse">
        Restoring seller session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'seller') {
    const crossUrl = getCrossAppUrlForRole(user.role);
    if (crossUrl) {
      window.location.href = crossUrl;
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white text-sm">
          Redirecting to authorized workspace...
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-100 text-slate-900">
      <aside className="w-64 bg-emerald-950 text-emerald-100 flex flex-col border-r border-emerald-900">
        <div className="p-5 border-b border-emerald-900 flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-600 text-white">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white block leading-none">FixMe Seller Hub</span>
            <span className="text-xs text-emerald-300">Port 5175 Console</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 text-sm font-medium overflow-y-auto">
          <Link
            to="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-900 text-white"
          >
            <Store className="w-4 h-4 text-emerald-400" />
            1. Dashboard
          </Link>
          <Link
            to="/listings"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-900 text-emerald-200"
          >
            <Package className="w-4 h-4 text-emerald-400" />
            2. My Listings
          </Link>
          <Link
            to="/listings/create"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-900 text-emerald-200"
          >
            <PlusCircle className="w-4 h-4 text-lime-400" />
            3. Create Listing
          </Link>
          <Link
            to="/inventory"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-900 text-emerald-200"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            4. Inventory
          </Link>
          <Link
            to="/movements"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-900 text-emerald-200"
          >
            <History className="w-4 h-4 text-teal-400" />
            5. Stock Movements
          </Link>
          <Link
            to="/orders"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-900 text-emerald-200"
          >
            <Truck className="w-4 h-4 text-amber-400" />
            6. Orders
          </Link>
          <Link
            to="/wanted"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-900 text-emerald-200"
          >
            <HelpCircle className="w-4 h-4 text-purple-400" />
            7. Wanted Spare Parts
          </Link>
          <Link
            to="/settlements"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-900 text-emerald-200"
          >
            <IndianRupee className="w-4 h-4 text-yellow-400" />
            8. Settlements
          </Link>
          <Link
            to="/settings"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-900 text-emerald-200"
          >
            <Settings className="w-4 h-4 text-blue-400" />
            9. Store Settings
          </Link>
        </nav>

        <div className="p-4 border-t border-emerald-900">
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-emerald-900 hover:bg-rose-900 text-xs font-semibold text-emerald-100 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign Out ({user.fullName.split(' ')[0]})
            </button>
          ) : (
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
            >
              <LogIn className="w-4 h-4" />
              Seller Sign In
            </Link>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-slate-800">Verified Seller Portal</h1>
            {sellerProfile && (
              <span className="text-xs text-slate-500">
                Store: <strong>{sellerProfile.storeName}</strong> • KYC: <strong className="uppercase">{sellerProfile.status}</strong>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                {user.email} ({user.role})
              </span>
            ) : (
              <Link
                to="/login"
                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold"
              >
                Sign In
              </Link>
            )}
          </div>
        </header>
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
