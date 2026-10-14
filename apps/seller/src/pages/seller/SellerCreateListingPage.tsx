import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  ShieldCheck,
  Truck,
  IndianRupee,
  Tag,
  ArrowLeft,
  X,
  Info,
} from 'lucide-react';

export interface CanonicalPartItem {
  _id: string;
  name: string;
  partNumber: string;
  componentType: string;
  categoryId?: { _id: string; name: string; slug: string };
  brandId?: { _id: string; name: string; slug: string };
  oemReference?: string;
  description?: string;
}

export const SellerCreateListingPage: React.FC = () => {
  const navigate = useNavigate();
  const { sellerProfile } = useAuth();
  const isApproved = sellerProfile?.status === 'approved';

  // Canonical Part State & Search
  const [canonicalParts, setCanonicalParts] = useState<CanonicalPartItem[]>([]);
  const [canonicalSearch, setCanonicalSearch] = useState('');
  const [selectedPart, setSelectedPart] = useState<CanonicalPartItem | null>(null);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [loadingParts, setLoadingParts] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [sellerSku, setSellerSku] = useState('');
  const [condition, setCondition] = useState<'new' | 'refurbished' | 'used' | 'for_parts'>('new');
  const [priceRupees, setPriceRupees] = useState('');
  const [stockQuantity, setStockQuantity] = useState('10');
  const [warrantyDays, setWarrantyDays] = useState('30');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [shippingFeeRupees, setShippingFeeRupees] = useState('0');
  const [dispatchLeadTimeDays, setDispatchLeadTimeDays] = useState('2');
  const [dispatchPostalCode, setDispatchPostalCode] = useState('');
  const [description, setDescription] = useState('');
  const [publicationStatus, setPublicationStatus] = useState<'pending_review' | 'draft'>('pending_review');

  // Image URLs
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // State Feedback
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch Canonical Catalogue Parts
  const fetchCanonicalParts = async (query = '') => {
    setLoadingParts(true);
    try {
      const queryParam = query ? `?q=${encodeURIComponent(query)}` : '';
      const res = await apiRequest<any>(`/seller/canonical-parts${queryParam}`);
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setCanonicalParts(list);
    } catch {
      // Fallback to /parts if needed
      try {
        const fallback = await apiRequest<any[]>('/parts');
        setCanonicalParts(Array.isArray(fallback) ? fallback : []);
      } catch {
        setCanonicalParts([]);
      }
    } finally {
      setLoadingParts(false);
    }
  };

  useEffect(() => {
    fetchCanonicalParts();
  }, []);

  // Filtered Canonical Parts in Modal
  const filteredCatalog = useMemo(() => {
    if (!canonicalSearch.trim()) return canonicalParts;
    const q = canonicalSearch.toLowerCase();
    return canonicalParts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.partNumber.toLowerCase().includes(q) ||
        p.componentType.toLowerCase().includes(q) ||
        p.brandId?.name.toLowerCase().includes(q)
    );
  }, [canonicalParts, canonicalSearch]);

  const handleSelectCanonicalPart = (part: CanonicalPartItem) => {
    setSelectedPart(part);
    if (!title.trim()) {
      setTitle(`${part.brandId?.name || ''} ${part.name} OEM Replacement`.trim());
    }
    if (!sellerSku.trim()) {
      setSellerSku(`${part.partNumber || 'PART'}-${Math.floor(1000 + Math.random() * 9000)}`);
    }
    setIsCatalogModalOpen(false);
  };

  // Authoritative Read-Only Calculated Total Inventory Value (₹)
  const totalInventoryValueRupees = useMemo(() => {
    const price = Number(priceRupees);
    const qty = Number(stockQuantity);
    if (isNaN(price) || isNaN(qty) || price <= 0 || qty <= 0) return 0;
    // Calculate in paise first to avoid floating point inaccuracies
    const pricePaise = Math.round(price * 100);
    const totalPaise = pricePaise * Math.floor(qty);
    return totalPaise / 100;
  }, [priceRupees, stockQuantity]);

  const handleAddImage = () => {
    if (imageUrlInput.trim() && !imageUrls.includes(imageUrlInput.trim())) {
      setImageUrls([...imageUrls, imageUrlInput.trim()]);
      setImageUrlInput('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageUrls(imageUrls.filter((_, idx) => idx !== index));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!selectedPart) {
      errs.partId = 'Please select a canonical spare part from the catalog';
    }
    if (!title.trim() || title.trim().length < 3) {
      errs.title = 'Listing title must be at least 3 characters';
    }
    const price = Number(priceRupees);
    if (!priceRupees || isNaN(price) || price <= 0) {
      errs.priceRupees = 'Price per piece must be a valid positive amount in ₹ INR';
    }
    const qty = Number(stockQuantity);
    if (stockQuantity === '' || isNaN(qty) || qty < 0 || !Number.isInteger(qty)) {
      errs.stockQuantity = 'Initial stock quantity must be a non-negative whole number';
    }
    if (qty > 100000) {
      errs.stockQuantity = 'Stock quantity cannot exceed 100,000 units';
    }
    const warranty = Number(warrantyDays);
    if (isNaN(warranty) || warranty < 0 || !Number.isInteger(warranty)) {
      errs.warrantyDays = 'Warranty must be a non-negative number of days';
    }
    const threshold = Number(lowStockThreshold);
    if (isNaN(threshold) || threshold < 0 || !Number.isInteger(threshold)) {
      errs.lowStockThreshold = 'Low stock threshold must be a non-negative number';
    }
    const shipping = Number(shippingFeeRupees);
    if (isNaN(shipping) || shipping < 0) {
      errs.shippingFeeRupees = 'Shipping fee cannot be negative';
    }
    const leadTime = Number(dispatchLeadTimeDays);
    if (isNaN(leadTime) || leadTime < 1 || !Number.isInteger(leadTime)) {
      errs.dispatchLeadTimeDays = 'Dispatch estimate must be at least 1 day';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isApproved) {
      setError(`Cannot create listing. Your seller profile status is currently '${sellerProfile?.status || 'pending'}'. Administrator KYC approval is required.`);
      return;
    }
    if (!validate()) return;

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const pricePaise = Math.round(Number(priceRupees) * 100);
      const shippingFeePaise = Math.round(Number(shippingFeeRupees) * 100);

      const payload: any = {
        partId: selectedPart!._id,
        title: title.trim(),
        sellerSku: sellerSku.trim() || undefined,
        condition,
        pricePaise,
        stockAvailable: Number(stockQuantity),
        warrantyDays: Number(warrantyDays),
        lowStockThreshold: Number(lowStockThreshold),
        shippingFeePaise,
        dispatchLeadTimeDays: Number(dispatchLeadTimeDays),
        shippingOriginPostalCode: dispatchPostalCode.trim() || undefined,
        description: description.trim() || undefined,
        status: publicationStatus,
      };

      await apiRequest('/seller/listings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setSuccessMessage('Listing successfully created and submitted for catalogue verification!');
      setTimeout(() => {
        navigate('/listings');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to create listing. Please verify your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/listings')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Listings
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Package className="w-6 h-6 text-emerald-600" />
          Create New Spare-Part Listing
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Publish genuine electronics components linked to canonical catalogue records. Accurately specify condition, stock on hand, and price per piece.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2 shadow-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {!isApproved && (
        <div className="p-5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-amber-950">Application Pending Verification</h2>
              <p className="text-xs text-amber-800 mt-1">
                Your merchant profile is currently in <strong>{sellerProfile?.status || 'pending'}</strong> review. Only verified sellers with approved business KYC documents can publish live spare parts listings.
              </p>
            </div>
          </div>
          <Link
            to="/verification"
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 self-start sm:self-center transition shadow-sm"
          >
            Go to KYC Verification &rarr;
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: Canonical Spare Part Selector */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              1. Canonical Spare Part Identity *
            </h2>
            <button
              type="button"
              onClick={() => setIsCatalogModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition"
            >
              {selectedPart ? 'Change Canonical Part' : 'Browse Canonical Catalog'}
            </button>
          </div>

          {formErrors.partId && (
            <p className="text-xs text-red-600 font-semibold">{formErrors.partId}</p>
          )}

          {selectedPart ? (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{selectedPart.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold uppercase">
                    {selectedPart.componentType}
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  Brand: <strong>{selectedPart.brandId?.name || 'Verified OEM'}</strong> • Part / MPN #: <strong className="font-mono">{selectedPart.partNumber}</strong>
                  {selectedPart.oemReference && <span> • OEM Ref: {selectedPart.oemReference}</span>}
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  Canonical ID: {selectedPart._id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPart(null)}
                className="text-xs text-red-600 hover:text-red-700 font-semibold underline self-start sm:self-center"
              >
                Remove
              </button>
            </div>
          ) : (
            <div
              onClick={() => setIsCatalogModalOpen(true)}
              className="p-8 rounded-xl border-2 border-dashed border-slate-300 hover:border-emerald-500 text-center cursor-pointer transition bg-slate-50 hover:bg-emerald-50/20"
            >
              <Search className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-bold text-slate-700">Click to select a Canonical Spare Part</p>
              <p className="text-xs text-slate-500 mt-1">
                Choose the verified manufacturer component you are listing to ensure full compatibility validation for buyers.
              </p>
            </div>
          )}
        </div>

        {/* SECTION 2: Listing Information & SKU */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-600" />
            2. Listing Details & Seller SKU
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Listing Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Sony WF-1000XM4 Right Earbud — Tested OEM Replacement"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              {formErrors.title && <p className="text-xs text-red-600 mt-0.5">{formErrors.title}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Seller SKU (Unique in your inventory)
              </label>
              <input
                type="text"
                placeholder="e.g. SNY-XM4-R-01"
                value={sellerSku}
                onChange={(e) => setSellerSku(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-0.5">
                Your internal inventory code for barcoding and tracking this stock.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Condition Grade *
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="new">Brand New (Unused, factory sealed)</option>
                <option value="refurbished">Refurbished (Tested & serviced)</option>
                <option value="used">Used Pull (Clean OEM pull, fully functional)</option>
                <option value="for_parts">For Parts / Untested (As-is, defective or unverified)</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 3: Pricing, Stock & Authoritative Inventory Valuation */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-emerald-600" />
            3. Pricing & Physical Inventory Valuation
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Price per Piece (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-slate-500 font-bold">₹</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 500"
                  value={priceRupees}
                  onChange={(e) => setPriceRupees(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              {formErrors.priceRupees && (
                <p className="text-xs text-red-600 mt-0.5">{formErrors.priceRupees}</p>
              )}
              <p className="text-[11px] text-slate-500 mt-0.5">Selling price of 1 individual unit.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Stock Quantity (Pieces) *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 10"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              {formErrors.stockQuantity && (
                <p className="text-xs text-red-600 mt-0.5">{formErrors.stockQuantity}</p>
              )}
              <p className="text-[11px] text-slate-500 mt-0.5">Physical units available on hand.</p>
            </div>

            {/* Read-Only Calculated Total Inventory Value */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Inventory Value (₹) [Calculated]
              </label>
              <div className="w-full px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 font-extrabold text-sm flex items-center justify-between">
                <span>
                  ₹{totalInventoryValueRupees.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="text-[10px] text-emerald-700 font-medium bg-emerald-100 px-1.5 py-0.5 rounded">
                  Price × Qty
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Authoritative on-hand valuation. Auto-calculated.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Warranty (Days)
              </label>
              <input
                type="number"
                min="0"
                placeholder="30"
                value={warrantyDays}
                onChange={(e) => setWarrantyDays(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-0.5">Enter 0 for no warranty.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Low-Stock Alert Threshold
              </label>
              <input
                type="number"
                min="0"
                placeholder="5"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-0.5">
                Dashboard warning triggers when available stock reaches this level.
              </p>
            </div>
          </div>
        </div>

        {/* SECTION 4: Specifications & Description */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Info className="w-4 h-4 text-emerald-600" />
            4. Technical Specifications & Condition Notes
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Product Description & Details
            </label>
            <textarea
              rows={4}
              placeholder="Detail hardware revision codes, testing procedures, cosmetic imperfections, included cables or mounting brackets..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* SECTION 5: Shipping and Fulfilment */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-600" />
            5. Shipping & Fulfilment
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dispatch Lead Time (Days)
              </label>
              <input
                type="number"
                min="1"
                value={dispatchLeadTimeDays}
                onChange={(e) => setDispatchLeadTimeDays(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shipping Fee (₹ INR, 0 for Free)
              </label>
              <input
                type="number"
                min="0"
                value={shippingFeeRupees}
                onChange={(e) => setShippingFeeRupees(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Warehouse Dispatch PIN Code
              </label>
              <input
                type="text"
                placeholder="e.g. 560001"
                value={dispatchPostalCode}
                onChange={(e) => setDispatchPostalCode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 6: Publication Submission */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Publication Workflow
            </label>
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-700">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="pubStatus"
                  value="pending_review"
                  checked={publicationStatus === 'pending_review'}
                  onChange={() => setPublicationStatus('pending_review')}
                />
                <span>Submit for Catalog Review (Pending Review)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="pubStatus"
                  value="draft"
                  checked={publicationStatus === 'draft'}
                  onChange={() => setPublicationStatus('draft')}
                />
                <span>Save as Draft</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/listings')}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !isApproved}
              title={!isApproved ? 'Seller account must be approved to publish listings' : undefined}
              className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? 'Publishing...' : !isApproved ? 'Verification Required' : 'Publish Listing'}
            </button>
          </div>
        </div>
      </form>

      {/* CATALOG SELECTION MODAL */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-600" />
                Select Canonical Spare Part
              </h3>
              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search by part name, part #, model, or brand..."
                  value={canonicalSearch}
                  onChange={(e) => setCanonicalSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {loadingParts ? (
                <p className="text-center py-8 text-xs text-slate-500">
                  Loading canonical parts...
                </p>
              ) : filteredCatalog.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No matching canonical parts found for "{canonicalSearch}".
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {filteredCatalog.map((part) => (
                    <div
                      key={part._id}
                      onClick={() => handleSelectCanonicalPart(part)}
                      className="p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 transition cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-bold text-slate-900 text-xs">{part.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Brand: <strong>{part.brandId?.name || 'OEM'}</strong> • Part #: <strong className="font-mono">{part.partNumber}</strong> • Component: {part.componentType}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="px-2.5 py-1 rounded bg-emerald-600 text-white text-[11px] font-bold shrink-0"
                      >
                        Select
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200"
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
