import React, { useEffect, useState } from 'react';
import { IDevice, IPart, ICategory, IBrand } from '@fixme/api-contracts';
import { apiRequest } from '../../services/apiClient';
import { Cpu, ShieldCheck } from 'lucide-react';

export const AdminCataloguePage: React.FC = () => {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [brands, setBrands] = useState<IBrand[]>([]);
  const [devices, setDevices] = useState<IDevice[]>([]);
  const [parts, setParts] = useState<IPart[]>([]);

  useEffect(() => {
    Promise.all([
      apiRequest<ICategory[]>('/categories'),
      apiRequest<IBrand[]>('/brands'),
      apiRequest<IDevice[]>('/devices'),
      apiRequest<IPart[]>('/parts'),
    ])
      .then(([cats, brds, devs, prts]) => {
        setCategories(cats);
        setBrands(brds);
        setDevices(devs);
        setParts(prts);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-900">
            Canonical Catalogue & Structured Compatibility Registry
          </h2>
        </div>
        <p className="text-sm text-slate-600">
          Platform-owned hardware taxonomy. Canonical parts define OEM numbers and technical specs without seller pricing.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block">Categories</span>
            <span className="text-xl font-bold text-slate-900">{categories.length}</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block">Brands</span>
            <span className="text-xl font-bold text-slate-900">{brands.length}</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block">Canonical Devices</span>
            <span className="text-xl font-bold text-slate-900">{devices.length}</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block">Canonical Parts</span>
            <span className="text-xl font-bold text-slate-900">{parts.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-3">Canonical Devices</h3>
          <div className="divide-y divide-slate-100 text-sm">
            {devices.map((d) => (
              <div key={d._id} className="py-2.5 flex items-center justify-between">
                <span className="font-medium text-slate-900">{d.modelName}</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {d.modelNumber}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Canonical Spare Parts
          </h3>
          <div className="divide-y divide-slate-100 text-sm">
            {parts.map((p) => (
              <div key={p._id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-900 block">{p.name}</span>
                  <span className="text-xs text-slate-500">{p.componentType}</span>
                </div>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                  {p.partNumber}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

