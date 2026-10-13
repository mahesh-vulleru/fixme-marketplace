import React, { useEffect, useState, useMemo } from 'react';
import { apiRequest } from '../../services/apiClient';
import {
  Layers,
  Search,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertCircle,
  FileText,
} from 'lucide-react';

export interface MovementItem {
  _id: string;
  listingId: {
    _id: string;
    title: string;
    sellerSku?: string;
    pricePaise: number;
    condition?: string;
  } | string;
  sellerId: string;
  movementType: string;
  quantityDelta: number;
  previousAvailable: number;
  newAvailable: number;
  reason: string;
  reference?: string;
  notes?: string;
  createdAt: string;
}

export const SellerStockMovementsPage: React.FC = () => {
  const [movements, setMovements] = useState<MovementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMovements = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<MovementItem[]>('/seller/stock-movements');
      setMovements(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load stock movements history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements();
  }, []);

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (typeFilter && m.movementType !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = typeof m.listingId === 'object' ? m.listingId?.title : '';
        const sku = typeof m.listingId === 'object' ? m.listingId?.sellerSku || '' : '';
        const match =
          m.reason?.toLowerCase().includes(q) ||
          m.reference?.toLowerCase().includes(q) ||
          m._id.toLowerCase().includes(q) ||
          title.toLowerCase().includes(q) ||
          sku.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [movements, typeFilter, searchQuery]);

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'initial_receipt':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Initial Intake
          </span>
        );
      case 'restock':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Restock
          </span>
        );
      case 'damaged':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Damaged
          </span>
        );
      case 'lost':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Lost Inventory
          </span>
        );
      case 'manual_adjustment':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            Manual Correction
          </span>
        );
      case 'return_restock':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
            Customer Return
          </span>
        );
      case 'reserve':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
            Order Reserved
          </span>
        );
      case 'commit':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Order Fulfilled
          </span>
        );
      case 'release':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
            Reservation Released
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 capitalize">
            {type.replace('_', ' ')}
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
            <Layers className="w-6 h-6 text-emerald-600" />
            Immutable Stock Movement Ledger
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Complete auditable history of physical receipts, manual cycle counts, restocks, damage write-offs, and order allocations.
          </p>
        </div>
        <button
          onClick={fetchMovements}
          className="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition flex items-center gap-1.5 self-start md:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Ledger
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Row */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by SKU, item title, reason, or movement ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none capitalize"
          >
            <option value="">All Movement Types</option>
            <option value="initial_receipt">Initial Intake</option>
            <option value="restock">Restock (+)</option>
            <option value="damaged">Damaged (-)</option>
            <option value="lost">Lost (-)</option>
            <option value="manual_adjustment">Manual Correction</option>
            <option value="return_restock">Customer Return (+)</option>
            <option value="reserve">Order Reservation</option>
            <option value="commit">Order Fulfillment</option>
            <option value="release">Reservation Release</option>
          </select>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-500">
            <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
            <p className="text-sm">Loading movement history records...</p>
          </div>
        ) : filteredMovements.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-700">No stock movements found</p>
            <p className="text-xs text-slate-400 mt-1">
              Stock movements are recorded automatically whenever you publish listings or adjust inventory.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Item & SKU</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-center">Change</th>
                  <th className="py-3 px-4">Previous → Result</th>
                  <th className="py-3 px-4">Reason & Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMovements.map((m) => {
                  const title =
                    typeof m.listingId === 'object' && m.listingId !== null
                      ? m.listingId.title
                      : `Listing #${String(m.listingId).slice(-6)}`;
                  const sku =
                    typeof m.listingId === 'object' && m.listingId !== null
                      ? m.listingId.sellerSku
                      : undefined;
                  const isPositive = m.quantityDelta > 0;
                  const isZero = m.quantityDelta === 0;

                  return (
                    <tr key={m._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">
                        <div>{new Date(m.createdAt).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-xs">{title}</div>
                        {sku && (
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                            SKU: {sku}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {getMovementBadge(m.movementType)}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap font-mono font-bold">
                        {isZero ? (
                          <span className="text-slate-500 text-xs">0</span>
                        ) : isPositive ? (
                          <span className="inline-flex items-center gap-0.5 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                            <ArrowUpRight className="w-3.5 h-3.5" />+{m.quantityDelta}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-bold">
                            <ArrowDownRight className="w-3.5 h-3.5" />{m.quantityDelta}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-700 font-mono">
                        <span className="text-slate-500">{m.previousAvailable}</span>
                        <span className="mx-1 text-slate-400">→</span>
                        <strong className="text-slate-900 font-bold">{m.newAvailable}</strong>
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-600 max-w-xs">
                        <div className="font-medium text-slate-800">{m.reason}</div>
                        {m.reference && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Ref: <span className="font-mono">{m.reference}</span>
                          </div>
                        )}
                        {m.notes && (
                          <div className="text-[11px] text-slate-500 italic mt-0.5">
                            {m.notes}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
