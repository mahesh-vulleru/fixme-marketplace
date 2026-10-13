import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../services/apiClient';
import {
  Layers,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  History,
  Clock,
  ArrowRight,
  TrendingDown,
  X,
} from 'lucide-react';

export interface InventoryItem {
  _id: string;
  partId?: {
    _id: string;
    name: string;
    partNumber: string;
    componentType: string;
  };
  sellerSku?: string;
  title: string;
  condition: string;
  pricePaise: number;
  stockAvailable: number;
  stockReserved: number;
  lowStockThreshold: number;
  status: string;
  updatedAt: string;
}

export const SellerInventoryPage: React.FC = () => {
  const [listings, setListings] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // In-line Quick Stock Adjustment Modal
  const [activeItem, setActiveItem] = useState<InventoryItem | null>(null);
  const [movementType, setMovementType] = useState<
    'restock' | 'damaged' | 'lost' | 'manual_adjustment' | 'return_restock'
  >('restock');
  const [unitsDelta, setUnitsDelta] = useState('5');
  const [exactCount, setExactCount] = useState('');
  const [reason, setReason] = useState('Vendor warehouse replenishment');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [thresholdEdit, setThresholdEdit] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<any>('/seller/listings');
      const list = Array.isArray(data) ? data : data?.listings || [];
      setListings(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  // Filtered List
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      const isLow =
        item.stockAvailable <= (item.lowStockThreshold ?? 5);
      if (showLowStockOnly && !isLow) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          item.title.toLowerCase().includes(q) ||
          item.sellerSku?.toLowerCase().includes(q) ||
          item.partId?.name?.toLowerCase().includes(q) ||
          item.partId?.partNumber?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [listings, showLowStockOnly, searchQuery]);

  // Aggregated Stats
  const totalAvailableUnits = listings.reduce((acc, i) => acc + (i.stockAvailable ?? 0), 0);
  const totalReservedUnits = listings.reduce((acc, i) => acc + (i.stockReserved ?? 0), 0);
  const totalPhysicalUnits = totalAvailableUnits + totalReservedUnits;
  const totalValuationRupees = (
    listings.reduce((acc, i) => acc + (i.pricePaise ?? 0) * (i.stockAvailable ?? 0), 0) / 100
  ).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const lowStockItems = listings.filter(
    (i) => i.stockAvailable > 0 && i.stockAvailable <= (i.lowStockThreshold ?? 5)
  );
  const outOfStockItems = listings.filter((i) => (i.stockAvailable ?? 0) === 0);

  const openAdjustmentModal = (item: InventoryItem) => {
    setActiveItem(item);
    setMovementType('restock');
    setUnitsDelta('5');
    setExactCount(String(item.stockAvailable));
    setReason('Physical warehouse replenishment');
    setReference('');
    setNotes('');
    setThresholdEdit(String(item.lowStockThreshold ?? 5));
  };

  const handleCommitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem) return;

    if (!reason.trim()) {
      setError('A reason for the stock adjustment is required');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      let payload: any = {
        movementType,
        reason: reason.trim(),
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (movementType === 'manual_adjustment') {
        const count = Number(exactCount);
        if (isNaN(count) || count < 0) {
          throw new Error('New stock count must be a non-negative whole number');
        }
        payload.stockAvailable = count;
      } else {
        const delta = Number(unitsDelta);
        if (isNaN(delta) || delta <= 0) {
          throw new Error('Adjustment quantity must be a positive integer');
        }
        if (movementType === 'damaged' || movementType === 'lost') {
          payload.quantityDelta = -delta;
        } else {
          payload.quantityDelta = delta;
        }
      }

      await apiRequest(`/seller/listings/${activeItem._id}/stock-adjustments`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Update threshold if edited
      const newThreshold = Number(thresholdEdit);
      if (!isNaN(newThreshold) && newThreshold >= 0 && newThreshold !== activeItem.lowStockThreshold) {
        await apiRequest(`/seller/listings/${activeItem._id}`, {
          method: 'PATCH',
          body: JSON.stringify({ lowStockThreshold: newThreshold }),
        });
      }

      setSuccessMessage('Inventory updated and immutable audit record appended to ledger.');
      setTimeout(() => setSuccessMessage(null), 3000);
      setActiveItem(null);
      await loadInventory();
    } catch (err: any) {
      setError(err.message || 'Could not commit stock adjustment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-600" />
            Inventory & Physical Stock Engine
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Real-time tracking of available and order-reserved inventory, low-stock threshold triggers, and audited manual adjustments.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/movements"
            className="px-3.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition flex items-center gap-1.5"
          >
            <History className="w-4 h-4 text-emerald-600" />
            View Movement History
          </Link>
          <button
            onClick={loadInventory}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
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

      {/* METRIC OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase">Total Available</span>
          <div className="text-2xl font-black text-slate-900">{totalAvailableUnits} pcs</div>
          <p className="text-xs text-slate-500">Sellable units ready for immediate checkout</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase">Reserved Units</span>
          <div className="text-2xl font-black text-slate-900">{totalReservedUnits} pcs</div>
          <p className="text-xs text-slate-500">Locked in customer orders awaiting fulfillment</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase">Total Physical Units</span>
          <div className="text-2xl font-black text-slate-900">{totalPhysicalUnits} pcs</div>
          <p className="text-xs text-slate-500">Available + Reserved physical stock on hand</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase">Inventory Valuation</span>
          <div className="text-2xl font-black text-slate-900 font-mono">₹{totalValuationRupees}</div>
          <p className="text-xs text-slate-500">Authoritative valuation (Price × Available)</p>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <h3 className="font-bold text-amber-900 text-sm">
              Stock Replenishment Alerts ({lowStockItems.length} Low, {outOfStockItems.length} Depleted)
            </h3>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {outOfStockItems.map((o) => (
              <span
                key={o._id}
                className="px-2.5 py-1 rounded-md bg-rose-100 text-rose-900 text-xs font-bold flex items-center gap-1"
              >
                <span>{o.title}</span>: 0 units (DEPLETED)
              </span>
            ))}
            {lowStockItems.map((l) => (
              <span
                key={l._id}
                className="px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 text-xs font-semibold"
              >
                {l.title}: {l.stockAvailable} units left (Alert at {l.lowStockThreshold ?? 5})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by part name, SKU, or part #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={showLowStockOnly}
            onChange={(e) => setShowLowStockOnly(e.target.checked)}
            className="rounded text-emerald-600 focus:ring-emerald-500"
          />
          <span>Show Critical Stock Only ({lowStockItems.length + outOfStockItems.length})</span>
        </label>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-500">
            <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
            <p className="text-sm">Loading physical inventory records...</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Layers className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-700">No inventory items found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Item & SKU</th>
                  <th className="py-3 px-4">Condition</th>
                  <th className="py-3 px-4 text-center">Available Stock</th>
                  <th className="py-3 px-4 text-center">Reserved</th>
                  <th className="py-3 px-4 text-center">Low-Stock Alert Level</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Valuation</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredListings.map((item) => {
                  const isLow =
                    item.stockAvailable > 0 &&
                    item.stockAvailable <= (item.lowStockThreshold ?? 5);
                  const isZero = item.stockAvailable === 0;
                  const itemValuation = (
                    (item.pricePaise * item.stockAvailable) /
                    100
                  ).toFixed(2);

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-xs">{item.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                          SKU: {item.sellerSku || 'N/A'}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-xs font-semibold capitalize text-slate-700">
                        {item.condition?.replace('_', ' ')}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`font-mono font-bold px-2.5 py-1 rounded text-xs ${
                            isZero
                              ? 'bg-rose-100 text-rose-800'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.stockAvailable} units
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap text-xs text-slate-500 font-mono">
                        {item.stockReserved ?? 0}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap text-xs text-slate-600 font-mono">
                        ≤ {item.lowStockThreshold ?? 5}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-xs font-bold text-slate-900">
                        ₹{(item.pricePaise / 100).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-xs font-semibold text-slate-700">
                        ₹{itemValuation}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => openAdjustmentModal(item)}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer"
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* STOCK ADJUSTMENT MODAL */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" />
                Audited Stock Adjustment
              </h3>
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCommitAdjustment} className="space-y-4 pt-4 text-sm">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                <div className="font-bold text-slate-900">{activeItem.title}</div>
                <div className="text-slate-500">
                  Current Stock Available: <strong className="text-slate-800">{activeItem.stockAvailable} units</strong> • Reserved: {activeItem.stockReserved ?? 0}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Movement Type *
                </label>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="restock">Restock / Intake (+ Units)</option>
                  <option value="damaged">Damaged in Warehouse (- Units)</option>
                  <option value="lost">Lost / Missing (- Units)</option>
                  <option value="return_restock">Customer Return Restock (+ Units)</option>
                  <option value="manual_adjustment">Physical Cycle Count (Set Exact On-Hand)</option>
                </select>
              </div>

              {movementType === 'manual_adjustment' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Exact Stock Count (Pieces) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={exactCount}
                    onChange={(e) => setExactCount(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Units to {movementType === 'damaged' || movementType === 'lost' ? 'Deduct (-)' : 'Add (+)'} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={unitsDelta}
                    onChange={(e) => setUnitsDelta(e.target.value)}
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
                  placeholder="e.g. Received shipment from supplier"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reference Order or PO # (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PO-99120"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Low-Stock Alert Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={thresholdEdit}
                    onChange={(e) => setThresholdEdit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Internal Auditing Note (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context for inventory logs..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveItem(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Committing...' : 'Commit Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
