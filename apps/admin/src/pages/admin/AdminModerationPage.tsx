import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/apiClient';

export const AdminModerationPage: React.FC = () => {
  const [sellers, setSellers] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = async () => {
    try {
      const [sellersData, listingsData] = await Promise.all([
        apiRequest<any[]>('/admin/sellers').catch(() => []),
        apiRequest<any[]>('/listings').catch(() => [])
      ]);
      setSellers(Array.isArray(sellersData) ? sellersData : []);
      setListings(Array.isArray(listingsData) ? listingsData : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load moderation queues.');
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleSellerDecision = async (sellerId: string, status: 'approved' | 'rejected' | 'suspended') => {
    setError(null);
    setMessage(null);
    try {
      await apiRequest(`/admin/sellers/${sellerId}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reviewNotes: `Admin moderation set status to ${status}` })
      });
      setMessage(`Seller ${sellerId} updated to ${status}.`);
      await loadQueue();
    } catch (err: any) {
      setError(err.message || 'Could not update seller status.');
    }
  };

  const handleListingDecision = async (listingId: string, status: 'active' | 'rejected' | 'suspended') => {
    setError(null);
    setMessage(null);
    try {
      await apiRequest(`/admin/listings/${listingId}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status, moderationNotes: `Listing moderated to ${status}` })
      });
      setMessage(`Listing ${listingId} updated to ${status}.`);
      await loadQueue();
    } catch (err: any) {
      setError(err.message || 'Could not moderate listing.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Seller KYC & Listing Moderation Queue</h2>
        <p className="text-sm text-slate-600 mt-1">
          Approve verified electronics spare-parts vendors, suspend non-compliant accounts, and moderate marketplace listings.
        </p>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
      {message && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-semibold">{message}</div>}

      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-4">Seller Onboarding & KYC Applications</h3>
        {sellers.length === 0 ? (
          <p className="text-sm text-slate-500">No seller profiles found.</p>
        ) : (
          <div className="space-y-3">
            {sellers.map((s) => (
              <div key={s._id} className="p-4 rounded-lg border border-slate-200 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="font-bold text-slate-900">{s.storeName} ({s.legalBusinessName})</div>
                  <div className="text-xs text-slate-500">
                    GSTIN: {s.gstin || 'N/A'} • Status: <strong className="uppercase">{s.approvalStatus}</strong>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSellerDecision(s._id, 'approved')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    Approve Seller
                  </button>
                  <button
                    onClick={() => handleSellerDecision(s._id, 'suspended')}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    Suspend
                  </button>
                  <button
                    onClick={() => handleSellerDecision(s._id, 'rejected')}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-4">Active Marketplace Listings Moderation</h3>
        {listings.length === 0 ? (
          <p className="text-sm text-slate-500">No listings currently available.</p>
        ) : (
          <div className="space-y-3">
            {listings.map((item) => (
              <div key={item._id} className="p-4 rounded-lg border border-slate-200 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="font-bold text-slate-900">{item.partId?.name || item.sku}</div>
                  <div className="text-xs text-slate-500">
                    SKU: {item.sku} • Condition: {item.condition} • Status: <strong>{item.status}</strong>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleListingDecision(item._id, 'active')}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    Approve / Activate
                  </button>
                  <button
                    onClick={() => handleListingDecision(item._id, 'suspended')}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    Suspend Listing
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

