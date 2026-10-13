import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

export const PoliciesPage: React.FC = () => {
  const [policies, setPolicies] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/policies')
      .then((data) => setPolicies(data))
      .catch(() => setPolicies(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading marketplace policies...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ background: '#0f172a', color: '#fff', padding: '2rem', borderRadius: '12px' }}>
        <span style={{ background: '#1e293b', color: '#93c5fd', padding: '0.25rem 0.65rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
          MARKETPLACE GOVERNANCE & TRANSPARENCY
        </span>
        <h1 style={{ margin: '0.6rem 0 0.35rem', fontSize: '1.75rem' }}>FixMe.com Legal, Return & Pricing Policies</h1>
        <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.95rem' }}>
          Clear rules for spare-part condition grading, compatibility guarantees, privacy protection, and integer-paise billing.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
        <section style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.15rem', color: '#0f172a' }}>Pricing & Tax Transparency</h2>
          <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6 }}>
            All prices are computed in integer <strong>{policies?.pricingPolicy?.currency || 'INR'}</strong> minor units (paise) to eliminate floating-point rounding discrepancies.
          </p>
          <ul style={{ color: '#334155', fontSize: '0.88rem', lineHeight: 1.7, paddingLeft: '1.2rem' }}>
            <li>GST Rate: <strong>{policies?.pricingPolicy?.gstRatePercent ?? 18}%</strong></li>
            <li>Standard Shipping: <strong>₹{((policies?.pricingPolicy?.standardShippingPaise ?? 9900) / 100).toFixed(2)}</strong></li>
            <li>Free Shipping Threshold: <strong>₹{((policies?.pricingPolicy?.freeShippingThresholdPaise ?? 200000) / 100).toFixed(2)}</strong></li>
            <li>Platform Vendor Commission: <strong>{policies?.pricingPolicy?.platformCommissionPercent ?? 10}%</strong></li>
          </ul>
        </section>

        <section style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.15rem', color: '#0f172a' }}>Return & Refund Policy</h2>
          <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6 }}>
            {policies?.returnRefundPolicy?.summary ||
              'Customers may request a return within 7 days of delivery for defective, damaged, or mis-shipped parts. Refunds are issued only after gateway confirmation.'}
          </p>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 0 }}>
            Return Window: <strong>{policies?.returnRefundPolicy?.returnWindowDays ?? 7} calendar days</strong> from confirmed delivery.
          </p>
        </section>

        <section style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.15rem', color: '#0f172a' }}>Seller & Condition Grading Policy</h2>
          <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6 }}>
            {policies?.sellerPolicy?.summary ||
              'All sellers must complete KYC verification before listings become publicly purchasable. Every part must declare condition (OEM, Aftermarket, Refurbished, Used Pull, or For Parts).'}
          </p>
        </section>

        <section style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.15rem', color: '#0f172a' }}>Privacy & Security Policy</h2>
          <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.6 }}>
            {policies?.privacyPolicy?.summary ||
              'FixMe.com collects only the contact, shipping, and transaction records required to fulfill spare-part orders, honour warranties, and prevent fraud.'}
          </p>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 0 }}>
            KYC documents and dispute evidence are stored as private assets accessible only to the owner and authorized compliance staff.
          </p>
        </section>
      </div>
    </div>
  );
};

