import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { formatPaiseToINR } from '../utils/currency';
import {
  Search,
  PlusCircle,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Tag,
  AlertCircle,
  Edit2,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Truck,
  Package,
} from 'lucide-react';

export interface WantedOfferItem {
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

export interface WantedRequestItem {
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
  offers: WantedOfferItem[];
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

export const WantedPartsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<WantedRequestItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<WantedRequestItem | null>(null);
  const [comparingRequest, setComparingRequest] = useState<WantedRequestItem | null>(null);
  const [actionInProgress, setActionInProgress] = useState<boolean>(false);

  // Create / Edit Form State
  const [formData, setFormData] = useState({
    category: 'screen',
    brand: '',
    deviceModel: '',
    componentType: '',
    partNumber: '',
    description: '',
    quantity: 1,
    requiredCondition: 'any' as 'any' | 'new' | 'refurbished' | 'used',
    budgetRupees: '',
    deliveryCity: '',
    deliveryPostalCode: '',
    preferredDeliveryDate: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<WantedRequestItem[]>('/wanted-requests');
      setRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch wanted-part requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const getOwnerId = (req: WantedRequestItem): string => {
    if (typeof req.customerId === 'object' && req.customerId !== null) {
      return (req.customerId as any)._id || (req.customerId as any).id || '';
    }
    return String(req.customerId || '');
  };

  const currentUserId = user?._id || (user as any)?.id || '';

  const isOwner = (req: WantedRequestItem): boolean => {
    if (!currentUserId) return false;
    return getOwnerId(req) === currentUserId;
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (activeTab === 'my') {
        if (!currentUserId || getOwnerId(req) !== currentUserId) return false;
      }

      if (categoryFilter && req.category !== categoryFilter) {
        return false;
      }

      if (statusFilter && req.status !== statusFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const textMatch =
          req.componentType?.toLowerCase().includes(q) ||
          req.deviceModel?.toLowerCase().includes(q) ||
          req.brand?.toLowerCase().includes(q) ||
          req.partNumber?.toLowerCase().includes(q) ||
          req.description?.toLowerCase().includes(q) ||
          req.deliveryCity?.toLowerCase().includes(q);
        if (!textMatch) return false;
      }

      return true;
    });
  }, [requests, activeTab, currentUserId, categoryFilter, statusFilter, searchQuery]);

  const myRequestsCount = useMemo(() => {
    if (!currentUserId) return 0;
    return requests.filter((r) => getOwnerId(r) === currentUserId).length;
  }, [requests, currentUserId]);

  const openCreateModal = () => {
    if (!user) {
      navigate('/login?redirect=/wanted');
      return;
    }
    setFormData({
      category: 'screen',
      brand: '',
      deviceModel: '',
      componentType: '',
      partNumber: '',
      description: '',
      quantity: 1,
      requiredCondition: 'any',
      budgetRupees: '',
      deliveryCity: '',
      deliveryPostalCode: '',
      preferredDeliveryDate: '',
    });
    setFormErrors({});
    setIsCreateModalOpen(true);
  };

  const openEditModal = (req: WantedRequestItem) => {
    setEditingRequest(req);
    setFormData({
      category: req.category || 'screen',
      brand: req.brand || '',
      deviceModel: req.deviceModel || '',
      componentType: req.componentType || '',
      partNumber: req.partNumber || '',
      description: req.description || '',
      quantity: req.quantity || 1,
      requiredCondition: req.requiredCondition || 'any',
      budgetRupees: req.maxBudgetPaise ? String(req.maxBudgetPaise / 100) : '',
      deliveryCity: req.deliveryCity || '',
      deliveryPostalCode: req.deliveryPostalCode || '',
      preferredDeliveryDate: req.preferredDeliveryDate ? req.preferredDeliveryDate.split('T')[0] : '',
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!formData.category) errs.category = 'Category is required';
    if (!formData.brand.trim()) errs.brand = 'Brand is required';
    if (!formData.deviceModel.trim()) errs.deviceModel = 'Device model is required';
    if (!formData.componentType.trim()) errs.componentType = 'Component or part name is required';
    if (!formData.description.trim() || formData.description.trim().length < 10) {
      errs.description = 'Description must be at least 10 characters long';
    }
    if (!formData.quantity || formData.quantity < 1) {
      errs.quantity = 'Quantity must be at least 1';
    }
    if (!formData.deliveryCity.trim() || formData.deliveryCity.trim().length < 2) {
      errs.deliveryCity = 'Valid delivery city is required';
    }
    if (!formData.deliveryPostalCode.trim() || formData.deliveryPostalCode.trim().length < 5) {
      errs.deliveryPostalCode = 'Valid PIN code (at least 5 characters) is required';
    }
    if (formData.budgetRupees && (isNaN(Number(formData.budgetRupees)) || Number(formData.budgetRupees) <= 0)) {
      errs.budgetRupees = 'Budget must be a valid positive number';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setActionInProgress(true);
    setError(null);
    try {
      const payload: any = {
        category: formData.category,
        brand: formData.brand.trim(),
        deviceModel: formData.deviceModel.trim(),
        componentType: formData.componentType.trim(),
        partNumber: formData.partNumber.trim() || undefined,
        description: formData.description.trim(),
        quantity: Number(formData.quantity),
        requiredCondition: formData.requiredCondition,
        deliveryCity: formData.deliveryCity.trim(),
        deliveryPostalCode: formData.deliveryPostalCode.trim(),
      };

      if (formData.budgetRupees) {
        payload.maxBudgetPaise = Math.round(Number(formData.budgetRupees) * 100);
      }
      if (formData.preferredDeliveryDate) {
        payload.preferredDeliveryDate = new Date(formData.preferredDeliveryDate).toISOString();
      }

      await apiRequest('/wanted-requests', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setIsCreateModalOpen(false);
      setSuccessMessage('Wanted spare-part request published successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to create wanted request');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest) return;
    if (!validateForm()) return;

    setActionInProgress(true);
    setError(null);
    try {
      const payload: any = {
        description: formData.description.trim(),
        quantity: Number(formData.quantity),
        requiredCondition: formData.requiredCondition,
        deliveryCity: formData.deliveryCity.trim(),
        deliveryPostalCode: formData.deliveryPostalCode.trim(),
      };

      if (formData.budgetRupees) {
        payload.maxBudgetPaise = Math.round(Number(formData.budgetRupees) * 100);
      } else {
        payload.maxBudgetPaise = null;
      }
      if (formData.preferredDeliveryDate) {
        payload.preferredDeliveryDate = new Date(formData.preferredDeliveryDate).toISOString();
      }

      await apiRequest(`/wanted-requests/${editingRequest._id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      setEditingRequest(null);
      setSuccessMessage('Wanted request updated successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to update request');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!window.confirm('Are you sure you want to cancel this wanted request? This cannot be undone.')) {
      return;
    }

    setActionInProgress(true);
    setError(null);
    try {
      await apiRequest(`/wanted-requests/${requestId}/cancel`, {
        method: 'PATCH',
      });
      setSuccessMessage('Request cancelled.');
      setTimeout(() => setSuccessMessage(null), 4000);
      await fetchRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel request');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleAcceptOffer = async (requestId: string, offerId: string) => {
    if (!window.confirm('Accept this offer from the seller? Other offers will be automatically rejected.')) {
      return;
    }

    setActionInProgress(true);
    setError(null);
    try {
      const updated = await apiRequest<WantedRequestItem>(`/wanted-requests/${requestId}/offers/${offerId}/accept`, {
        method: 'PATCH',
      });
      setSuccessMessage('Offer accepted! The seller has been notified to process fulfillment.');
      setTimeout(() => setSuccessMessage(null), 5000);
      setComparingRequest(updated);
      await fetchRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to accept offer. It may have already been modified or accepted.');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleRejectOffer = async (requestId: string, offerId: string) => {
    if (!window.confirm('Decline this seller offer?')) {
      return;
    }

    setActionInProgress(true);
    setError(null);
    try {
      const updated = await apiRequest<WantedRequestItem>(`/wanted-requests/${requestId}/offers/${offerId}/reject`, {
        method: 'PATCH',
      });
      setSuccessMessage('Offer declined.');
      setTimeout(() => setSuccessMessage(null), 3000);
      setComparingRequest(updated);
      await fetchRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to reject offer');
    } finally {
      setActionInProgress(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Open</span>;
      case 'fulfilled':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Fulfilled</span>;
      case 'cancelled':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">Cancelled</span>;
      case 'expired':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Expired</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
              <Search className="w-6 h-6 text-white" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Wanted Spare Parts Board</h1>
          </div>
          <p className="text-amber-100 text-sm sm:text-base max-w-2xl">
            Can’t locate a rare IC, logic board, or specific color shell? Post a wanted request and let verified electronics sellers compete to fulfill it with genuine parts.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-amber-800 font-bold shadow hover:bg-amber-50 transition active:scale-95 text-sm"
          >
            <PlusCircle className="w-5 h-5 text-amber-600" />
            Post Wanted Request
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Controls & Navigation Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                activeTab === 'all'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Open Requests ({requests.length})
            </button>
            <button
              onClick={() => {
                if (!user) {
                  navigate('/login?redirect=/wanted');
                } else {
                  setActiveTab('my');
                }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                activeTab === 'my'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>My Requests</span>
              {user && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === 'my' ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {myRequestsCount}
                </span>
              )}
            </button>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredRequests.length} result(s)
          </span>
        </div>

        {/* Search & Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by part, model, brand, or OEM number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none capitalize"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests Grid */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
          <Clock className="w-8 h-8 mx-auto animate-spin text-amber-500 mb-2" />
          <p className="text-sm">Loading wanted-part requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <Tag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 mb-1">No wanted-part requests found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
            {activeTab === 'my'
              ? 'You have not submitted any wanted-part requests yet. Post one now and get offers from verified sellers!'
              : 'There are currently no requests matching your filter criteria. Try adjusting your search or post a new request.'}
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-lg bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition"
          >
            Post a Wanted Request
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRequests.map((req) => {
            const owner = isOwner(req);
            const offersCount = req.offers?.length || 0;
            const acceptedOffer = req.offers?.find((o) => o._id === req.acceptedOfferId || o.status === 'accepted');

            return (
              <div
                key={req._id}
                className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 capitalize">
                        {req.category?.replace('_', ' ')}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize">
                        Condition: {req.requiredCondition}
                      </span>
                    </div>
                    {getStatusBadge(req.status)}
                  </div>

                  <div>
                    <h2 className="text-lg font-bold text-slate-900 leading-snug">
                      {req.componentType}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      For: <strong className="text-slate-700">{req.brand} {req.deviceModel}</strong>
                      {req.partNumber && (
                        <span> • OEM / Part #: <span className="font-mono text-slate-600">{req.partNumber}</span></span>
                      )}
                    </p>
                  </div>

                  <p className="text-sm text-slate-600 line-clamp-2">
                    {req.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div>
                      <span className="text-slate-400 block">Quantity:</span>
                      <strong className="text-slate-800">{req.quantity} unit(s)</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Target Budget:</span>
                      <strong className="text-slate-800 font-mono">
                        {req.maxBudgetPaise ? formatPaiseToINR(req.maxBudgetPaise) : 'Open / Flexible'}
                      </strong>
                    </div>
                    <div className="col-span-2 flex items-center gap-1 text-slate-500 pt-1 border-t border-slate-200/60">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{req.deliveryCity}, PIN: {req.deliveryPostalCode}</span>
                    </div>
                  </div>

                  {acceptedOffer && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Accepted Offer: {formatPaiseToINR(acceptedOffer.offeredPricePaise)}</span>
                      </div>
                      <span className="text-emerald-700">{acceptedOffer.storeName || 'Verified Seller'}</span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Package className="w-4 h-4 text-slate-400" />
                    <span>Offers received: <strong className="text-slate-800">{offersCount}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    {owner ? (
                      <>
                        <button
                          onClick={() => setComparingRequest(req)}
                          className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200 transition"
                        >
                          View Offers ({offersCount})
                        </button>

                        {req.status === 'open' && (
                          <>
                            <button
                              onClick={() => openEditModal(req)}
                              title="Edit Request"
                              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleCancelRequest(req._id)}
                              title="Cancel Request"
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        {req.status === 'open' ? 'Active listing' : req.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-500" />
                Post Wanted Spare Part Request
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Component / Part Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. OLED Display Assembly"
                    value={formData.componentType}
                    onChange={(e) => setFormData({ ...formData, componentType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  {formErrors.componentType && (
                    <p className="text-xs text-red-600 mt-0.5">{formErrors.componentType}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none capitalize"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Brand *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Apple, Dell, Lenovo"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  {formErrors.brand && (
                    <p className="text-xs text-red-600 mt-0.5">{formErrors.brand}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Device Model *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. iPhone 13 Pro, ThinkPad T480"
                    value={formData.deviceModel}
                    onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  {formErrors.deviceModel && (
                    <p className="text-xs text-red-600 mt-0.5">{formErrors.deviceModel}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Part / OEM Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 01YR200"
                    value={formData.partNumber}
                    onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantity Needed *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  {formErrors.quantity && (
                    <p className="text-xs text-red-600 mt-0.5">{formErrors.quantity}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Required Condition
                  </label>
                  <select
                    value={formData.requiredCondition}
                    onChange={(e) => setFormData({ ...formData, requiredCondition: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="any">Any Working Condition</option>
                    <option value="new">Brand New Only</option>
                    <option value="refurbished">Refurbished / Tested</option>
                    <option value="used">Used Original Pull</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Max Budget (₹ INR)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Optional max budget"
                    value={formData.budgetRupees}
                    onChange={(e) => setFormData({ ...formData, budgetRupees: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  {formErrors.budgetRupees && (
                    <p className="text-xs text-red-600 mt-0.5">{formErrors.budgetRupees}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Delivery City *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bengaluru"
                    value={formData.deliveryCity}
                    onChange={(e) => setFormData({ ...formData, deliveryCity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  {formErrors.deliveryCity && (
                    <p className="text-xs text-red-600 mt-0.5">{formErrors.deliveryCity}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 560001"
                    value={formData.deliveryPostalCode}
                    onChange={(e) => setFormData({ ...formData, deliveryPostalCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  {formErrors.deliveryPostalCode && (
                    <p className="text-xs text-red-600 mt-0.5">{formErrors.deliveryPostalCode}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preferred Delivery Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.preferredDeliveryDate}
                  onChange={(e) => setFormData({ ...formData, preferredDeliveryDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Detailed Description & Requirements *
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail any revision codes, color preference, specific defects to avoid, or troubleshooting history..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                {formErrors.description && (
                  <p className="text-xs text-red-600 mt-0.5">{formErrors.description}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress}
                  className="px-5 py-2 rounded-lg bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 transition disabled:opacity-50"
                >
                  {actionInProgress ? 'Publishing...' : 'Publish Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-500" />
                Edit Wanted Request #{editingRequest._id.slice(-6)}
              </h2>
              <button
                onClick={() => setEditingRequest(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 pt-4 text-sm">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
                <p><strong>Device:</strong> {editingRequest.brand} {editingRequest.deviceModel}</p>
                <p><strong>Part:</strong> {editingRequest.componentType} {editingRequest.partNumber ? `(${editingRequest.partNumber})` : ''}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity Needed *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Required Condition</label>
                  <select
                    value={formData.requiredCondition}
                    onChange={(e) => setFormData({ ...formData, requiredCondition: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="any">Any Working Condition</option>
                    <option value="new">Brand New Only</option>
                    <option value="refurbished">Refurbished / Tested</option>
                    <option value="used">Used Original Pull</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Max Budget (₹ INR)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Optional max budget"
                    value={formData.budgetRupees}
                    onChange={(e) => setFormData({ ...formData, budgetRupees: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Delivery Date</label>
                  <input
                    type="date"
                    value={formData.preferredDeliveryDate}
                    onChange={(e) => setFormData({ ...formData, preferredDeliveryDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery City *</label>
                  <input
                    type="text"
                    value={formData.deliveryCity}
                    onChange={(e) => setFormData({ ...formData, deliveryCity: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code *</label>
                  <input
                    type="text"
                    value={formData.deliveryPostalCode}
                    onChange={(e) => setFormData({ ...formData, deliveryPostalCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description *</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRequest(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress}
                  className="px-5 py-2 rounded-lg bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 transition disabled:opacity-50"
                >
                  {actionInProgress ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFERS COMPARISON MODAL */}
      {comparingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-500" />
                  Offers for {comparingRequest.componentType}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Request #{comparingRequest._id.slice(-6)} • {comparingRequest.brand} {comparingRequest.deviceModel} • Needed: {comparingRequest.quantity} unit(s)
                </p>
              </div>
              <button
                onClick={() => setComparingRequest(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-4">
              {comparingRequest.offers?.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-500">
                  <Clock className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No seller offers received yet</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Verified spare-part sellers have been notified. Once an offer is submitted, you can compare price, warranty, and dispatch time right here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {comparingRequest.offers.map((offer) => {
                    const isAccepted = offer.status === 'accepted';
                    const isPending = offer.status === 'pending';
                    const isRejected = offer.status === 'rejected';

                    return (
                      <div
                        key={offer._id}
                        className={`p-4 rounded-xl border transition ${
                          isAccepted
                            ? 'bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-500/20'
                            : isRejected
                            ? 'bg-slate-50 border-slate-200 opacity-60'
                            : 'bg-white border-slate-200 hover:border-amber-300 shadow-sm'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900">
                                {offer.storeName || 'Verified Electronics Seller'}
                              </h4>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 capitalize font-medium">
                                {offer.condition}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Submitted: {new Date(offer.createdAt).toLocaleDateString()}
                            </p>
                          </div>

                          <div className="text-right sm:text-right">
                            <span className="text-xl font-extrabold font-mono text-slate-900">
                              {formatPaiseToINR(offer.offeredPricePaise)}
                            </span>
                            <div className="text-xs text-slate-500">
                              Avail: <strong>{offer.availableQuantity} unit(s)</strong>
                            </div>
                          </div>
                        </div>

                        {/* Specs & Evidence Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-3 text-xs text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-slate-400" />
                            <span>Dispatch: <strong>{offer.leadTimeDays} day(s)</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Warranty: <strong>{offer.warrantyDays ? `${offer.warrantyDays} days` : 'No warranty'}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              Shipping: <strong>{offer.shippingCostPaise ? formatPaiseToINR(offer.shippingCostPaise) : 'Free'}</strong>
                            </span>
                          </div>
                        </div>

                        {(offer.notes || offer.compatibilityEvidence) && (
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
                            {offer.notes && <p><strong>Notes:</strong> {offer.notes}</p>}
                            {offer.compatibilityEvidence && (
                              <p className="text-slate-500 italic">
                                <strong>Evidence:</strong> {offer.compatibilityEvidence}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="pt-3 flex items-center justify-between gap-2 mt-2 border-t border-slate-100">
                          <div>
                            {isAccepted && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Accepted Offer
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-600">
                                Declined
                              </span>
                            )}
                            {offer.status === 'withdrawn' && (
                              <span className="text-xs text-slate-400 italic">Withdrawn by seller</span>
                            )}
                          </div>

                          {isPending && comparingRequest.status === 'open' && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleRejectOffer(comparingRequest._id, offer._id)}
                                disabled={actionInProgress}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition"
                              >
                                Decline
                              </button>
                              <button
                                onClick={() => handleAcceptOffer(comparingRequest._id, offer._id)}
                                disabled={actionInProgress}
                                className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-bold transition shadow-sm"
                              >
                                Accept Offer
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

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setComparingRequest(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
