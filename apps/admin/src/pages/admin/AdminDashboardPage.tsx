import React, { useEffect, useState } from 'react';
import { HealthCheckData } from '@fixme/api-contracts';
import { apiRequest, healthService } from '../../services/apiClient';
import { Activity, CheckCircle2, AlertTriangle } from 'lucide-react';

interface DashboardMetrics {
  totalUsers: number;
  totalSellers: number;
  pendingSellers: number;
  totalDevices: number;
  totalParts: number;
  activeListings: number;
  pendingListings: number;
  totalOrders: number;
  openDisputes: number;
  pendingReturns: number;
  grossMerchandiseValuePaise: number;
  platformCommissionTotalPaise: number;
}

export const AdminDashboardPage: React.FC = () => {
  const [health, setHealth] = useState<HealthCheckData | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    healthService
      .checkHealth()
      .then(setHealth)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'API check failed')
      );

    apiRequest<DashboardMetrics>('/admin/dashboard')
      .then(setMetrics)
      .catch(() => setMetrics(null));
  }, []);

  const formatINR = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Marketplace Governance & Real-Time Metrics</h2>
        <p className="text-sm text-slate-600 mt-1">
          Live operational telemetry queried directly from MongoDB collections — no hardcoded dashboard counters.
        </p>
      </div>

      {metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase">Paid GMV</span>
            <p className="text-xl font-bold text-slate-900 mt-1">{formatINR(metrics.grossMerchandiseValuePaise)}</p>
            <span className="text-xs text-emerald-600 font-medium">
              Commission: {formatINR(metrics.platformCommissionTotalPaise)}
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase">Users & Sellers</span>
            <p className="text-xl font-bold text-slate-900 mt-1">
              {metrics.totalUsers} Users / {metrics.totalSellers} Sellers
            </p>
            <span className="text-xs text-amber-600 font-medium">
              {metrics.pendingSellers} Pending KYC Approval
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase">Catalogue & Listings</span>
            <p className="text-xl font-bold text-slate-900 mt-1">
              {metrics.activeListings} Active Listings
            </p>
            <span className="text-xs text-slate-500">
              {metrics.totalDevices} Devices • {metrics.totalParts} Parts ({metrics.pendingListings} pending)
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase">Orders & Disputes</span>
            <p className="text-xl font-bold text-slate-900 mt-1">{metrics.totalOrders} Orders</p>
            <span className="text-xs text-rose-600 font-medium">
              {metrics.openDisputes} Open Disputes • {metrics.pendingReturns} Pending Returns
            </span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900">Shared API v1 Health Check</h3>
          </div>
          <span className="text-xs font-mono text-slate-500">GET /api/v1/health</span>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {health && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 block">API Status</span>
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
              <span className="text-xs text-slate-500 block">Service</span>
              <span className="font-mono font-semibold text-slate-900 mt-0.5 block">
                {health.service}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-500 block">Environment</span>
              <span className="font-mono font-semibold text-slate-900 mt-0.5 block">
                {health.environment}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
