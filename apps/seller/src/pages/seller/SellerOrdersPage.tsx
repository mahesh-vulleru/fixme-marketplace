import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/apiClient';

export const SellerOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [wantedRequests, setWantedRequests] = useState<any[]>([]);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('BlueDart Priority');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    const [ordersData, wantedData] = await Promise.all([
      apiRequest<any[]>('/seller/orders').catch(() => []),
      apiRequest<any[]>('/wanted-requests').catch(() => []),
    ]);
    setOrders(Array.isArray(ordersData) ? ordersData : []);
    setWantedRequests(Array.isArray(wantedData) ? wantedData : []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMarkShipped = async (orderId: string, subOrderId: string) => {
    setError(null);
    setMessage(null);
    try {
      await apiRequest(`/orders/${orderId}/ship`, {
        method: 'POST',
        body: JSON.stringify({
          subOrderId,
          carrier: carrier || 'BlueDart Priority',
          trackingNumber: trackingNumber || 'BD-9928172',
        }),
      });
      setMessage(`Sub-order ${subOrderId} marked as shipped.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Could not mark sub-order as shipped.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Vendor Suborders & Shipment Fulfillment</h2>
        <p className="text-sm text-slate-600 mt-1">
          Isolated vendor view: you only fulfill sub-orders belonging to your store, never other vendors' sub-orders.
        </p>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
      {message && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-semibold">{message}</div>}

      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
          <h3 className="font-bold text-slate-900">Assigned Seller Sub-Orders</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="Carrier Name"
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
            />
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Tracking Number for Shipments"
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
            />
          </div>
        </div>

        {orders.length === 0 ? (
          <p className="text-sm text-slate-500">No sub-orders assigned to your seller account yet.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order: any) =>
              (order.subOrders || []).map((sub: any) => (
                <div key={sub._id} className="p-4 rounded-lg border border-slate-200 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="font-bold text-slate-900">
                      Order {order.orderNumber} • SubOrder #{String(sub._id).slice(-6)}
                    </div>
                    <div className="text-xs text-slate-500">
                      Fulfillment: <strong className="uppercase">{sub.fulfillmentStatus}</strong> • Net Settlement: ₹{((sub.sellerSettlementPaise || 0) / 100).toFixed(2)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMarkShipped(order._id, sub._id)}
                      className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold cursor-pointer"
                    >
                      Mark Shipped
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-3">Open Customer Wanted-Part Requests</h3>
        {wantedRequests.length === 0 ? (
          <p className="text-sm text-slate-500">No wanted-part requests open right now.</p>
        ) : (
          <div className="space-y-2">
            {wantedRequests.map((req) => (
              <div key={req._id} className="p-3 rounded-lg border border-slate-200 text-sm flex justify-between items-center">
                <div>
                  <span className="font-semibold text-slate-900">{req.partName || req.description}</span>
                  <span className="ml-2 text-xs text-slate-500">
                    Target Max: ₹{((req.targetMaxPricePaise || 0) / 100).toFixed(2)} • Status: {req.status}
                  </span>
                </div>
                <span className="text-xs font-semibold text-emerald-700">
                  {req.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

