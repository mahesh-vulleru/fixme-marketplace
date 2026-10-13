import React, { useEffect, useState } from 'react';
import { HealthCheckData } from '@fixme/api-contracts';
import { healthService } from '../services/apiClient';
import { Activity, CheckCircle2, AlertTriangle, ShieldCheck, Cpu, Layers } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [health, setHealth] = useState<HealthCheckData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    healthService
      .checkHealth()
      .then((res) => {
        if (mounted) {
          setHealth(res);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unable to reach FixMe API');
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white p-8 shadow-lg border border-slate-800">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            Verified Device-to-Part Compatibility Engine
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Find the Exact Spare Part. Fix the Device Right the First Time.
          </h1>
          <p className="text-slate-300 text-base leading-relaxed">
            Every spare part on FixMe.com is matched against canonical device model numbers, OEM part numbers,
            and structured compatibility records—eliminating wrong-part returns for repair shops and DIY technicians.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <Cpu className="w-5 h-5" />
          </div>
          <h2 className="font-bold text-slate-900">Canonical Part Catalogue</h2>
          <p className="text-sm text-slate-600 mt-1">
            Canonical part definitions separated cleanly from multi-vendor seller listings, grades, and warranties.
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="font-bold text-slate-900">Exact Compatibility Records</h2>
          <p className="text-sm text-slate-600 mt-1">
            Never guessed from listing titles—verified against exact device model codes and technician notes.
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
            <Layers className="w-5 h-5" />
          </div>
          <h2 className="font-bold text-slate-900">Atomic Stock & Paise Precision</h2>
          <p className="text-sm text-slate-600 mt-1">
            All prices stored and calculated in integer paise with atomic stock reservations during checkout.
          </p>
        </div>
      </section>

      <section className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Live Backend API Health Status</h2>
          </div>
          <span className="text-xs font-mono text-slate-500">GET /api/v1/health</span>
        </div>

        {loading && (
          <div className="text-sm text-slate-500 animate-pulse">Checking API connectivity...</div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>API Connection Error: {error}</span>
          </div>
        )}

        {health && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 block">Status</span>
              <span className="font-semibold text-emerald-700 inline-flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
                {health.status.toUpperCase()}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 block">Database</span>
              <span className="font-semibold text-slate-900 mt-0.5 block">
                {health.database.toUpperCase()}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 block">Service Version</span>
              <span className="font-mono font-semibold text-slate-900 mt-0.5 block">
                {health.service} v{health.version}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 block">Timestamp</span>
              <span className="font-mono font-semibold text-slate-900 mt-0.5 block truncate">
                {health.timestamp}
              </span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

