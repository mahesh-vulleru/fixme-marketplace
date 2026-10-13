import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../../services/apiClient';
import {
  Package,
  PlusCircle,
  Search,
  Filter,
  Layers,
  Edit2,
  PauseCircle,
  PlayCircle,
  Archive,
  AlertTriangle,
  Clock,
  ArrowUpDown,
  History,
  X,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
} from 'lucide-react';

export interface ListingItem {
  _id: string;
  partId?: {
    _id: string;
    name: string;
    partNumber: string;
    componentType: string;
    brandId?: { name: string };
  };
  sellerId: string;
  sellerSku?: string;
  title: string;
  description?: string;
  condition: 'new' | 'refurbished' | 'used' | 'for_parts';
  pricePaise: number;
  stockAvailable: number;
  stockReserved: number;
  lowStockThreshold: number;
  warrantyDays: number;
  shippingFeePaise: number;
  dispatchLeadTimeDays: number;
  status: 'draft' | 'pending_review' | 'active' | 'rejected' | 'paused' | 'out_of_stock' | 'archived';
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export const SellerListingsPage: React.FC = () => {
  const navigate = useNavigate();

  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [outOfStockOnly, setOutOfStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc'>('newest');

  // Modals
  const [editingListing, setEditingListing] = useState<ListingItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    sellerSku: '',
    priceRupees: '',
    warrantyDays: '30',
    lowStockThreshold: '5',
    shippingFeeRupees: '0',
    dispatchLeadTimeDays: '2',
    description: '',
  });

  const [adjustingListing, setAdjustingListing] = useState<ListingItem | null>(null);
  const [adjustmentForm, setAdjustmentForm] = useState({
    movementType: 'restock' as 'restock' | 'damaged' | 'lost' | 'manual_adjustment',
    adjustmentUnits: '5',
    newExactCount: '',
    reason: 'Vendor warehouse replenishment',
    reference: '',
    notes: '',
  });

  const [actionInProgress, setActionInProgress] = useState(false);

  const loadListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<any>('/seller/listings');
      const list = Array.isArray(data) ? data : data?.listings || [];
      setListings(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load seller listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  // Filtered and Sorted Listings
  const processedListings = useMemo(() => {
    let result = [...listings];

    if (statusFilter) {
      result = result.filter((l) => l.status === statusFilter);
    }
    if (conditionFilter) {
      result = result.filter((l) => l.condition === conditionFilter);
    }
    if (lowStockOnly) {
      result = result.filter(
        (l) => l.stockAvailable > 0 && l.stockAvailable <= (l.lowStockThreshold ?? 5)
      );
    }
    if (outOfStockOnly) {
      result = result.filter((l) => l.stockAvailable === 0);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.sellerSku?.toLowerCase().includes(q) ||
          l.partId?.name?.toLowerCase().includes(q) ||
          l.partId?.partNumber?.toLowerCase().includes(q) ||
          l.partId?.brandId?.name?.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return a.pricePaise - b.pricePaise;
        case 'price_desc':
          return b.pricePaise - a.pricePaise;
        case 'stock_asc':
          return a.stockAvailable - b.stockAvailable;
        case 'stock_desc':
          return b.stockAvailable - a.stockAvailable;
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  }, [listings, statusFilter, conditionFilter, lowStockOnly, outOfStockOnly, searchQuery, sortBy]);

  // Handle Edit Click
  const openEditModal = (item: ListingItem) => {
    setEditingListing(item);
    setEditFormData({
      title: item.title,
      sellerSku: item.sellerSku || '',
      priceRupees: String(item.pricePaise / 100),
      warrantyDays: String(item.warrantyDays ?? 30),
      lowStockThreshold: String(item.lowStockThreshold ?? 5),
      shippingFeeRupees: String((item.shippingFeePaise ?? 0) / 100),
      dispatchLeadTimeDays: String(item.dispatchLeadTimeDays ?? 2),
      description: item.description || '',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;

    setActionInProgress(true);
    setError(null);
    try {
      const pricePaise = Math.round(Number(editFormData.priceRupees) * 100);
      const shippingFeePaise = Math.round(Number(editFormData.shippingFeeRupees) * 100);

      await apiRequest(`/seller/listings/${editingListing._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editFormData.title.trim(),
          sellerSku: editFormData.sellerSku.trim() || undefined,
          pricePaise,
          warrantyDays: Number(editFormData.warrantyDays),
          lowStockThreshold: Number(editFormData.lowStockThreshold),
          shippingFeePaise,
          dispatchLeadTimeDays: Number(editFormData.dispatchLeadTimeDays),
          description: editFormData.description.trim() || undefined,
        }),
      });

      setSuccessMessage('Listing details updated successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
      setEditingListing(null);
      await loadListings();
    } catch (err: any) {
      setError(err.message || 'Failed to update listing.');
    } finally {
      setActionInProgress(false);
    }
  };

  // Handle Quick Stock Adjustment
  const openAdjustModal = (item: ListingItem) => {
    setAdjustingListing(item);
    setAdjustmentForm({
      movementType: 'restock',
      adjustmentUnits: '5',
      newExactCount: String(item.stockAvailable),
      reason: 'Physical warehouse replenishment',
      reference: '',
      notes: '',
    });
  };

  const handleSaveStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingListing) return;

    setActionInProgress(true);
    setError(null);
    try {
      let payload: any = {
        movementType: adjustmentForm.movementType,
        reason: adjustmentForm.reason.trim(),
        reference: adjustmentForm.reference.trim() || undefined,
        notes: adjustmentForm.notes.trim() || undefined,
      };

      if (adjustmentForm.movementType === 'manual_adjustment') {
        const count = Number(adjustmentForm.newExactCount);
        if (isNaN(count) || count < 0) {
          throw new Error('New stock count must be a non-negative whole number');
        }
        payload.stockAvailable = count;
      } else {
        const units = Number(adjustmentForm.adjustmentUnits);
        if (isNaN(units) || units <= 0) {
          throw new Error('Adjustment units must be a positive integer');
        }
        if (adjustmentForm.movementType === 'damaged' || adjustmentForm.movementType === 'lost') {
          payload.quantityDelta = -units;
        } else {
          payload.quantityDelta = units;
        }
      }

      await apiRequest(`/seller/listings/${adjustingListing._id}/stock-adjustments`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSuccessMessage('Stock adjusted and immutable InventoryMovement recorded.');
      setTimeout(() => setSuccessMessage(null), 3000);
      setAdjustingListing(null);
      await loadListings();
    } catch (err: any) {
      setError(err.message || 'Could not adjust stock.');
    } finally {
      setActionInProgress(false);
    }
  };

  // Toggle Pause / Resume
  const handleToggleStatus = async (item: ListingItem) => {
    const nextStatus = item.status === 'paused' ? 'active' : 'paused';
    const actionLabel = item.status === 'paused' ? 'resume' : 'pause';

    if (!window.confirm(`Are you sure you want to ${actionLabel} listing "${item.title}"?`)) {
      return;
    }

    setActionInProgress(true);
    setError(null);
    try {
      await apiRequest(`/seller/listings/${item._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      setSuccessMessage(`Listing status updated to ${nextStatus}.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadListings();
    } catch (err: any) {
      setError(err.message || `Failed to change listing status.`);
    } finally {
      setActionInProgress(false);
    }
  };

  // Archive Listing
  const handleArchive = async (item: ListingItem) => {
    if (!window.confirm(`Archive listing "${item.title}"? It will no longer appear in buyer searches.`)) {
      return;
    }

    setActionInProgress(true);
    setError(null);
    try {
      await apiRequest(`/seller/listings/${item._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'archived' }),
      });
      setSuccessMessage('Listing archived.');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadListings();
    } catch (err: any) {
      setError(err.message || 'Failed to archive listing.');
    } finally {
      setActionInProgress(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Active
          </span>
        );
      case 'pending_review':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            In Review
          </span>
        );
      case 'paused':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
            Paused
          </span>
        );
      case 'out_of_stock':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Out of Stock
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            Rejected
          </span>
        );
      case 'archived':
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
            Archived
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" />
            My Spare-Part Listings & Stock Levels
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage your verified catalog offers, track real-time reserved stock, and adjust unit counts with full auditability.
          </p>
        </div>
        <Link
          to="/listings/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition self-start md:self-center"
        >
          <PlusCircle className="w-4 h-4" />
          Create New Listing
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2 shadow-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by Title, SKU, Canonical Part, or MPN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none capitalize"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending_review">In Review</option>
              <option value="paused">Paused</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none capitalize"
            >
              <option value="">All Conditions</option>
              <option value="new">New</option>
              <option value="refurbished">Refurbished</option>
              <option value="used">Used Pull</option>
              <option value="for_parts">For Parts</option>
            </select>
          </div>
        </div>

        {/* Second Row: Toggles and Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Low-Stock Alerts Only</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={outOfStockOnly}
                onChange={(e) => setOutOfStockOnly(e.target.checked)}
                className="rounded text-rose-600 focus:ring-rose-500"
              />
              <span>Out-of-Stock Only</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1 rounded border border-slate-300 bg-white text-xs font-semibold focus:outline-none"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="stock_asc">Stock: Low to High</option>
              <option value="stock_desc">Stock: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Listings Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-500">
            <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
            <p className="text-sm">Loading your spare part listings...</p>
          </div>
        ) : processedListings.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-700">No listings match your criteria</p>
            <p className="text-xs text-slate-400 mt-1">
              {listings.length === 0
                ? 'You have not created any listings yet.'
                : 'Try adjusting your search query or status filter.'}
            </p>
            <Link
              to="/listings/create"
              className="mt-3 inline-block px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold"
            >
              Create New Listing
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Item & SKU</th>
                  <th className="py-3 px-4">Condition</th>
                  <th className="py-3 px-4 text-right">Price per Piece</th>
                  <th className="py-3 px-4 text-center">Stock (Avail / Res)</th>
                  <th className="py-3 px-4 text-right">Inventory Value</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedListings.map((item) => {
                  const priceRupees = (item.pricePaise / 100).toFixed(2);
                  const isLow =
                    item.stockAvailable > 0 &&
                    item.stockAvailable <= (item.lowStockThreshold ?? 5);
                  const isZero = item.stockAvailable === 0;

                  // Authoritative valuation for available units
                  const inventoryValuation = (
                    (item.pricePaise * item.stockAvailable) /
                    100
                  ).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  });

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-xs">{item.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {item.partId?.name && (
                            <span>Part: {item.partId.name} • </span>
                          )}
                          <span className="font-mono text-slate-600">
                            SKU: {item.sellerSku || 'N/A'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-xs font-semibold capitalize text-slate-700">
                        {item.condition?.replace('_', ' ')}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-slate-900 font-mono">
                        ₹{priceRupees}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                              isZero
                                ? 'bg-rose-100 text-rose-800'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-50 text-emerald-800'
                            }`}
                          >
                            {item.stockAvailable}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            ({item.stockReserved ?? 0} res)
                          </span>
                        </div>
                        {isLow && (
                          <div className="text-[10px] text-amber-700 font-semibold mt-0.5 flex items-center justify-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" /> Low Stock
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-xs text-slate-700 font-semibold">
                        ₹{inventoryValuation}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Adjust Stock */}
                          <button
                            onClick={() => openAdjustModal(item)}
                            title="Adjust Stock"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => openEditModal(item)}
                            title="Edit Listing Details"
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Pause / Resume */}
                          {['active', 'paused'].includes(item.status) && (
                            <button
                              onClick={() => handleToggleStatus(item)}
                              title={item.status === 'paused' ? 'Resume Listing' : 'Pause Listing'}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                            >
                              {item.status === 'paused' ? (
                                <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                              )}
                            </button>
                          )}

                          {/* Archive */}
                          {item.status !== 'archived' && (
                            <button
                              onClick={() => handleArchive(item)}
                              title="Archive Listing"
                              className="p-1.5 rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 transition"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT LISTING MODAL */}
      {editingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-600" />
                Edit Listing #{editingListing._id.slice(-6)}
              </h3>
              <button
                type="button"
                onClick={() => setEditingListing(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 pt-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Seller SKU</label>
                  <input
                    type="text"
                    value={editFormData.sellerSku}
                    onChange={(e) => setEditFormData({ ...editFormData, sellerSku: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Price per Piece (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    value={editFormData.priceRupees}
                    onChange={(e) => setEditFormData({ ...editFormData, priceRupees: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Warranty (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={editFormData.warrantyDays}
                    onChange={(e) => setEditFormData({ ...editFormData, warrantyDays: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Low-Stock Alert Level</label>
                  <input
                    type="number"
                    min="0"
                    value={editFormData.lowStockThreshold}
                    onChange={(e) => setEditFormData({ ...editFormData, lowStockThreshold: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Shipping Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editFormData.shippingFeeRupees}
                    onChange={(e) => setEditFormData({ ...editFormData, shippingFeeRupees: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dispatch Estimate (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={editFormData.dispatchLeadTimeDays}
                    onChange={(e) => setEditFormData({ ...editFormData, dispatchLeadTimeDays: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingListing(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm disabled:opacity-50"
                >
                  {actionInProgress ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK STOCK ADJUSTMENT MODAL */}
      {adjustingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Adjust Inventory Stock
              </h3>
              <button
                type="button"
                onClick={() => setAdjustingListing(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStockAdjustment} className="space-y-4 pt-4 text-sm">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                <div className="font-bold text-slate-900">{adjustingListing.title}</div>
                <div className="text-slate-500 mt-0.5">
                  Current On-Hand: <strong className="text-slate-800">{adjustingListing.stockAvailable} units</strong> • Reserved: {adjustingListing.stockReserved ?? 0}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Movement Type</label>
                <select
                  value={adjustmentForm.movementType}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, movementType: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="restock">Restock (+ Units)</option>
                  <option value="damaged">Damage Write-off (- Units)</option>
                  <option value="lost">Lost Inventory (- Units)</option>
                  <option value="manual_adjustment">Manual Exact Count (Set exact units)</option>
                </select>
              </div>

              {adjustmentForm.movementType === 'manual_adjustment' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Exact Available Count (Pieces) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={adjustmentForm.newExactCount}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, newExactCount: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Units to {adjustmentForm.movementType === 'restock' ? 'Add (+)' : 'Deduct (-)'} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={adjustmentForm.adjustmentUnits}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, adjustmentUnits: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Adjustment *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Physical warehouse cycle count"
                  value={adjustmentForm.reason}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reference Order or PO # (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. PO-88902 or RET-104"
                  value={adjustmentForm.reference}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reference: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustingListing(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm disabled:opacity-50"
                >
                  {actionInProgress ? 'Commiting...' : 'Commit Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
