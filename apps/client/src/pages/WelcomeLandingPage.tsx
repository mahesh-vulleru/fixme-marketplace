import React from 'react';
import { Link } from 'react-router-dom';
import { Wrench, ShieldCheck, Cpu, ArrowRight, UserCheck, Layers, HelpCircle, Store } from 'lucide-react';

export const WelcomeLandingPage: React.FC = () => {
  return (
    <div className="space-y-12 py-4">
      {/* Hero Welcome Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-8 sm:p-14 border border-slate-800 shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold tracking-wide">
            <Wrench className="w-4 h-4 text-blue-400" />
            FIXME.COM — VERIFIED ELECTRONICS SPARE-PARTS MARKETPLACE
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
            Find the Part. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">
              Fix the Device.
            </span>
          </h1>

          <p className="text-slate-300 text-lg leading-relaxed">
            Welcome to FixMe.com. Connect with verified spare-parts vendors across India.
            Eliminate wrong-part returns with our canonical device-model compatibility verification
            and integer-paise order settlement.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base shadow-lg shadow-blue-900/40 transition-all cursor-pointer"
            >
              Sign In to Your Account
              <ArrowRight className="w-5 h-5 ml-1" />
            </Link>

            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-base border border-slate-700 transition-all cursor-pointer"
            >
              <UserCheck className="w-5 h-5 text-emerald-400" />
              Register Customer Account
            </Link>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Highlights for Buyers & Techs */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Verified Compatibility</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Spare parts verified strictly against canonical OEM device models and part numbers.
            No guesswork and no unverified cross-device compatibility.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5">
            <Cpu className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Canonical Spare-Part Database</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Access thousands of OEM smartphone screens, batteries, charging ports, camera modules,
            and true-wireless audio parts.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-5">
            <Layers className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Atomic Inventory & INR Escrow</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Real-time stock reservation prevents overselling. Multi-vendor order splits and protected
            paise-precision payments ensure safe delivery.
          </p>
        </div>
      </section>

      {/* Role / Port Portal Guide */}
      <section className="rounded-2xl bg-slate-100 border border-slate-200 p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              FixMe.com Architecture Portals
            </span>
            <h3 className="text-base font-bold text-slate-900">
              Are you an electronics spare-parts vendor or platform administrator?
            </h3>
            <p className="text-sm text-slate-600">
              FixMe.com runs dedicated portals for each role. Sign in with your work email or navigate directly.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="http://localhost:5175"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
            >
              <Store className="w-4 h-4" />
              Seller Hub (Port 5175)
            </a>
            <a
              href="http://localhost:5174"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-semibold transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              Admin Console (Port 5174)
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

