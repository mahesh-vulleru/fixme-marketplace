import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Cpu, Layers, Search, ArrowRight, CheckCircle2 } from 'lucide-react';

export const HomePage: React.FC = () => {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white p-8 sm:p-10 shadow-lg border border-slate-800">
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
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to="/compatibility"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-sm transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              Check Compatibility
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
            <Link
              to="/wanted"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm transition-colors"
            >
              <Search className="w-4 h-4 text-amber-400" />
              Request Hard-to-Find Part
            </Link>
          </div>
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
            <CheckCircle2 className="w-5 h-5" />
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
    </div>
  );
};

