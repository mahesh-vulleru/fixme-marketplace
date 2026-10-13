import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Store, Package, Truck, IndianRupee, HelpCircle, Shield } from 'lucide-react';

export const SellerLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex bg-slate-100 text-slate-900">
      <aside className="w-64 bg-emerald-950 text-emerald-100 flex flex-col border-r border-emerald-900">
        <div className="p-5 border-b border-emerald-900 flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-600 text-white">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white block leading-none">FixMe Seller Hub</span>
            <span className="text-xs text-emerald-300">Vendor Operations</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 text-sm font-medium">
          <Link
            to="/seller"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-900 text-white"
          >
            <Store className="w-4 h-4 text-emerald-400" />
            Seller Dashboard
          </Link>
          <Link
            to="/seller/listings"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-900 text-emerald-200"
          >
            <Package className="w-4 h-4 text-emerald-400" />
            Listings & Inventory
          </Link>
          <Link
            to="/seller/orders"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-900 text-emerald-200"
          >
            <Truck className="w-4 h-4 text-amber-400" />
            Suborders & Shipments
          </Link>
          <Link
            to="/seller/settlements"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-900 text-emerald-200"
          >
            <IndianRupee className="w-4 h-4 text-blue-400" />
            Settlements & Payouts
          </Link>
          <Link
            to="/seller/wanted"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-900 text-emerald-200"
          >
            <HelpCircle className="w-4 h-4 text-purple-400" />
            Wanted Part Requests
          </Link>
        </nav>

        <div className="p-4 border-t border-emerald-900">
          <Link
            to="/admin"
            className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg bg-emerald-900 hover:bg-emerald-800 text-xs font-semibold text-indigo-200"
          >
            <Shield className="w-4 h-4" />
            Switch to Admin Portal
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between">
          <h1 className="font-bold text-slate-800">Verified Seller Portal</h1>
          <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
            Seller Workspace
          </span>
        </header>
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

