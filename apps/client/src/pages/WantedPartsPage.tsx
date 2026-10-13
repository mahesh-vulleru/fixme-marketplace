import React, { useEffect, useState } from 'react';
import { apiRequest } from '../services/apiClient';
import { formatPaiseToINR } from '../utils/currency';
import { Search, PlusCircle } from 'lucide-react';

export const WantedPartsPage: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    apiRequest<any[]>('/wanted-requests')
      .then(setRequests)
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Search className="w-5 h-5 text-amber-500" />
            <h1 className="text-2xl font-bold text-slate-900">Wanted Spare Parts Board</h1>
          </div>
          <p className="text-sm text-slate-600">
            Can’t find a rare board or single earbud? Post a wanted-part request and receive verified seller offers.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
          <PlusCircle className="w-4 h-4" />
          {requests.length} Open Request(s)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {requests.map((req) => (
          <div key={req._id} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                {req.componentType}
              </span>
              <span className="text-xs font-mono font-bold text-slate-900">
                Max Budget: {formatPaiseToINR(req.maxBudgetPaise)}
              </span>
            </div>
            <h2 className="font-bold text-slate-900">
              {req.deviceId?.modelName} ({req.deviceId?.modelNumber})
            </h2>
            <p className="text-sm text-slate-600">{req.description}</p>
            <div className="pt-2 text-xs text-slate-500">
              Offers Received: {req.offers?.length || 0}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

