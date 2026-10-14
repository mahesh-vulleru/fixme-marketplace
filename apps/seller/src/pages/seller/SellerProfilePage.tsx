import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';

export const SellerProfilePage: React.FC = () => {
  const { user, sellerProfile, refreshSession } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Editable store settings
  const [storeName, setStoreName] = useState(sellerProfile?.storeName || '');
  const [gstin, setGstin] = useState(sellerProfile?.gstin || '');
  const [panNumber, setPanNumber] = useState(sellerProfile?.panNumber || '');
  const [businessAddress, setBusinessAddress] = useState(sellerProfile?.businessAddress || '');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (sellerProfile) {
      setStoreName(sellerProfile.storeName || '');
      setGstin(sellerProfile.gstin || '');
      setPanNumber(sellerProfile.panNumber || '');
      setBusinessAddress(sellerProfile.businessAddress || '');
    }
  }, [sellerProfile]);

  useEffect(() => {
    apiRequest<any[]>('/notifications')
      .then((data) => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(null);
    setSaving(true);
    try {
      await apiRequest('/seller/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          storeName: storeName.trim(),
          gstin: gstin.trim() || undefined,
          panNumber: panNumber.trim() || undefined,
          businessAddress: businessAddress.trim(),
        }),
      });
      setSaveSuccess('Store identity & profile updated successfully.');
      await refreshSession();
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update store settings.');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'pending':
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
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Seller Store & Compliance Profile</h2>
          <p className="text-sm text-slate-600 mt-1">
            Review your merchant identity, update store policies, and monitor real-time system notifications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wider border ${getStatusBadge(sellerProfile?.status)}`}>
            KYC: {sellerProfile?.status || 'Unregistered'}
          </span>
          <Link
            to="/verification"
            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold hover:bg-emerald-100"
          >
            KYC Documents &rarr;
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Store Settings Form */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm">Store Settings & Commercial Identity</h3>

          {saveError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {saveError}
            </div>
          )}
          {saveSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold">
              {saveSuccess}
            </div>
          )}

          <form onSubmit={handleSaveStore} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Store Name</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN</label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="29AABCU9603R1ZM"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">PAN Number</label>
                <input
                  type="text"
                  value={panNumber}
                  onChange={(e) => setPanNumber(e.target.value)}
                  placeholder="AABCU9603R"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Operating Business Address</label>
              <textarea
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                required
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Owner: <strong>{user?.fullName}</strong> ({user?.email})
              </span>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                {saving ? 'Saving...' : 'Update Store Details'}
              </button>
            </div>
          </form>
        </div>

        {/* Notifications & Trust Metrics */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Merchant Trust & Rating</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-xl font-bold text-slate-900">
                  {sellerProfile?.ratingAverage ? sellerProfile.ratingAverage.toFixed(1) : '5.0'} ★
                </div>
                <div className="text-[10px] text-slate-500 uppercase mt-0.5">Average Rating</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-xl font-bold text-slate-900">
                  {sellerProfile?.ratingCount || 0}
                </div>
                <div className="text-[10px] text-slate-500 uppercase mt-0.5">Reviews</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-xl font-bold text-emerald-700 capitalize">
                  {sellerProfile?.status || 'Pending'}
                </div>
                <div className="text-[10px] text-slate-500 uppercase mt-0.5">Store Standing</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">Order & Compliance Notifications</h3>
            {loading ? (
              <p className="text-xs text-slate-500">Loading notifications...</p>
            ) : notifications.length === 0 ? (
              <p className="text-xs text-slate-500">No new notifications.</p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n._id} className="p-3 rounded-lg border border-slate-100 bg-slate-50 text-xs">
                    <div className="font-bold text-slate-800">{n.title}</div>
                    <div className="text-slate-600 mt-0.5">{n.message}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

