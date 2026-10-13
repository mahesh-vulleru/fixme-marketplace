import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/apiClient';

export const AdminDisputesPage: React.FC = () => {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [resolutionNotes, setResolutionNotes] = useState<{ [id: string]: string }>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDisputes = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<any[]>('/admin/disputes');
      setDisputes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load disputes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisputes();
  }, []);

  const handleResolve = async (disputeId: string, status: 'resolved_refunded' | 'resolved_rejected') => {
    setError(null);
    setMessage(null);
    const notes = resolutionNotes[disputeId] || 'Dispute resolved following inspection of evidence.';
    try {
      await apiRequest(`/admin/disputes/${disputeId}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({ status, resolutionNotes: notes }),
      });
      setMessage(`Dispute ${disputeId} marked as ${status}.`);
      await loadDisputes();
    } catch (err: any) {
      setError(err.message || 'Could not resolve dispute.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Trust & Dispute Management</h2>
        <p className="text-sm text-slate-600 mt-1">
          Investigate customer complaints, seller delivery disputes, and evidence photos, and issue binding resolutions.
        </p>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
      {message && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-semibold">{message}</div>}

      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-500">Loading open disputes...</p>
        ) : disputes.length === 0 ? (
          <p className="text-sm text-slate-500">No active customer or seller disputes filed.</p>
        ) : (
          <div className="space-y-4">
            {disputes.map((d) => (
              <div key={d._id} className="p-4 rounded-lg border border-slate-200 space-y-3 bg-slate-50">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {d.title || `Dispute #${d._id.slice(-6).toUpperCase()}`}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        Order: <strong>{d.orderId?.orderNumber || (typeof d.orderId === 'object' ? d.orderId?._id : d.orderId)}</strong>
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-600 flex flex-wrap gap-4">
                      <span>Customer: <strong>{d.customerId?.fullName || d.customerId?.email || 'Customer'}</strong></span>
                      <span>Seller: <strong>{d.sellerId?.fullName || d.sellerId?.email || 'Seller'}</strong></span>
                    </div>
                    <p className="text-xs text-slate-700 mt-2 bg-white p-2.5 rounded border border-slate-200">
                      <strong>Reason:</strong> {d.reason || d.description || 'No detailed reason provided.'}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                    d.status === 'open' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {d.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Resolution rationale..."
                    value={resolutionNotes[d._id] || ''}
                    onChange={(e) => setResolutionNotes({ ...resolutionNotes, [d._id]: e.target.value })}
                    className="px-3 py-1 rounded border border-slate-300 text-xs flex-1 min-w-[200px]"
                  />
                  <button
                    onClick={() => handleResolve(d._id, 'resolved_refunded')}
                    className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Resolve & Refund Buyer
                  </button>
                  <button
                    onClick={() => handleResolve(d._id, 'resolved_rejected')}
                    className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Dismiss Dispute
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

