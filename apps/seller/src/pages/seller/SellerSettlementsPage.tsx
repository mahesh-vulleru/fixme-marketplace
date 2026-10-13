import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/apiClient';

export const SellerSettlementsPage: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [storeName, setStoreName] = useState('');
  const [gstin, setGstin] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<any>('/seller/payouts')
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  const handleApplySeller = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
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
      setMessage('Seller KYC onboarding application submitted for admin review.');
    } catch (err: any) {
      setError(err.message || 'Seller onboarding submission failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Vendor Settlements, Commissions & KYC Profile</h2>
        <p className="text-sm text-slate-600 mt-1">
          Transparent integer-paise breakdown of gross sub-order sales, platform commission, and net vendor payout.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Gross Sub-Order Sales</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            ₹{((summary?.totalGrossSalesPaise || 0) / 100).toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Platform Fees</span>
          <p className="text-2xl font-bold text-rose-600 mt-1">
            -₹{((summary?.totalPlatformFeesPaise || 0) / 100).toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Eligible Seller Settlement</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">
            ₹{((summary?.eligibleSettlementPaise || 0) / 100).toFixed(2)}
          </p>
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
      {message && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-semibold">{message}</div>}

      <form onSubmit={handleApplySeller} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 font-bold text-slate-900">Seller KYC & Business Verification Application</div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Public Store Name</label>
          <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} required placeholder="Apex Circuit Spares" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN (10–20 chars)</label>
          <input type="text" value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="29ABCDE1234F1Z5" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">PAN Number (10 chars)</label>
          <input type="text" value={panNumber} onChange={(e) => setPanNumber(e.target.value)} placeholder="ABCDE1234F" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Business Address</label>
          <input type="text" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} required placeholder="SP Road Electronics Market, Bengaluru 560002" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold cursor-pointer">
            Submit Seller KYC Application
          </button>
        </div>
      </form>
    </div>
  );
};

