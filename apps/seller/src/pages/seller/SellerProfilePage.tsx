import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';

export const SellerProfilePage: React.FC = () => {
  const { user, sellerProfile } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<any[]>('/notifications')
      .then((data) => setNotifications(Array.isArray(data) ? data : []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Seller Profile & Real-Time Notifications</h2>
        <p className="text-sm text-slate-600 mt-1">
          Review your verified merchant identity, authorized store attributes, and live order and KYC updates.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-900 text-sm">Merchant Identity</h3>
          <div className="text-xs space-y-2 text-slate-600">
            <div>Owner Name: <strong>{user?.fullName}</strong></div>
            <div>Account Email: <strong>{user?.email}</strong></div>
            <div>Store Name: <strong>{sellerProfile?.storeName || 'N/A'}</strong></div>
            <div>GSTIN: <strong>{sellerProfile?.gstin || 'N/A'}</strong></div>
            <div>Business Address: <strong>{sellerProfile?.businessAddress || 'N/A'}</strong></div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-900 text-sm">Order & Compliance Notifications</h3>
          {loading ? (
            <p className="text-xs text-slate-500">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p className="text-xs text-slate-500">No new notifications.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
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
  );
};

