import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/apiClient';

export const SellerListingsPage: React.FC = () => {
  const [parts, setParts] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [partId, setPartId] = useState('');
  const [title, setTitle] = useState('');
  const [condition, setCondition] = useState<'new' | 'refurbished' | 'used' | 'for_parts'>('new');
  const [priceRupees, setPriceRupees] = useState('1499');
  const [stockAvailable, setStockAvailable] = useState('10');
  const [warrantyDays, setWarrantyDays] = useState('90');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    const [partsData, listingsData] = await Promise.all([
      apiRequest<any[]>('/parts').catch(() => []),
      apiRequest<any[]>('/seller/listings').catch(() =>
        apiRequest<any[]>('/listings').catch(() => [])
      ),
    ]);
    const safeParts = Array.isArray(partsData) ? partsData : [];
    const safeListings = Array.isArray(listingsData) ? listingsData : [];
    setParts(safeParts);
    setListings(safeListings);
    if (safeParts.length > 0 && !partId) {
      setPartId(safeParts[0]._id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const pricePaise = Math.round(Number(priceRupees) * 100);
      await apiRequest('/seller/listings', {
        method: 'POST',
        body: JSON.stringify({
          partId,
          title: title.trim(),
          condition,
          pricePaise,
          stockAvailable: Number(stockAvailable),
          warrantyDays: Number(warrantyDays),
        }),
      });
      setMessage('Seller listing created and linked to canonical spare part.');
      setTitle('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create listing.');
    }
  };

  const handleQuickRestock = async (item: any) => {
    setError(null);
    setMessage(null);
    try {
      const nextStock = (item.stockAvailable ?? 0) + 5;
      await apiRequest(`/seller/inventory/${item._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          stockAvailable: nextStock,
          reason: 'Vendor warehouse replenishment (+5 units)',
        }),
      });
      setMessage('Stock incremented by +5 units with immutable InventoryMovement audit log.');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Could not adjust stock.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Seller Listings & Inventory Movements</h2>
        <p className="text-sm text-slate-600 mt-1">
          Link your vendor listings to canonical spare parts, declare condition grades & warranty terms, and manage stock on hand.
        </p>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
      {message && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-semibold">{message}</div>}

      <form onSubmit={handleCreateListing} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-3 font-bold text-slate-900">Create New Spare-Part Listing</div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Canonical Spare Part</label>
          <select value={partId} onChange={(e) => setPartId(e.target.value)} required className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm">
            {parts.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({p.partNumber || p.componentType})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Listing Title / SKU</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="iPhone 13 OEM Display Assembly" required className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Condition Grade</label>
          <select value={condition} onChange={(e) => setCondition(e.target.value as any)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm">
            <option value="new">New</option>
            <option value="refurbished">Refurbished</option>
            <option value="used">Used Pull</option>
            <option value="for_parts">For Parts / Untested</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Price (INR ₹)</label>
          <input type="number" min="1" value={priceRupees} onChange={(e) => setPriceRupees(e.target.value)} required className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Stock Available</label>
          <input type="number" min="0" value={stockAvailable} onChange={(e) => setStockAvailable(e.target.value)} required className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Warranty (Days)</label>
          <input type="number" min="0" value={warrantyDays} onChange={(e) => setWarrantyDays(e.target.value)} required className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
        </div>

        <div className="sm:col-span-3">
          <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold cursor-pointer">
            Publish Seller Listing
          </button>
        </div>
      </form>

      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-4">Your Listings & Stock Levels</h3>
        <div className="space-y-3">
          {listings.map((item) => (
            <div key={item._id} className="p-4 rounded-lg border border-slate-200 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-bold text-slate-900">{item.title || item.partId?.name}</div>
                <div className="text-xs text-slate-500">
                  Condition: {item.condition} • Price: ₹{(item.pricePaise / 100).toFixed(2)} • Available: <strong>{item.stockAvailable}</strong> (Reserved: {item.stockReserved ?? 0}) • Status: <strong>{item.status}</strong>
                </div>
              </div>
              <button
                onClick={() => handleQuickRestock(item)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold cursor-pointer"
              >
                +5 Restock
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

