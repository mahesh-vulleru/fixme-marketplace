import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import {
  Package,
  Layers,
  IndianRupee,
  AlertTriangle,
  Clock,
  PlusCircle,
  Truck,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  FileText,
} from 'lucide-react';

export interface DashboardSummary {
  totalListings: number;
  activeListings: number;
  pendingListings: number;
  pausedListings: number;
  outOfStockListings: number;
  lowStockListings: number;
  totalSellableStock: number;
  totalInventoryValuePaise: number;
  recentMovements: any[];
}

export const SellerDashboardPage: React.FC = () => {
  const { user, sellerProfile } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);
  const [recentListings, setRecentListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumData, ordersData, listingsData] = await Promise.all([
        apiRequest<DashboardSummary>('/seller/inventory/summary').catch(() => null),
        apiRequest<any[]>('/seller/orders').catch(() => []),
        apiRequest<any>('/seller/listings?limit=5').catch(() => []),
      ]);

      if (sumData) {
        setSummary(sumData);
      } else {
        // Fallback aggregation
        const list = Array.isArray(listingsData)
          ? listingsData
          : listingsData?.listings || [];
        const total = list.length;
        const active = list.filter((l: any) => l.status === 'active').length;
        const pending = list.filter((l: any) => l.status === 'pending_review').length;
        const paused = list.filter((l: any) => l.status === 'paused' || l.status === 'rejected').length;
        const outOfStock = list.filter((l: any) => (l.stockAvailable ?? 0) === 0).length;
        const lowStock = list.filter(
          (l: any) => (l.stockAvailable ?? 0) > 0 && (l.stockAvailable ?? 0) <= (l.lowStockThreshold ?? 5)
        ).length;
        const sellable = list.reduce(
          (acc: number, l: any) => (l.status === 'active' ? acc + (l.stockAvailable ?? 0) : acc),
          0
        );
        const val = list.reduce(
          (acc: number, l: any) => acc + (l.pricePaise ?? 0) * (l.stockAvailable ?? 0),
          0
        );

        setSummary({
          totalListings: total,
          activeListings: active,
          pendingListings: pending,
          pausedListings: paused,
          outOfStockListings: outOfStock,
          lowStockListings: lowStock,
          totalSellableStock: sellable,
          totalInventoryValuePaise: val,
          recentMovements: [],
        });
      }

      // Compute pending orders
      const orders = Array.isArray(ordersData) ? ordersData : [];
      const pendingOrders = orders.filter((o) =>
        ['paid', 'confirmed', 'processing'].includes(o.status)
      );
      setPendingOrdersCount(pendingOrders.length);

      // Recent listings
      const listArray = Array.isArray(listingsData)
        ? listingsData
        : listingsData?.listings || [];
      setRecentListings(listArray.slice(0, 5));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const totalValueRupees = ((summary?.totalInventoryValuePaise || 0) / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 rounded-lg bg-white/10 backdrop-blur-sm">
              <Package className="w-6 h-6 text-emerald-400" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Seller Command Center
            </h1>
          </div>
          <p className="text-emerald-200 text-sm sm:text-base max-w-2xl">
            Store: <strong className="text-white">{sellerProfile?.storeName || 'FixMe Verified Merchant'}</strong> • KYC Status: <strong className="uppercase text-emerald-300">{sellerProfile?.status || 'Pending'}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {sellerProfile?.status === 'approved' ? (
            <Link
              to="/listings/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold shadow transition"
            >
              <PlusCircle className="w-4 h-4" />
              Create Listing
            </Link>
          ) : (
            <Link
              to="/verification"
              title="Verification required to create listings"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/80 hover:bg-amber-500 text-white text-xs font-bold shadow transition"
            >
              <ShieldAlert className="w-4 h-4" />
              Verification Required
            </Link>
          )}
          <Link
            to="/inventory"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm transition"
          >
            <Layers className="w-4 h-4" />
            Manage Inventory
          </Link>
        </div>
      </div>

      {sellerProfile?.status !== 'approved' && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 shadow-sm flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold">Seller Verification Pending</h2>
              <p className="text-xs text-amber-800 mt-1">
                Your merchant account status is <strong>{sellerProfile?.status || 'pending'}</strong>. To safeguard marketplace buyers, creating new listings and submitting offers on wanted parts are restricted until your KYC business documents are verified by administrators.
              </p>
            </div>
          </div>
          <Link
            to="/verification"
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0"
          >
            Review KYC Documents
          </Link>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Low Stock Warning Banner */}
      {summary && summary.lowStockListings > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold text-sm">
                Attention: {summary.lowStockListings} listing(s) at or below low-stock threshold!
              </span>
              <p className="text-xs text-amber-700 mt-0.5">
                Replenish units now to prevent inventory stockouts and maintain fast dispatch fulfillment ratings.
              </p>
            </div>
          </div>
          <Link
            to="/inventory"
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shrink-0 transition"
          >
            Review Low Stock
          </Link>
        </div>
      )}

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Listings */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Total Listings</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {loading ? '...' : summary?.totalListings || 0}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="text-emerald-700 font-semibold">{summary?.activeListings || 0} Active</span>
            <span>•</span>
            <span className="text-amber-700 font-semibold">{summary?.pendingListings || 0} In Review</span>
          </div>
        </div>

        {/* Sellable Stock Units */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Sellable Stock</span>
            <Layers className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {loading ? '...' : `${summary?.totalSellableStock || 0} pcs`}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="text-rose-700 font-semibold">{summary?.outOfStockListings || 0} Out of Stock</span>
          </div>
        </div>

        {/* Authoritative Inventory Valuation */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Total Inventory Value</span>
            <IndianRupee className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {loading ? '...' : `₹${totalValueRupees}`}
          </div>
          <p className="text-[11px] text-slate-500">
            Calculated: Sum(Price per Piece × On-Hand Stock)
          </p>
        </div>

        {/* Pending Orders */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Pending Orders</span>
            <Truck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {loading ? '...' : pendingOrdersCount}
          </div>
          <Link
            to="/orders"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            <span>Fulfill orders</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* TWO COLUMN SECTION: Recent Listings & Recent Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Recent Listings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" />
              Recent Spare-Part Listings
            </h3>
            <Link
              to="/listings"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              View All ({summary?.totalListings || 0}) →
            </Link>
          </div>

          {recentListings.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No listings published yet.{' '}
              <Link to="/listings/create" className="text-emerald-700 font-semibold underline">
                Create your first listing
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentListings.map((item) => (
                <div
                  key={item._id}
                  className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <h4 className="font-bold text-slate-900">{item.title}</h4>
                    <p className="text-slate-500 mt-0.5">
                      Condition: <strong className="capitalize">{item.condition}</strong> • Stock:{' '}
                      <strong className="text-slate-800">{item.stockAvailable} units</strong> • Price:{' '}
                      <strong className="font-mono text-slate-900">
                        ₹{(item.pricePaise / 100).toFixed(2)}
                      </strong>
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase shrink-0 ${
                      item.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : item.status === 'pending_review'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.status?.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Recent Stock Movements */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-600" />
              Recent Inventory Movements
            </h3>
            <Link
              to="/movements"
              className="text-xs font-semibold text-cyan-700 hover:text-cyan-800"
            >
              Full Ledger →
            </Link>
          </div>

          {summary?.recentMovements?.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No inventory movement audit logs recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {(summary?.recentMovements || []).slice(0, 5).map((m: any) => {
                const title =
                  typeof m.listingId === 'object' && m.listingId !== null
                    ? m.listingId.title
                    : `Listing #${String(m.listingId).slice(-6)}`;

                return (
                  <div
                    key={m._id}
                    className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{m.reason}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded ${
                          m.quantityDelta > 0
                            ? 'bg-emerald-50 text-emerald-700'
                            : m.quantityDelta < 0
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Now: {m.newAvailable}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
