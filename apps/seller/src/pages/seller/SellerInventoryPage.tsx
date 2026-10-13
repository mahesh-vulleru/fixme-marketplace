import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/apiClient';

export const SellerInventoryPage: React.FC = () => {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editStock, setEditStock] = useState<{ [id: string]: number }>({});
  const [reason, setReason] = useState<{ [id: string]: string }>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadListings = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<any[]>('/seller/listings');
      setListings(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  const handleUpdateStock = async (listingId: string) => {
    const newStock = editStock[listingId];
    if (newStock === undefined || newStock < 0 || !Number.isInteger(Number(newStock))) {
      setError('Please provide a valid non-negative integer stock value.');
      return;
    }
    const updateReason = reason[listingId] || 'Physical warehouse inventory cycle count';

    setError(null);
    setMessage(null);
    try {
      await apiRequest(`/seller/inventory/${listingId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          stockAvailable: Number(newStock),
          reason: updateReason,
        }),
      });
      setMessage(`Inventory for listing updated to ${newStock} units with audited movement record.`);
      await loadListings();
    } catch (err: any) {
      setError(err.message || 'Could not update inventory.');
    }
  };

  const lowStockListings = listings.filter((item) => (item.stockAvailable ?? 0) < 5);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Inventory & Stock Movement Engine</h2>
        <p className="text-sm text-slate-600 mt-1">
          Manage real-time available and reserved stock, track automated low-stock warnings, and record audited inventory movements.
        </p>
      </div>

      {lowStockListings.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
          <h3 className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
            ⚠️ Low Stock Alert ({lowStockListings.length} item{lowStockListings.length > 1 ? 's' : ''} under 5 units)
          </h3>
          <p className="text-xs text-amber-700 mt-1">
            Replenish these items to prevent checkout stockouts and lost customer orders:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {lowStockListings.map((l) => (
              <span key={l._id} className="text-xs px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 font-semibold">
                {l.title || l.partId?.name}: {l.stockAvailable} units
              </span>
            ))}
          </div>
        </div>
      )}

      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
      {message && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-semibold">{message}</div>}

      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-500">Loading inventory records...</p>
        ) : listings.length === 0 ? (
          <p className="text-sm text-slate-500">No listings created yet. Create a listing first to manage its inventory.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                  <th className="py-2 pr-4">Spare Part Item</th>
                  <th className="py-2 pr-4">Condition</th>
                  <th className="py-2 pr-4">Available</th>
                  <th className="py-2 pr-4">Reserved</th>
                  <th className="py-2 pr-4">New Count</th>
                  <th className="py-2 pr-4">Adjustment Reason</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listings.map((item) => (
                  <tr key={item._id}>
                    <td className="py-3 pr-4 font-semibold text-slate-900">
                      {item.title || item.partId?.name}
                    </td>
                    <td className="py-3 pr-4 text-xs font-bold uppercase text-slate-600">
                      {item.condition}
                    </td>
                    <td className="py-3 pr-4 font-bold text-slate-800">
                      <span className={`px-2 py-0.5 rounded text-xs ${(item.stockAvailable ?? 0) < 5 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {item.stockAvailable ?? 0}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-500">
                      {item.stockReserved ?? 0}
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="number"
                        min="0"
                        defaultValue={item.stockAvailable ?? 0}
                        onChange={(e) => setEditStock({ ...editStock, [item._id]: Number(e.target.value) })}
                        className="w-20 px-2 py-1 rounded border border-slate-300 text-xs"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <input
                        type="text"
                        placeholder="Warehouse restock..."
                        onChange={(e) => setReason({ ...reason, [item._id]: e.target.value })}
                        className="px-2 py-1 rounded border border-slate-300 text-xs w-48"
                      />
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleUpdateStock(item._id)}
                        className="px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                      >
                        Commit Adjustment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

