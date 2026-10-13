import React, { useEffect, useState, useMemo } from 'react';
import { apiRequest } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Tag,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Truck,
  ShieldCheck,
  Package,
  Edit2,
  Trash2,
  Filter,
  Send,
  X,
} from 'lucide-react';

export interface SellerOfferItem {
  _id: string;
  sellerId: {
    _id: string;
    fullName?: string;
    storeName?: string;
  } | string;
  storeName?: string;
  offeredPricePaise: number;
  availableQuantity: number;
  condition: 'new' | 'refurbished' | 'used';
  leadTimeDays: number;
  warrantyDays?: number;
  shippingCostPaise?: number;
  compatibilityEvidence?: string;
  notes?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'expired';
  createdAt: string;
}

export interface SellerWantedRequestItem {
  _id: string;
  customerId: {
    _id: string;
    fullName?: string;
    email?: string;
  } | string;
  category: string;
  brand: string;
  deviceModel: string;
  componentType: string;
  partNumber?: string;
  description: string;
  quantity: number;
  requiredCondition: 'any' | 'new' | 'refurbished' | 'used';
  maxBudgetPaise?: number;
  deliveryCity: string;
  deliveryPostalCode: string;
  preferredDeliveryDate?: string;
  status: 'open' | 'fulfilled' | 'cancelled' | 'expired';
  acceptedOfferId?: string;
  offers: SellerOfferItem[];
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  'screen',
  'battery',
  'motherboard',
  'camera',
  'charging_port',
  'speaker',
  'housing',
  'keyboard',
  'cable',
  'other',
];

function formatRupeesFromPaise(paise: number | undefined | null): string {
  if (typeof paise !== 'number' || isNaN(paise)) return '₹0.00';
  return `₹${(paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const SellerWantedPage: React.FC = () => {
  const { user } = useAuth();

  const [requests, setRequests] = useState<SellerWantedRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // View & Filters
  const [activeTab, setActiveTab] = useState<'open' | 'my_offers'>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');

  // Target modal for Submitting Offer
  const [submittingToRequest, setSubmittingToRequest] = useState<SellerWantedRequestItem | null>(null);

  // Target modal for Editing Offer
  const [editingOfferData, setEditingOfferData] = useState<{
    requestId: string;
    offerId: string;
    requestSummary: string;
  } | null>(null);

  // Form State
  const [offerForm, setOfferForm] = useState({
    priceRupees: '',
    availableQuantity: 1,
    condition: 'new' as 'new' | 'refurbished' | 'used',
    leadTimeDays: 2,
    warrantyDays: 30,
    shippingCostRupees: '0',
    compatibilityEvidence: '',
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<SellerWantedRequestItem[]>('/wanted-requests');
      setRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load wanted-part requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const currentUserId = user?.id || (user as any)?._id || '';

  const getOfferSellerId = (offer: SellerOfferItem): string => {
    if (typeof offer.sellerId === 'object' && offer.sellerId !== null) {
      return (offer.sellerId as any)._id || (offer.sellerId as any).id || '';
    }
    return String(offer.sellerId || '');
  };

  // Find own offer on a request if one exists
  const getMyOfferForRequest = (req: SellerWantedRequestItem): SellerOfferItem | undefined => {
    if (!currentUserId) return undefined;
    return req.offers?.find((o) => getOfferSellerId(o) === currentUserId);
  };

  // All my submitted offers across all requests
  const mySubmittedOffers = useMemo(() => {
    if (!currentUserId) return [];
    const list: Array<{ request: SellerWantedRequestItem; offer: SellerOfferItem }> = [];
    for (const req of requests) {
      for (const off of req.offers || []) {
        if (getOfferSellerId(off) === currentUserId) {
          list.push({ request: req, offer: off });
        }
      }
    }
    return list;
  }, [requests, currentUserId]);

  // Filtered open requests for bidding
  const filteredOpenRequests = useMemo(() => {
    return requests.filter((req) => {
      if (req.status !== 'open') return false;

      if (categoryFilter && req.category !== categoryFilter) return false;
      if (brandFilter && req.brand.toLowerCase() !== brandFilter.toLowerCase()) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          req.componentType?.toLowerCase().includes(q) ||
          req.deviceModel?.toLowerCase().includes(q) ||
          req.brand?.toLowerCase().includes(q) ||
          req.partNumber?.toLowerCase().includes(q) ||
          req.description?.toLowerCase().includes(q) ||
          req.deliveryCity?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [requests, categoryFilter, brandFilter, searchQuery]);

  // Open Create Offer Modal
  const openSubmitOfferModal = (req: SellerWantedRequestItem) => {
    const existingOffer = getMyOfferForRequest(req);
    if (existingOffer) {
      openEditOfferModal(req, existingOffer);
      return;
    }

    setSubmittingToRequest(req);
    setOfferForm({
      priceRupees: req.maxBudgetPaise ? String(Math.round(req.maxBudgetPaise / 100)) : '999',
      availableQuantity: req.quantity || 1,
      condition: req.requiredCondition === 'any' ? 'new' : req.requiredCondition,
      leadTimeDays: 2,
      warrantyDays: 30,
      shippingCostRupees: '0',
      compatibilityEvidence: '',
      notes: 'Genuine tested component with warranty. Packaged in anti-static bag.',
    });
    setFormErrors({});
  };

  // Open Edit Offer Modal
  const openEditOfferModal = (req: SellerWantedRequestItem, offer: SellerOfferItem) => {
    setEditingOfferData({
      requestId: req._id,
      offerId: offer._id,
      requestSummary: `${req.componentType} for ${req.brand} ${req.deviceModel}`,
    });
    setOfferForm({
      priceRupees: String(offer.offeredPricePaise / 100),
      availableQuantity: offer.availableQuantity,
      condition: offer.condition,
      leadTimeDays: offer.leadTimeDays,
      warrantyDays: offer.warrantyDays ?? 0,
      shippingCostRupees: offer.shippingCostPaise ? String(offer.shippingCostPaise / 100) : '0',
      compatibilityEvidence: offer.compatibilityEvidence || '',
      notes: offer.notes || '',
    });
    setFormErrors({});
  };

  const validateOfferForm = () => {
    const errors: Record<string, string> = {};
    const price = Number(offerForm.priceRupees);
    if (!offerForm.priceRupees || isNaN(price) || price <= 0) {
      errors.priceRupees = 'Valid offer price in INR is required';
    }
    if (!offerForm.availableQuantity || offerForm.availableQuantity < 1) {
      errors.availableQuantity = 'Available quantity must be at least 1';
    }
    if (!offerForm.leadTimeDays || offerForm.leadTimeDays < 1) {
      errors.leadTimeDays = 'Dispatch lead time must be at least 1 day';
    }
    const shipping = Number(offerForm.shippingCostRupees);
    if (isNaN(shipping) || shipping < 0) {
      errors.shippingCostRupees = 'Shipping cost cannot be negative';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingToRequest) return;
    if (!validateOfferForm()) return;

    setActionInProgress(true);
    setError(null);
    try {
      const pricePaise = Math.round(Number(offerForm.priceRupees) * 100);
      const shippingPaise = Math.round(Number(offerForm.shippingCostRupees) * 100);

      await apiRequest(`/wanted-requests/${submittingToRequest._id}/offers`, {
        method: 'POST',
        body: JSON.stringify({
          offeredPricePaise: pricePaise,
          availableQuantity: Number(offerForm.availableQuantity),
          condition: offerForm.condition,
          leadTimeDays: Number(offerForm.leadTimeDays),
          warrantyDays: Number(offerForm.warrantyDays) || undefined,
          shippingCostPaise: shippingPaise,
          compatibilityEvidence: offerForm.compatibilityEvidence.trim() || undefined,
          notes: offerForm.notes.trim() || undefined,
        }),
      });

      setSuccessMessage('Your offer has been submitted to the customer.');
      setTimeout(() => setSuccessMessage(null), 4000);
      setSubmittingToRequest(null);
      await loadRequests();
    } catch (err: any) {
      setError(err.message || 'Could not submit offer.');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleUpdateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOfferData) return;
    if (!validateOfferForm()) return;

    setActionInProgress(true);
    setError(null);
    try {
      const pricePaise = Math.round(Number(offerForm.priceRupees) * 100);
      const shippingPaise = Math.round(Number(offerForm.shippingCostRupees) * 100);

      await apiRequest(
        `/wanted-requests/${editingOfferData.requestId}/offers/${editingOfferData.offerId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            offeredPricePaise: pricePaise,
            availableQuantity: Number(offerForm.availableQuantity),
            condition: offerForm.condition,
            leadTimeDays: Number(offerForm.leadTimeDays),
            warrantyDays: Number(offerForm.warrantyDays) || undefined,
            shippingCostPaise: shippingPaise,
            compatibilityEvidence: offerForm.compatibilityEvidence.trim() || undefined,
            notes: offerForm.notes.trim() || undefined,
          }),
        }
      );

      setSuccessMessage('Offer updated successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
      setEditingOfferData(null);
      await loadRequests();
    } catch (err: any) {
      setError(err.message || 'Could not update offer.');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleWithdrawOffer = async (requestId: string, offerId: string) => {
    if (!window.confirm('Are you sure you want to withdraw this offer?')) return;

    setActionInProgress(true);
    setError(null);
    try {
      await apiRequest(`/wanted-requests/${requestId}/offers/${offerId}`, {
        method: 'DELETE',
      });
      setSuccessMessage('Offer withdrawn.');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadRequests();
    } catch (err: any) {
      setError(err.message || 'Could not withdraw offer.');
    } finally {
      setActionInProgress(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            Wanted Spare Parts Board & Bidding
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Review buyer requests for out-of-stock and rare components. Quote your inventory with genuine pricing, condition grading, and dispatch lead times.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('open')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'open'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Open Requests ({filteredOpenRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('my_offers')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'my_offers'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>My Submitted Offers</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'my_offers' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {mySubmittedOffers.length}
            </span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-xs text-red-500 font-bold">
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2 shadow-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filters for Open Requests */}
      {activeTab === 'open' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by part, model, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none capitalize"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <input
              type="text"
              placeholder="Filter by Brand (e.g. Apple, Dell)"
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Tab: Open Requests */}
      {activeTab === 'open' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          {loading ? (
            <div className="text-center py-8 text-slate-500">
              <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
              <p className="text-sm">Loading active customer requests...</p>
            </div>
          ) : filteredOpenRequests.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <Tag className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-base font-bold text-slate-700">No active customer requests found</p>
              <p className="text-xs text-slate-400 mt-1">Check back later or adjust your search filters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOpenRequests.map((req) => {
                const myOffer = getMyOfferForRequest(req);
                return (
                  <div
                    key={req._id}
                    className="p-5 rounded-xl border border-slate-200 hover:border-emerald-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 capitalize">
                          {req.category?.replace('_', ' ')}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
                          Condition: {req.requiredCondition}
                        </span>
                        <span className="text-xs text-slate-400">
                          Qty: <strong>{req.quantity}</strong>
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900">
                        {req.componentType}
                      </h3>

                      <p className="text-xs text-slate-600 font-medium">
                        Device: <strong className="text-slate-800">{req.brand} {req.deviceModel}</strong>
                        {req.partNumber && <span> • Part #: <span className="font-mono">{req.partNumber}</span></span>}
                      </p>

                      <p className="text-xs text-slate-600 line-clamp-2">
                        {req.description}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {req.deliveryCity} (PIN: {req.deliveryPostalCode})
                        </span>
                        <span>
                          Target Budget:{' '}
                          <strong className="text-slate-800 font-mono">
                            {req.maxBudgetPaise ? formatRupeesFromPaise(req.maxBudgetPaise) : 'Flexible'}
                          </strong>
                        </span>
                        <span>Offers: <strong>{req.offers?.length || 0}</strong></span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row md:flex-col items-end gap-2 shrink-0">
                      {myOffer ? (
                        <div className="text-right space-y-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Offer Submitted: {formatRupeesFromPaise(myOffer.offeredPricePaise)}
                          </span>
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => openEditOfferModal(req, myOffer)}
                              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline"
                            >
                              Edit Offer
                            </button>
                            <button
                              onClick={() => handleWithdrawOffer(req._id, myOffer._id)}
                              className="text-xs font-semibold text-red-600 hover:text-red-700 underline"
                            >
                              Withdraw
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => openSubmitOfferModal(req)}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Submit Offer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: My Submitted Offers */}
      {activeTab === 'my_offers' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          {mySubmittedOffers.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-base font-bold text-slate-700">You haven't submitted any offers yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Browse open requests and submit bids for parts you have in inventory.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {mySubmittedOffers.map(({ request: req, offer }) => {
                const isAccepted = offer.status === 'accepted';
                const isRejected = offer.status === 'rejected';
                const isPending = offer.status === 'pending';

                return (
                  <div
                    key={offer._id}
                    className={`p-5 rounded-xl border transition ${
                      isAccepted
                        ? 'bg-emerald-50/40 border-emerald-300'
                        : isRejected
                        ? 'bg-slate-50 border-slate-200 opacity-70'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-sm">
                            {req.componentType}
                          </h3>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize font-medium">
                            {req.brand} {req.deviceModel}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full capitalize">
                            Req Status: {req.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Delivery: {req.deliveryCity} (PIN: {req.deliveryPostalCode}) • Target: {req.maxBudgetPaise ? formatRupeesFromPaise(req.maxBudgetPaise) : 'Flexible'}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-lg font-extrabold font-mono text-slate-900">
                          {formatRupeesFromPaise(offer.offeredPricePaise)}
                        </span>
                        <div className="text-xs text-slate-500">
                          Qty: <strong>{offer.availableQuantity}</strong> • Status: <strong className="uppercase">{offer.status}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-3 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-slate-400" />
                        <span>Dispatch: <strong>{offer.leadTimeDays} day(s)</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Warranty: <strong>{offer.warrantyDays ? `${offer.warrantyDays} days` : 'None'}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-slate-400" />
                        <span>Shipping: <strong>{offer.shippingCostPaise ? formatRupeesFromPaise(offer.shippingCostPaise) : 'Free'}</strong></span>
                      </div>
                    </div>

                    {offer.notes && (
                      <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <strong>Notes:</strong> {offer.notes}
                      </p>
                    )}

                    <div className="pt-3 flex items-center justify-between gap-2 mt-2 border-t border-slate-100">
                      <div>
                        {isAccepted && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                            <CheckCircle2 className="w-4 h-4" /> Offer Accepted by Customer! Please prepare fulfillment.
                          </span>
                        )}
                        {isRejected && (
                          <span className="text-xs text-slate-500 font-medium">
                            Offer Declined by Customer
                          </span>
                        )}
                        {offer.status === 'withdrawn' && (
                          <span className="text-xs text-slate-400 italic">Withdrawn</span>
                        )}
                      </div>

                      {isPending && req.status === 'open' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditOfferModal(req, offer)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => handleWithdrawOffer(req._id, offer._id)}
                            className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Withdraw
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBMIT OFFER MODAL */}
      {submittingToRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-600" />
                  Submit Offer for #{submittingToRequest._id.slice(-6)}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {submittingToRequest.componentType} • {submittingToRequest.brand} {submittingToRequest.deviceModel}
                </p>
              </div>
              <button
                onClick={() => setSubmittingToRequest(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOffer} className="space-y-4 pt-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Offered Price (₹ INR) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={offerForm.priceRupees}
                    onChange={(e) => setOfferForm({ ...offerForm, priceRupees: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  {formErrors.priceRupees && (
                    <p className="text-xs text-red-600 mt-0.5">{formErrors.priceRupees}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Available Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={offerForm.availableQuantity}
                    onChange={(e) => setOfferForm({ ...offerForm, availableQuantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  {formErrors.availableQuantity && (
                    <p className="text-xs text-red-600 mt-0.5">{formErrors.availableQuantity}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Condition *
                  </label>
                  <select
                    value={offerForm.condition}
                    onChange={(e) => setOfferForm({ ...offerForm, condition: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="new">Brand New</option>
                    <option value="refurbished">Refurbished / Tested</option>
                    <option value="used">Used Original Pull</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dispatch Lead Time (Days) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={offerForm.leadTimeDays}
                    onChange={(e) => setOfferForm({ ...offerForm, leadTimeDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  {formErrors.leadTimeDays && (
                    <p className="text-xs text-red-600 mt-0.5">{formErrors.leadTimeDays}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Warranty (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 30, 90"
                    value={offerForm.warrantyDays}
                    onChange={(e) => setOfferForm({ ...offerForm, warrantyDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Shipping Cost (₹ INR, 0 for free)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={offerForm.shippingCostRupees}
                    onChange={(e) => setOfferForm({ ...offerForm, shippingCostRupees: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  {formErrors.shippingCostRupees && (
                    <p className="text-xs text-red-600 mt-0.5">{formErrors.shippingCostRupees}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Compatibility Evidence / Verification
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tested on Apple diagnostic suite, matching motherboard board ID"
                  value={offerForm.compatibilityEvidence}
                  onChange={(e) => setOfferForm({ ...offerForm, compatibilityEvidence: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes & Terms
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional notes for the customer regarding packaging or returns"
                  value={offerForm.notes}
                  onChange={(e) => setOfferForm({ ...offerForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSubmittingToRequest(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
                >
                  {actionInProgress ? 'Submitting...' : 'Send Offer to Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT OFFER MODAL */}
      {editingOfferData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-emerald-600" />
                  Edit Offer
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingOfferData.requestSummary}
                </p>
              </div>
              <button
                onClick={() => setEditingOfferData(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateOffer} className="space-y-4 pt-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Offered Price (₹ INR) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={offerForm.priceRupees}
                    onChange={(e) => setOfferForm({ ...offerForm, priceRupees: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  {formErrors.priceRupees && (
                    <p className="text-xs text-red-600 mt-0.5">{formErrors.priceRupees}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Available Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={offerForm.availableQuantity}
                    onChange={(e) => setOfferForm({ ...offerForm, availableQuantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Condition *
                  </label>
                  <select
                    value={offerForm.condition}
                    onChange={(e) => setOfferForm({ ...offerForm, condition: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="new">Brand New</option>
                    <option value="refurbished">Refurbished / Tested</option>
                    <option value="used">Used Original Pull</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dispatch Lead Time (Days) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={offerForm.leadTimeDays}
                    onChange={(e) => setOfferForm({ ...offerForm, leadTimeDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Warranty (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={offerForm.warrantyDays}
                    onChange={(e) => setOfferForm({ ...offerForm, warrantyDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Shipping Cost (₹ INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={offerForm.shippingCostRupees}
                    onChange={(e) => setOfferForm({ ...offerForm, shippingCostRupees: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Compatibility Evidence
                </label>
                <input
                  type="text"
                  value={offerForm.compatibilityEvidence}
                  onChange={(e) => setOfferForm({ ...offerForm, compatibilityEvidence: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={offerForm.notes}
                  onChange={(e) => setOfferForm({ ...offerForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingOfferData(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
                >
                  {actionInProgress ? 'Saving...' : 'Save Offer Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
