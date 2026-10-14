import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/apiClient';

export const AdminModerationPage: React.FC = () => {
  const [sellers, setSellers] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [sellerStatusFilter, setSellerStatusFilter] = useState<string>('');
  const [listingStatusFilter, setListingStatusFilter] = useState<string>('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const sellerQuery = sellerStatusFilter ? `?status=${sellerStatusFilter}` : '';
      const listingQuery = listingStatusFilter ? `?status=${listingStatusFilter}&limit=50` : '?status=all&limit=50';
      const [sellersData, listingsData] = await Promise.all([
        apiRequest<any[]>(`/admin/sellers${sellerQuery}`).catch(() => []),
        apiRequest<any[]>(`/listings${listingQuery}`).catch(() => [])
      ]);
      setSellers(Array.isArray(sellersData) ? sellersData : []);
      setListings(Array.isArray(listingsData) ? listingsData : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load moderation queues.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [sellerStatusFilter, listingStatusFilter]);

  const handleSellerDecision = async (sellerId: string, status: 'approved' | 'rejected' | 'suspended') => {
    setError(null);
    setMessage(null);
    try {
      await apiRequest(`/admin/sellers/${sellerId}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reviewNotes: `Admin moderation set status to ${status}` })
      });
      setMessage(`Seller status successfully updated to '${status}'.`);
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
      setMessage(`Listing status successfully updated to '${status}'.`);
      await loadQueue();
    } catch (err: any) {
      setError(err.message || 'Could not moderate listing.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pending':
      case 'pending_review':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'suspended':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Seller KYC & Listing Moderation Queue</h2>
        <p className="text-sm text-slate-600 mt-1">
          Review and approve electronics spare-parts vendor applications, inspect KYC credentials, and moderate catalog listings.
        </p>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
      {message && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-semibold">{message}</div>}

      {/* Seller Applications Queue */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900">Seller Onboarding & KYC Applications</h3>
            <p className="text-xs text-slate-500">Live vendor submissions awaiting verification</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Filter:</span>
            <select
              value={sellerStatusFilter}
              onChange={(e) => setSellerStatusFilter(e.target.value)}
              className="px-2.5 py-1 rounded border border-slate-300 text-xs bg-white"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="suspended">Suspended</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-slate-500">Loading queues...</p>
        ) : sellers.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">No seller applications matching current filter.</p>
        ) : (
          <div className="space-y-3">
            {sellers.map((s) => (
              <div key={s._id} className="p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-base">{s.storeName}</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(s.status)}`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600">
                    Applicant: <strong>{s.userId?.fullName || 'N/A'}</strong> ({s.userId?.email || 'N/A'})
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-x-4">
                    <span>GSTIN: <strong>{s.gstin || 'Not provided'}</strong></span>
                    <span>PAN: <strong>{s.panNumber || 'Not provided'}</strong></span>
                    <span>Address: <strong>{s.businessAddress || 'Not provided'}</strong></span>
                  </div>
                  {s.reviewNotes && (
                    <div className="text-[11px] text-slate-400 italic">
                      Prior Note: "{s.reviewNotes}"
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                  {s.status !== 'approved' && (
                    <button
                      onClick={() => handleSellerDecision(s._id, 'approved')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      Approve Seller
                    </button>
                  )}
                  {s.status !== 'suspended' && (
                    <button
                      onClick={() => handleSellerDecision(s._id, 'suspended')}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      Suspend
                    </button>
                  )}
                  {s.status !== 'rejected' && (
                    <button
                      onClick={() => handleSellerDecision(s._id, 'rejected')}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Catalog Listings Moderation */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900">Marketplace Listings Moderation</h3>
            <p className="text-xs text-slate-500">Monitor seller catalog listings for quality, compliance, and stock legitimacy (Customer Wanted Requests are managed separately).</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Filter:</span>
            <select
              value={listingStatusFilter}
              onChange={(e) => setListingStatusFilter(e.target.value)}
              className="px-2.5 py-1 rounded border border-slate-300 text-xs bg-white"
            >
              <option value="">All Statuses</option>
              <option value="pending_review">Pending Review</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {listings.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">No listings matching current filter.</p>
        ) : (
          <div className="space-y-3">
            {listings.map((item) => (
              <div key={item._id} className="p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{item.partId?.name || item.sellerSku || item.sku || 'Listing'}</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-x-4">
                    <span>SKU: <strong>{item.sellerSku || item.sku || 'N/A'}</strong></span>
                    <span>Condition: <strong>{item.condition}</strong></span>
                    <span>Stock: <strong>{item.stockAvailable ?? item.quantity ?? 0} units</strong></span>
                    {typeof item.pricePaise === 'number' && (
                      <span>Price: <strong>₹{(item.pricePaise / 100).toFixed(2)}</strong></span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                  {item.status !== 'active' && (
                    <button
                      onClick={() => handleListingDecision(item._id, 'active')}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      Approve & Activate
                    </button>
                  )}
                  {item.status !== 'suspended' && (
                    <button
                      onClick={() => handleListingDecision(item._id, 'suspended')}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      Suspend
                    </button>
                  )}
                  {item.status !== 'rejected' && (
                    <button
                      onClick={() => handleListingDecision(item._id, 'rejected')}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

