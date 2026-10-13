import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Wrench, ShieldCheck, Cpu, ShoppingCart, Search, User, LogOut, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const CustomerLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600 text-white">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">FixMe.com</span>
              <span className="hidden md:inline-block ml-2 text-xs text-blue-300 font-medium">
                Find the Part. Fix the Device.
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-4 sm:gap-5 text-sm font-medium text-slate-200 flex-wrap">
            <Link to="/" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span>Catalogue</span>
            </Link>
            <Link to="/compatibility" className="hover:text-white transition-colors flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Compatibility</span>
            </Link>
            <Link to="/wanted" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Search className="w-4 h-4 text-amber-400" />
              <span>Wanted Parts</span>
            </Link>
            <Link to="/policies" className="hover:text-white transition-colors flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Policies</span>
            </Link>
            <Link
              to="/cart"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-2 border border-slate-700"
            >
              <ShoppingCart className="w-4 h-4 text-blue-400" />
              <span>Cart</span>
            </Link>

            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/account"
                  className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 flex items-center gap-1.5 border border-blue-500/30"
                >
                  <User className="w-4 h-4" />
                  <span>{user.fullName.split(' ')[0]}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/40 text-slate-300 hover:text-red-200 border border-slate-700 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  Register
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div>
            <p className="font-semibold text-white">FixMe.com — Multi-Vendor Electronics Spare-Parts Marketplace</p>
            <p className="mt-1">Structured device-part compatibility verification & integer-paise commerce engine.</p>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/policies" className="text-blue-400 hover:underline">
              Terms, Privacy & Return Policy
            </Link>
            <span>•</span>
            <span>INR (Paise Precision)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
