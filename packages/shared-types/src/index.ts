// ============================================================================
// FixMe.com — Shared Domain Types & Enums
// ============================================================================

export const USER_ROLES = [
  'guest',
  'customer',
  'seller',
  'support_staff',
  'catalogue_manager',
  'administrator',
  'super_administrator',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const PART_CONDITIONS = ['new', 'used', 'refurbished', 'for_parts'] as const;
export type PartCondition = (typeof PART_CONDITIONS)[number];

export const LISTING_STATUSES = [
  'draft',
  'pending_review',
  'active',
  'rejected',
  'paused',
  'out_of_stock',
  'archived',
  'suspended',
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const INVENTORY_MOVEMENT_TYPES = [
  'initial_receipt',
  'restock',
  'manual_adjustment',
  'reserve',
  'commit',
  'release',
  'return_restock',
  'damaged',
  'lost',
] as const;
export type InventoryMovementType = (typeof INVENTORY_MOVEMENT_TYPES)[number];

export const COMPATIBILITY_STATUSES = ['pending', 'verified', 'rejected'] as const;
export type CompatibilityStatus = (typeof COMPATIBILITY_STATUSES)[number];

export const ASSET_TYPES = [
  'product_photo',
  'seller_document',
  'return_photo',
  'dispute_evidence',
  'avatar',
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_STATUSES = ['pending', 'ready', 'rejected'] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const SELLER_STATUSES = ['pending', 'approved', 'rejected', 'suspended'] as const;
export type SellerStatus = (typeof SELLER_STATUSES)[number];

export const ORDER_STATUSES = [
  'pending_payment',
  'paid',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'payment_failed',
  'expired',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const RETURN_STATUSES = [
  'requested',
  'approved',
  'rejected',
  'received',
  'refunded',
  'disputed',
] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export const DISPUTE_STATUSES = ['open', 'under_review', 'resolved_buyer', 'resolved_seller', 'closed'] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

// ============================================================================
// Domain Entities
// ============================================================================

export interface ICategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parentCategoryId?: string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IBrand {
  _id: string;
  name: string;
  slug: string;
  logoAssetId?: string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IDevice {
  _id: string;
  brandId: string;
  brandName?: string;
  categoryId: string;
  categoryName?: string;
  modelName: string;
  modelNumber: string;
  variant?: string;
  region?: string;
  releaseYear?: number;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IPart {
  _id: string;
  categoryId: string;
  brandId: string;
  partNumber: string;
  name: string;
  componentType:
    | 'left_earbud'
    | 'right_earbud'
    | 'charging_case'
    | 'battery'
    | 'charging_port'
    | 'motherboard'
    | 'display'
    | 'camera_module'
    | 'speaker_module'
    | 'other';
  description: string;
  specifications: Record<string, string>;
  oemReference?: string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ICompatibilityRecord {
  _id: string;
  deviceId: string;
  partId: string;
  verificationStatus: CompatibilityStatus;
  evidenceNotes: string;
  sourceType: 'manufacturer_datasheet' | 'teardown_verified' | 'seller_submitted' | 'admin_verified';
  verifiedByUserId?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IListing {
  _id: string;
  partId: string;
  sellerId: string;
  sellerSku?: string;
  title: string;
  description?: string;
  condition: PartCondition;
  pricePaise: number;
  currency: 'INR';
  stockAvailable: number;
  stockReserved: number;
  lowStockThreshold?: number;
  assetIds: string[];
  imageUrls?: string[];
  warrantyDays: number;
  shippingFeePaise?: number;
  dispatchLeadTimeDays?: number;
  shippingOriginPostalCode?: string;
  status: ListingStatus;
  rejectionReason?: string;
  moderationNotes?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IInventoryMovement {
  _id: string;
  listingId: string;
  sellerId: string;
  orderId?: string;
  movementType: InventoryMovementType;
  quantityDelta: number;
  previousAvailable: number;
  newAvailable: number;
  reason: string;
  reference?: string;
  notes?: string;
  actorUserId?: string;
  createdAt: string | Date;
}

export interface IAsset {
  _id: string;
  ownerUserId: string;
  assetType: AssetType;
  storageKey: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
  isPublic: boolean;
  status: AssetStatus;
  deliveryUrl?: string;
  thumbnailUrl?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IUser {
  _id: string;
  email: string;
  phone?: string;
  fullName: string;
  role: UserRole;
  isEmailVerified: boolean;
  isActive: boolean;
  mfaEnabled?: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ISellerProfile {
  _id: string;
  userId: string;
  storeName: string;
  storeSlug: string;
  gstin?: string;
  panNumber?: string;
  businessAddress: string;
  verificationDocumentAssetIds: string[];
  status: SellerStatus;
  ratingAverage: number;
  ratingCount: number;
  reviewedByAdminId?: string;
  reviewNotes?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IAddress {
  _id: string;
  userId: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: 'IN';
  isDefault: boolean;
}

export interface ICartItem {
  _id: string;
  listingId: string;
  partId: string;
  sellerId: string;
  title: string;
  condition: PartCondition;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
  stockAvailable: number;
  isEligible: boolean;
}

export interface ICart {
  _id: string;
  userId: string;
  items: ICartItem[];
  subtotalPaise: number;
  shippingPaise: number;
  taxPaise: number;
  totalPaise: number;
  currency: 'INR';
  updatedAt: string | Date;
}

export interface ISubOrder {
  _id: string;
  parentOrderId: string;
  sellerId: string;
  items: {
    listingId: string;
    partId: string;
    title: string;
    condition: PartCondition;
    quantity: number;
    unitPricePaise: number;
    lineTotalPaise: number;
  }[];
  subtotalPaise: number;
  platformFeePaise: number;
  sellerSettlementPaise: number;
  fulfillmentStatus: OrderStatus;
  trackingNumber?: string;
  carrier?: string;
  shippedAt?: string | Date;
  deliveredAt?: string | Date;
}

export interface IOrder {
  _id: string;
  orderNumber: string;
  customerId: string;
  subOrders: ISubOrder[];
  shippingAddress: Omit<IAddress, '_id' | 'userId' | 'isDefault'>;
  subtotalPaise: number;
  shippingPaise: number;
  taxPaise: number;
  totalPaise: number;
  currency: 'INR';
  status: OrderStatus;
  reservationExpiresAt: string | Date;
  paymentId?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}
