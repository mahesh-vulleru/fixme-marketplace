import React, { useEffect, useState } from 'react';
import { HealthCheckData } from '@fixme/api-contracts';
import { healthService } from '../../services/apiClient';
import { Activity, CheckCircle2, AlertTriangle } from 'lucide-react';

export const SellerDashboardPage: React.FC = () => {
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
        <h2 className="text-lg font-bold text-slate-900">Seller Inventory, Suborders & Settlements</h2>
        <p className="text-sm text-slate-600 mt-1">
          Create listings linked to canonical spare parts, manage stock movements, fulfill seller suborders, and respond to wanted-part requests.
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900">Backend API Connection</h3>
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
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
            <span>Connected to {health.service} ({health.database})</span>
          </div>
        )}
      </div>
    </div>
  );
};

