import {
  ICategory,
  IBrand,
  IDevice,
  IPart,
  ICompatibilityRecord,
  IListing,
  IAsset,
  IUser,
  ISellerProfile,
  ICart,
  IOrder,
} from '@fixme/shared-types';

// ============================================================================
// Standard API Envelopes
// ============================================================================

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  requestId?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
  requestId?: string;
}

// ============================================================================
// Endpoint Contracts
// ============================================================================

export interface HealthCheckData {
  status: 'ok' | 'degraded';
  service: 'fixme-api';
  version: string;
  environment: string;
  database: 'connected' | 'disconnected';
  timestamp: string;
}

export type HealthCheckResponse = ApiSuccessResponse<HealthCheckData>;

export interface CompatibilityCheckResult {
  compatible: boolean;
  verificationStatus: 'verified' | 'pending' | 'rejected' | 'not_found';
  evidenceNotes?: string;
  sourceType?: string;
  device?: IDevice;
  part?: IPart;
  matchingListingsCount: number;
}

export interface UploadIntentData {
  asset: IAsset;
  uploadUrl: string;
  uploadToken: string;
  expiresAt: string;
}

export interface AuthSessionData {
  user: IUser;
  sellerProfile?: ISellerProfile | null;
  csrfToken: string;
}

export interface CheckoutSessionData {
  order: IOrder;
  paymentIntent: {
    provider: string;
    providerOrderId: string;
    amountPaise: number;
    currency: 'INR';
    keyId: string;
  };
}

export const API_V1_ROUTES = {
  HEALTH: '/api/v1/health',
  AUTH: {
    REGISTER: '/api/v1/auth/register',
    LOGIN: '/api/v1/auth/login',
    LOGOUT: '/api/v1/auth/logout',
    ME: '/api/v1/auth/me',
  },
  CATALOGUE: {
    CATEGORIES: '/api/v1/categories',
    BRANDS: '/api/v1/brands',
    DEVICES: '/api/v1/devices',
    PARTS: '/api/v1/parts',
    LISTINGS: '/api/v1/listings',
    COMPATIBILITY_CHECK: '/api/v1/compatibility/check',
  },
  ASSETS: {
    UPLOAD_INTENT: '/api/v1/assets/upload-intent',
  },
  COMMERCE: {
    CART: '/api/v1/cart',
    CART_ITEMS: '/api/v1/cart/items',
    CHECKOUT: '/api/v1/checkout',
    ORDERS: '/api/v1/orders',
  },
  SELLER: {
    APPLY: '/api/v1/seller/apply',
    PROFILE: '/api/v1/seller/profile',
    LISTINGS: '/api/v1/seller/listings',
    INVENTORY: '/api/v1/seller/inventory',
    ORDERS: '/api/v1/seller/orders',
    PAYOUTS: '/api/v1/seller/payouts',
  },
  ADMIN: {
    DASHBOARD: '/api/v1/admin/dashboard',
    USERS: '/api/v1/admin/users',
    SELLERS: '/api/v1/admin/sellers',
    LISTINGS_MODERATION: '/api/v1/admin/listings',
    COMPATIBILITY: '/api/v1/admin/compatibility',
    AUDIT_LOGS: '/api/v1/admin/audit-logs',
  },
} as const;

export type {
  ICategory,
  IBrand,
  IDevice,
  IPart,
  ICompatibilityRecord,
  IListing,
  IAsset,
  IUser,
  ISellerProfile,
  ICart,
  IOrder,
};
