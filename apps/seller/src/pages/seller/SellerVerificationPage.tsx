import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';

export const SellerVerificationPage: React.FC = () => {
  const { user, sellerProfile, refreshSession } = useAuth();
  const [storeName, setStoreName] = useState(sellerProfile?.storeName || '');
  const [gstin, setGstin] = useState(sellerProfile?.gstin || '');
  const [panNumber, setPanNumber] = useState(sellerProfile?.panNumber || '');
  const [businessAddress, setBusinessAddress] = useState(sellerProfile?.businessAddress || '');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sellerProfile) {
      if (sellerProfile.storeName) setStoreName(sellerProfile.storeName);
      if (sellerProfile.gstin) setGstin(sellerProfile.gstin);
      if (sellerProfile.panNumber) setPanNumber(sellerProfile.panNumber);
      if (sellerProfile.businessAddress) setBusinessAddress(sellerProfile.businessAddress);
    }
  }, [sellerProfile]);

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

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Seller Registration & Verification Onboarding</h2>
        <p className="text-sm text-slate-600 mt-1">
          Complete KYC document compliance and verify your commercial trade credentials to activate live marketplace selling.
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-2">Current Verification Status</h3>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wider ${sellerProfile?.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
            Status: {sellerProfile?.status || 'Pending Application'}
          </span>
          <span className="text-xs text-slate-500">
            Account Role: <strong>{user?.role}</strong>
          </span>
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
      {message && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-semibold">{message}</div>}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900">Update / Submit KYC Business Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Store Name *</label>
            <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} required placeholder="Apex Circuit Spares Hub" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN (10–20 chars)</label>
            <input type="text" value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="29AABCU9603R1ZM" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Permanent Account Number (PAN)</label>
            <input type="text" value={panNumber} onChange={(e) => setPanNumber(e.target.value)} placeholder="AABCU9603R" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Trade Operating Address *</label>
            <input type="text" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} required placeholder="SP Road Electronics Market, Bengaluru 560002" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
        >
          {submitting ? 'Submitting...' : 'Submit Verification Application'}
        </button>
      </form>
    </div>
  );
};

