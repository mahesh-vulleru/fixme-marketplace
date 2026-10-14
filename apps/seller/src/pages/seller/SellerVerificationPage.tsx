import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, ShieldAlert, Clock, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export const SellerVerificationPage: React.FC = () => {
  const { user, sellerProfile, refreshSession } = useAuth();
  const [storeName, setStoreName] = useState(sellerProfile?.storeName || '');
  const [gstin, setGstin] = useState(sellerProfile?.gstin || '');
  const [panNumber, setPanNumber] = useState(sellerProfile?.panNumber || '');
  const [businessAddress, setBusinessAddress] = useState(sellerProfile?.businessAddress || '');
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (sellerProfile) {
      if (sellerProfile.storeName) setStoreName(sellerProfile.storeName);
      if (sellerProfile.gstin) setGstin(sellerProfile.gstin);
      if (sellerProfile.panNumber) setPanNumber(sellerProfile.panNumber);
      if (sellerProfile.businessAddress) setBusinessAddress(sellerProfile.businessAddress);
    }
  }, [sellerProfile]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshSession();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      await apiRequest('/seller/apply', {
        method: 'POST',
        body: JSON.stringify({
          storeName: storeName.trim(),
          gstin: gstin.trim() || undefined,
          panNumber: panNumber.trim() || undefined,
          businessAddress: businessAddress.trim(),
          verificationDocumentAssetIds: [],
        }),
      });
      setMessage('Seller verification details submitted for administrator review.');
      await refreshSession();
    } catch (err: any) {
      setError(err.message || 'Could not submit verification application.');
    } finally {
      setSubmitting(false);
    }
  };

  const status = sellerProfile?.status || 'pending';
  const isApproved = status === 'approved';
  const isPending = status === 'pending';
  const isSuspended = status === 'suspended';
  const isRejected = status === 'rejected';

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Seller Registration & Verification Onboarding</h2>
        <p className="text-sm text-slate-600 mt-1">
          Complete KYC compliance and verify your commercial trade credentials to activate live marketplace catalog publishing and wanted-parts bidding.
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-bold text-slate-900">Current Verification Status</h3>
            <p className="text-xs text-slate-500">Live credential status evaluated by FixMe Trust & Safety</p>
          </div>
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer self-start sm:self-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            {refreshing ? 'Refreshing...' : 'Re-check Status'}
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={`text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${
              isApproved
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : isPending
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {isApproved ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : isPending ? (
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            )}
            Status: {status}
          </span>
          <span className="text-xs text-slate-500">
            Account Role: <strong>{user?.role}</strong> • Email: <strong>{user?.email}</strong>
          </span>
        </div>

        {isApproved && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong>Verified Merchant Privileges Active:</strong> Your commercial seller account is fully approved. You may create live catalog listings, update stock levels, and submit price quotes on customer wanted-part requests.
            </div>
          </div>
        )}

        {isPending && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Application Under Administrator Review:</strong> Your commercial information has been received. Listing creation and wanted-part bidding remain locked until review is completed by marketplace administrators.
            </div>
          </div>
        )}

        {sellerProfile?.reviewNotes && (
          <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <strong>Administrator Review Notes:</strong> {sellerProfile.reviewNotes}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900">
          {isApproved ? 'Update Commercial KYC Details' : 'Submit Commercial KYC Information'}
        </h3>
        <p className="text-xs text-slate-500">
          Keep your statutory business address and tax credentials up-to-date to ensure timely settlements and tax invoice generation.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Store Name *</label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              required
              placeholder="Apex Circuit Spares Hub"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN (10–20 chars)</label>
            <input
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              placeholder="29AABCU9603R1ZM"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Permanent Account Number (PAN)</label>
            <input
              type="text"
              value={panNumber}
              onChange={(e) => setPanNumber(e.target.value)}
              placeholder="AABCU9603R"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Trade Operating Address *</label>
            <input
              type="text"
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
              required
              placeholder="SP Road Electronics Market, Bengaluru 560002"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer flex items-center gap-2"
        >
          {submitting ? 'Submitting Details...' : isApproved ? 'Update Business Details' : 'Submit Verification Application'}
        </button>
      </form>
    </div>
  );
};
export default SellerVerificationPage;
