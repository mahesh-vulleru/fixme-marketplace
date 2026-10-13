import React, { useEffect, useState } from 'react';
import { HealthCheckData } from '@fixme/api-contracts';
import { healthService } from '../../services/apiClient';
import { Activity, CheckCircle2, AlertTriangle } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [health, setHealth] = useState<HealthCheckData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    healthService
      .checkHealth()
      .then(setHealth)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'API check failed')
      );
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Marketplace Governance & Catalogue Console</h2>
        <p className="text-sm text-slate-600 mt-1">
          Manage canonical categories, brands, devices, parts, structured compatibility records, seller verification, and audit logs.
        </p>
      </div>

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

