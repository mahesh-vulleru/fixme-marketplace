import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IDevice, IPart, CompatibilityCheckResult } from '@fixme/api-contracts';
import { apiRequest } from '../services/apiClient';
import { formatPaiseToINR } from '../utils/currency';
import { ShieldCheck, ShieldAlert, Search, Cpu, CheckCircle2, XCircle } from 'lucide-react';

export const CompatibilityFinderPage: React.FC = () => {
  const [devices, setDevices] = useState<IDevice[]>([]);
  const [parts, setParts] = useState<IPart[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [checkResult, setCheckResult] = useState<CompatibilityCheckResult | null>(null);
  const [deviceParts, setDeviceParts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    Promise.all([
      apiRequest<IDevice[]>('/devices'),
      apiRequest<IPart[]>('/parts'),
    ])
      .then(([devs, prts]) => {
        setDevices(devs);
        setParts(prts);
        if (devs.length > 0) setSelectedDeviceId(devs[0]._id);
        if (prts.length > 0) setSelectedPartId(prts[0]._id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedDeviceId) return;
    apiRequest<{ compatibleParts: any[] }>(`/devices/${selectedDeviceId}/parts`)
      .then((res) => setDeviceParts(res.compatibleParts || []))
      .catch(() => setDeviceParts([]));
  }, [selectedDeviceId]);

  const handleCheckCompatibility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeviceId || !selectedPartId) return;
    setLoading(true);
    try {
      const res = await apiRequest<CompatibilityCheckResult>('/compatibility/check', {
        method: 'POST',
        body: JSON.stringify({
          deviceId: selectedDeviceId,
          partId: selectedPartId,
        }),
      });
      setCheckResult(res);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2.5 mb-2">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
          <h1 className="text-2xl font-bold text-slate-900">
            Exact Device-to-Part Compatibility Verifier
          </h1>
        </div>
        <p className="text-sm text-slate-600">
          FixMe never guesses compatibility from free-text listing titles. Select your exact device model number and canonical spare part below to verify structural and electrical fitment.
        </p>

        <form onSubmit={handleCheckCompatibility} className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              1. Select Canonical Device Model
            </label>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white"
            >
              {devices.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.modelName} ({d.modelNumber})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              2. Select Canonical Spare Part
            </label>
            <select
              value={selectedPartId}
              onChange={(e) => setSelectedPartId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white"
            >
              {parts.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} [{p.partNumber}]
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !selectedDeviceId || !selectedPartId}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            {loading ? 'Verifying Fitment...' : 'Verify Compatibility'}
          </button>
        </form>

        {checkResult && (
          <div
            className={`mt-6 p-5 rounded-xl border ${
              checkResult.compatible
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-red-50 border-red-300 text-red-950'
            }`}
          >
            <div className="flex items-start gap-3">
              {checkResult.compatible ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="font-bold text-base">
                  {checkResult.compatible
                    ? 'VERIFIED COMPATIBLE — Exact Fitment Confirmed'
                    : `NOT VERIFIED (${checkResult.verificationStatus.toUpperCase()}) — Do Not Purchase for This Device`}
                </div>
                <p className="text-sm opacity-90">{checkResult.evidenceNotes}</p>
                {checkResult.sourceType && (
                  <p className="text-xs font-mono opacity-75">
                    Verification Source: {checkResult.sourceType} • Active Listings: {checkResult.matchingListingsCount}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Cpu className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">
            Verified Compatible Parts for Selected Device
          </h2>
        </div>

        {deviceParts.length === 0 ? (
          <div className="text-sm text-slate-500 py-4 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span>No verified parts found for this device yet.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deviceParts.map((entry) => (
              <div
                key={entry.part._id}
                className="p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {entry.part.partNumber}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {entry.compatibility.verificationStatus.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 mt-2">{entry.part.name}</h3>
                  <p className="text-xs text-slate-600 mt-1">{entry.compatibility.evidenceNotes}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-xs text-slate-500 block">Starting From</span>
                    <span className="font-bold text-slate-900">
                      {entry.lowestPricePaise !== null
                        ? formatPaiseToINR(entry.lowestPricePaise)
                        : 'Out of Stock'}
                    </span>
                  </div>
                  <Link
                    to={`/parts/${entry.part._id}`}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                  >
                    View {entry.listings.length} Seller Listing(s)
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

