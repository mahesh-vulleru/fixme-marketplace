import React, { useEffect, useState } from 'react';
import { ICart, CheckoutSessionData } from '@fixme/api-contracts';
import { apiRequest } from '../services/apiClient';
import { formatPaiseToINR } from '../utils/currency';
import { ShoppingCart, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';

export const CartPage: React.FC = () => {
  const [cart, setCart] = useState<ICart | null>(null);
  const [checkoutData, setCheckoutData] = useState<CheckoutSessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const [shippingAddress, setShippingAddress] = useState({
    fullName: 'Rohan Sharma',
    phone: '9876543210',
    line1: '100 Feet Road, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560038',
    country: 'IN' as const,
  });

  const loadCart = () => {
    apiRequest<ICart>('/cart')
      .then(setCart)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Sign in to view your cart')
      );
  };

  useEffect(() => {
    loadCart();
  }, []);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<CheckoutSessionData>('/checkout', {
        method: 'POST',
        body: JSON.stringify({ shippingAddress }),
      });
      setCheckoutData(res);
      loadCart();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2.5 mb-2">
          <ShoppingCart className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-900">
            Server-Recalculated Spare Parts Cart
          </h1>
        </div>
        <p className="text-sm text-slate-600">
          All item prices, GST, shipping, and stock availability are recalculated on the backend in integer paise (`₹1.00 = 100 paise`).
        </p>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {checkoutData && (
          <div className="mt-6 p-5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-base">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Order {checkoutData.order.orderNumber} Created & Stock Reserved Atomically!</span>
            </div>
            <p className="text-xs font-mono">
              Payment Intent: {checkoutData.paymentIntent.providerOrderId} • Amount:{' '}
              {formatPaiseToINR(checkoutData.paymentIntent.amountPaise)} ({checkoutData.paymentIntent.amountPaise} paise)
            </p>
            <p className="text-xs">
              Split into {checkoutData.order.subOrders.length} Seller Suborder(s). Stock reservation expires at{' '}
              {new Date(checkoutData.order.reservationExpiresAt).toLocaleTimeString()}.
            </p>
          </div>
        )}

        {cart && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 divide-y divide-slate-200">
              {cart.items.length === 0 ? (
                <div className="py-8 text-sm text-slate-500">Your cart is currently empty.</div>
              ) : (
                cart.items.map((item) => (
                  <div key={item.listingId} className="py-4 flex items-center justify-between gap-4">
                    <div>
                      <span className="font-bold text-slate-900 block">{item.title}</span>
                      <span className="text-xs text-slate-500">
                        Condition: {item.condition.toUpperCase()} • Qty: {item.quantity} • Available:{' '}
                        {item.stockAvailable}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 block">
                        {formatPaiseToINR(item.lineTotalPaise)}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {item.lineTotalPaise} paise
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
              <h2 className="font-bold text-slate-900 text-base">Paise-Exact Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-mono font-semibold">{formatPaiseToINR(cart.subtotalPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Shipping</span>
                  <span className="font-mono font-semibold">{formatPaiseToINR(cart.shippingPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">GST (18%)</span>
                  <span className="font-mono font-semibold">{formatPaiseToINR(cart.taxPaise)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-base">
                  <span>Grand Total</span>
                  <span className="font-mono text-blue-700">{formatPaiseToINR(cart.totalPaise)}</span>
                </div>
              </div>

              <form onSubmit={handleCheckout} className="space-y-3 pt-3 border-t border-slate-200">
                <input
                  type="text"
                  value={shippingAddress.fullName}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, fullName: e.target.value })}
                  placeholder="Full Name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white"
                  required
                />
                <input
                  type="text"
                  value={shippingAddress.line1}
                  onChange={(e) => setShippingAddress({ ...shippingAddress, line1: e.target.value })}
                  placeholder="Address Line 1"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                    placeholder="City"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white"
                    required
                  />
                  <input
                    type="text"
                    value={shippingAddress.postalCode}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                    placeholder="PIN Code"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs bg-white"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || cart.items.length === 0}
                  className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {loading ? 'Reserving Stock...' : 'Reserve Stock & Checkout'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

