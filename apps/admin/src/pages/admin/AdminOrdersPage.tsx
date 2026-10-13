import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/apiClient';

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    apiRequest<any[]>('/admin/orders')
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Marketplace Orders & Payments Monitoring</h2>
        <p className="text-sm text-slate-600 mt-1">
          Real-time visibility into multi-vendor order routing, payment capture, fulfillment status, and return requests.
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-500">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-slate-500">No orders recorded in the marketplace yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                  <th className="py-2 pr-4">Order Number</th>
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Grand Total</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Sub-Orders Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o._id}>
                    <td className="py-3 pr-4 font-bold text-slate-900">{o.orderNumber}</td>
                    <td className="py-3 pr-4 text-xs text-slate-600">
                      {o.customerId?.fullName || o.shippingAddress?.fullName} ({o.customerId?.email || 'Guest'})
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-500">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4 font-bold text-slate-900">
                      ₹{((o.totalPaise || 0) / 100).toFixed(2)}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-xs px-2.5 py-1 rounded-full font-bold uppercase bg-slate-100 text-slate-700">
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-slate-600 font-semibold">
                      {(o.subOrders || []).length} Sub-Order(s)
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

