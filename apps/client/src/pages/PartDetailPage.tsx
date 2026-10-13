import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { IPart, IListing } from '@fixme/api-contracts';
import { apiRequest } from '../services/apiClient';
import { formatPaiseToINR } from '../utils/currency';
import { ShieldCheck, Package, ShoppingCart } from 'lucide-react';

export const PartDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [part, setPart] = useState<IPart | null>(null);
  const [compatibleDevices, setCompatibleDevices] = useState<any[]>([]);
  const [listings, setListings] = useState<IListing[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiRequest<{
      part: IPart;
      compatibleDevices: any[];
      activeListings: IListing[];
    }>(`/parts/${id}`)
      .then((res) => {
        setPart(res.part);
        setCompatibleDevices(res.compatibleDevices || []);
        setListings(res.activeListings || []);
      })
      .catch(() => {});
  }, [id]);

  const handleAddToCart = async (listingId: string) => {
    try {
      await apiRequest('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ listingId, quantity: 1 }),
      });
      setMessage('Added item to server-verified cart!');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Please sign in to add items to cart.');
    }
  };

  if (!part) {
    return <div className="text-sm text-slate-500">Loading canonical part specification...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <span className="text-xs font-mono px-2.5 py-1 rounded bg-blue-50 text-blue-700 font-semibold">
          OEM / Part #: {part.partNumber}
        </span>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">{part.name}</h1>
        <p className="text-sm text-slate-600 mt-2">{part.description}</p>

        <div className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Verified Compatible Devices ({compatibleDevices.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {compatibleDevices.map((rec: any) => (
              <span
                key={rec._id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {rec.deviceId?.modelName} ({rec.deviceId?.modelNumber})
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">
            Multi-Vendor Seller Listings ({listings.length})
          </h2>
        </div>

        {message && (
          <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-sm">
            {message}
          </div>
        )}

        <div className="divide-y divide-slate-200">
          {listings.map((listing) => (
            <div
              key={listing._id}
              className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{listing.title}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase font-semibold">
                    {listing.condition}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Warranty: {listing.warrantyDays} days • Stock Available: {listing.stockAvailable} units
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-lg font-extrabold text-slate-900 block">
                    {formatPaiseToINR(listing.pricePaise)}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {listing.pricePaise} paise
                  </span>
                </div>
                <button
                  onClick={() => handleAddToCart(listing._id)}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

