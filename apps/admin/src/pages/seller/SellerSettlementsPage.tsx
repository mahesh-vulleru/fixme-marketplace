import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/apiClient';

export const SellerSettlementsPage: React.FC = () => {
  const [subOrders, setSubOrders] = useState<any[]>([]);
  const [storeName, setStoreName] = useState('');
  const [legalBusinessName, setLegalBusinessName] = useState('');
  const [gstin, setGstin] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [bankAccountMasked, setBankAccountMasked] = useState('XXXX-XXXX-4821');
  const [ifscCode, setIfscCode] = useState('HDFC0001234');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<any[]>('/seller/orders')
      .then(setSubOrders)
      .catch(() => setSubOrders([]));
  }, []);

  const totalGrossPaise = subOrders.reduce((acc, item) => acc + ((item.subOrder || item).subTotalPaise || 0), 0);
  const totalCommissionPaise = subOrders.reduce((acc, item) => acc + ((item.subOrder || item).commissionPaise || 0), 0);
  const totalNetPayoutPaise = subOrders.reduce((acc, item) => acc + ((item.subOrder || item).sellerNetPayoutPaise || 0), 0);

  const handleApplySeller = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      await apiRequest('/seller/apply', {
        method: 'POST',
        body: JSON.stringify({
          storeName,
          legalBusinessName,
          gstin: gstin || undefined,
          supportEmail: 'support@vendor.fixme.com',
          supportPhone,
          bankAccountMasked,
          ifscCode,
          kycDocumentAssetIds: [],
          pickupAddress: {
            fullName: storeName,
            phone: supportPhone,
            line1: 'Electronics Hub Phase 2',
            city: 'Bengaluru',
            state: 'Karnataka',
            postalCode: '560100',
            country: 'IN'
          }
        })
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
          Transparent integer-paise breakdown of gross sub-order sales, 10% platform commission, and net vendor payout.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Gross Sub-Order Sales</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">₹{(totalGrossPaise / 100).toFixed(2)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Platform Commission (10%)</span>
          <p className="text-2xl font-bold text-rose-600 mt-1">-₹{(totalCommissionPaise / 100).toFixed(2)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase">Net Seller Payout</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">₹{(totalNetPayoutPaise / 100).toFixed(2)}</p>
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>}
      {message && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-semibold">{message}</div>}

      <form onSubmit={handleApplySeller} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 font-bold text-slate-900">Seller KYC & Payout Account Onboarding</div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Public Store Name</label>
          <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} required placeholder="Apex Circuit Spares" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Legal Business Name</label>
          <input type="text" value={legalBusinessName} onChange={(e) => setLegalBusinessName(e.target.value)} required placeholder="Apex Circuit Spares Pvt Ltd" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN</label>
          <input type="text" value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="29ABCDE1234F1Z5" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Support Phone</label>
          <input type="tel" value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} required placeholder="+91 9876543210" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Masked Bank Account</label>
          <input type="text" value={bankAccountMasked} onChange={(e) => setBankAccountMasked(e.target.value)} required className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code</label>
          <input type="text" value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} required className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm" />
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

