import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/apiClient';

export const AdminFinancePage: React.FC = () => {
  const [finance, setFinance] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    apiRequest<any>('/admin/finance')
      .then(setFinance)
      .catch(() => setFinance(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Finance & Marketplace Reports</h2>
        <p className="text-sm text-slate-600 mt-1">
          Review platform GMV, integer-paise commission splits, pending and completed seller disbursements, and tax reporting.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Gross Merchandise Value (GMV)</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            ₹{(((finance?.grossMerchandiseValuePaise || 0)) / 100).toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Platform Commissions (8%)</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            ₹{(((finance?.platformCommissionPaise || 0)) / 100).toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Paid Orders Count</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {finance?.totalOrders || 0} Orders
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-3">Recent Transactions & Revenue Ledger</h3>
        {loading ? (
          <p className="text-sm text-slate-500">Loading ledger...</p>
        ) : (finance?.recentPaidOrders || []).length === 0 ? (
          <p className="text-sm text-slate-500">No settled transactions found.</p>
        ) : (
          <div className="space-y-2">
            {(finance.recentPaidOrders || []).map((o: any) => (
              <div key={o._id} className="p-3 rounded-lg border border-slate-100 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-800">{o.orderNumber}</span>
                  <span className="ml-2 text-slate-500">{new Date(o.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex gap-4">
                  <span>Gross: <strong>₹{((o.totalPaise || 0) / 100).toFixed(2)}</strong></span>
                  <span className="text-emerald-700">Commission (8%): <strong>₹{(((o.totalPaise || 0) * 0.08) / 100).toFixed(2)}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

