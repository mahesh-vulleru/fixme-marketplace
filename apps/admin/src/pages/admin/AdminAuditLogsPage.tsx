import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../services/apiClient';

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<any[]>('/admin/audit-logs')
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Immutable Security & Governance Audit Trail</h2>
        <p className="text-sm text-slate-600 mt-1">
          Every privileged action (role assignment, seller approval, password reset, refund payout, dispute resolution) is recorded with actor and target metadata.
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-500">Loading audit logs...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-slate-500">No audit log entries recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                  <th className="py-2 pr-4">Timestamp</th>
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4">Actor Role</th>
                  <th className="py-2 pr-4">Target</th>
                  <th className="py-2">Reason / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td className="py-2.5 pr-4 text-xs text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs font-bold text-indigo-700">
                      {log.action}
                    </td>
                    <td className="py-2.5 pr-4 text-xs font-semibold uppercase text-slate-700">
                      {log.actorRole}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-slate-600">
                      {log.targetType} ({String(log.targetId || '').slice(-8)})
                    </td>
                    <td className="py-2.5 text-xs text-slate-600">
                      {log.reason || JSON.stringify(log.metadata || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

