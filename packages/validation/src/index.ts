import { z } from 'zod';
import {
  USER_ROLES,
  PART_CONDITIONS,
  LISTING_STATUSES,
  COMPATIBILITY_STATUSES,
  ASSET_TYPES,
  ORDER_STATUSES,
} from '@fixme/shared-types';

// ============================================================================
// 1. Environment Variable Validation Schemas
// ============================================================================

export const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(10, 'MONGODB_URI is required and must be a valid MongoDB URI'),
  CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL'),
  ADMIN_URL: z.string().url('ADMIN_URL must be a valid URL'),
  SELLER_URL: z.string().url('SELLER_URL must be a valid URL').default('http://localhost:5175'),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 characters long'),
  STORAGE_PROVIDER: z.enum(['cloudinary', 's3', 'local']).default('local'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  PAYMENT_PROVIDER: z.string().min(2).default('razorpay_sandbox'),
  PAYMENT_SECRET_KEY: z.string().min(4).default('sandbox_secret_key'),
  PAYMENT_WEBHOOK_SECRET: z.string().min(4).default('sandbox_webhook_secret'),
  EMAIL_PROVIDER_API_KEY: z.string().min(4).default('sandbox_email_key'),
  ADMIN_BOOTSTRAP_EMAIL: z.string().email().optional(),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(8).optional(),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

// ============================================================================
// 2. Common & Pagination Schemas
// ============================================================================

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
});

// ============================================================================
// 3. Authentication & Account Schemas
// ============================================================================

export const PasswordStrengthSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const RegisterSchema = z
  .object({
    email: z.string().email('Valid email address is required').toLowerCase().trim(),
    phone: z.string().min(10).max(15).optional(),
    fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100).trim(),
    password: PasswordStrengthSchema,
    confirmPassword: z.string().optional(),
    acceptTerms: z.boolean().optional().default(true),
    role: z.string().optional().default('customer'),
    storeName: z.string().max(80).trim().optional(),
    businessAddress: z.string().max(300).trim().optional(),
  })
  .refine(
    (data) => !data.role || data.role === 'customer' || data.role === 'seller',
    {
      message: 'Public registration cannot specify an administrative role. Allowed categories are customer or seller.',
      path: ['role'],
    }
  )
  .refine(
    (data) => !data.confirmPassword || data.password === data.confirmPassword,
    {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }
  )
  .refine((data) => data.acceptTerms === true, {
    message: 'You must accept the Terms of Service and Privacy Policy',
    path: ['acceptTerms'],
  });

export const LoginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
  mfaToken: z.string().optional(),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Valid email address is required').toLowerCase().trim(),
});

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(16, 'Valid password reset token is required').trim(),
    password: PasswordStrengthSchema,
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => !data.confirmPassword || data.password === data.confirmPassword,
    {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }
  );

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: PasswordStrengthSchema,
});

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).trim().optional(),
  phone: z.string().min(10).max(15).trim().optional(),
});

export const SellerApplicationSchema = z.object({
  storeName: z.string().min(3).max(80).trim(),
  gstin: z.string().min(10).max(20).optional(),
  panNumber: z.string().min(10).max(10).optional(),
  businessAddress: z.string().min(10).max(300).trim(),
  verificationDocumentAssetIds: z.array(z.string()).default([]),
});

export const AddressSchema = z.object({
  fullName: z.string().min(2).max(100).trim(),
  phone: z.string().min(10).max(15).trim(),
  line1: z.string().min(5).max(200).trim(),
  line2: z.string().max(200).optional(),
  city: z.string().min(2).max(80).trim(),
  state: z.string().min(2).max(80).trim(),
  postalCode: z.string().regex(/^\d{6}$/, 'Postal code must be a 6-digit Indian PIN code'),
  country: z.literal('IN').default('IN'),
  isDefault: z.boolean().default(false),
});

// ============================================================================
// 4. Catalogue & Storage Schemas
// ============================================================================

export const CreateCategorySchema = z.object({
  name: z.string().min(2).max(80).trim(),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  parentCategoryId: z.string().optional(),
});

export const CreateBrandSchema = z.object({
  name: z.string().min(1).max(80).trim(),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  logoAssetId: z.string().optional(),
});

export const CreateDeviceSchema = z.object({
  brandId: z.string().min(1),
  categoryId: z.string().min(1),
  modelName: z.string().min(2).max(120).trim(),
  modelNumber: z.string().min(2).max(80).trim(),
  variant: z.string().max(80).optional(),
  region: z.string().max(40).default('IN'),
  releaseYear: z.number().int().min(2000).max(2035).optional(),
});

export const CreatePartSchema = z.object({
  categoryId: z.string().min(1),
  brandId: z.string().min(1),
  partNumber: z.string().min(3).max(80).trim(),
  name: z.string().min(3).max(150).trim(),
  componentType: z.enum([
    'left_earbud',
    'right_earbud',
    'charging_case',
    'battery',
    'charging_port',
    'motherboard',
    'display',
    'camera_module',
    'speaker_module',
    'other',
  ]),
  description: z.string().min(10).max(2000).trim(),
  specifications: z.record(z.string(), z.string()).default({}),
  oemReference: z.string().max(100).optional(),
});

export const CreateCompatibilitySchema = z.object({
  deviceId: z.string().min(1),
  partId: z.string().min(1),
  verificationStatus: z.enum(COMPATIBILITY_STATUSES).default('verified'),
  evidenceNotes: z.string().min(5).max(1000).trim(),
  sourceType: z.enum([
    'manufacturer_datasheet',
    'teardown_verified',
    'seller_submitted',
    'admin_verified',
  ]),
});

export const CompatibilityCheckSchema = z.object({
  deviceId: z.string().min(1),
  partId: z.string().min(1),
});

export const CreateListingSchema = z.object({
  partId: z.string().min(1),
  title: z.string().min(5).max(160).trim(),
  description: z.string().max(2000).optional(),
  condition: z.enum(PART_CONDITIONS),
  pricePaise: z.number().int().positive('Price must be stored in positive integer paise'),
  currency: z.literal('INR').default('INR'),
  stockAvailable: z.number().int().min(0),
  assetIds: z.array(z.string()).default([]),
  warrantyDays: z.number().int().min(0).max(1095).default(30),
});

export const UploadIntentSchema = z.object({
  assetType: z.enum(ASSET_TYPES),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024, 'Max file size is 10MB'),
});

// ============================================================================
// 5. Commerce, Seller Operations & Trust Schemas
// ============================================================================

export const AddCartItemSchema = z.object({
  listingId: z.string().min(1),
  quantity: z.number().int().min(1).max(20).default(1),
});

export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(20),
});

export const CheckoutSchema = z.object({
  shippingAddress: AddressSchema.omit({ isDefault: true }),
});

export const UpdateInventorySchema = z.object({
  stockAvailable: z.number().int().min(0),
  reason: z.string().min(3).max(200).default('Seller manual stock adjustment'),
});

export const MarkShippedSchema = z.object({
  subOrderId: z.string().min(1),
  carrier: z.string().min(2).max(80).trim(),
  trackingNumber: z.string().min(4).max(100).trim(),
});

export const CreateReturnSchema = z.object({
  subOrderId: z.string().min(1),
  reason: z.string().min(10).max(1000).trim(),
  evidenceAssetIds: z.array(z.string()).default([]),
});

export const CreateReviewSchema = z.object({
  orderId: z.string().min(1),
  listingId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(5).max(1000).trim(),
});

export const CreateWantedRequestSchema = z.object({
  deviceId: z.string().optional(),
  category: z.string().max(100).trim().optional().default('Smartphones'),
  brand: z.string().max(100).trim().optional().default('Generic'),
  deviceModel: z.string().max(150).trim().optional().default('Various'),
  partNumber: z.string().max(100).trim().optional(),
  componentType: z.string().min(2).max(120).trim(),
  description: z.string().min(5).max(2000).trim(),
  quantity: z.coerce.number().int().min(1).max(100).default(1),
  requiredCondition: z.enum(['any', 'new', 'refurbished', 'used']).default('any'),
  maxBudgetPaise: z.coerce.number().int().min(0).default(0),
  deliveryCity: z.string().max(100).trim().optional(),
  deliveryPostalCode: z.string().max(20).trim().optional(),
  preferredDeliveryDate: z.string().optional(),
  expiresAt: z.string().optional(),
  photoAssetIds: z.array(z.string()).default([]),
});

export const UpdateWantedRequestSchema = z.object({
  description: z.string().min(5).max(2000).trim().optional(),
  maxBudgetPaise: z.coerce.number().int().min(0).optional(),
  quantity: z.coerce.number().int().min(1).max(100).optional(),
  requiredCondition: z.enum(['any', 'new', 'refurbished', 'used']).optional(),
  deliveryCity: z.string().max(100).trim().optional(),
  deliveryPostalCode: z.string().max(20).trim().optional(),
  preferredDeliveryDate: z.string().optional(),
  expiresAt: z.string().optional(),
});

export const CreateWantedOfferSchema = z.object({
  listingId: z.string().optional(),
  offeredPricePaise: z.coerce.number().int().positive('Offered price must be a positive integer in paise'),
  availableQuantity: z.coerce.number().int().min(1).default(1),
  condition: z.enum(['new', 'refurbished', 'used']).default('new'),
  compatibilityEvidence: z.string().max(1000).trim().optional(),
  warrantyDays: z.coerce.number().int().min(0).default(30),
  shippingCostPaise: z.coerce.number().int().min(0).default(0),
  estimatedDeliveryDays: z.coerce.number().int().min(1).default(3),
  notes: z.string().max(1000).optional(),
});

export const UpdateWantedOfferSchema = z.object({
  offeredPricePaise: z.coerce.number().int().positive().optional(),
  availableQuantity: z.coerce.number().int().min(1).optional(),
  condition: z.enum(['new', 'refurbished', 'used']).optional(),
  compatibilityEvidence: z.string().max(1000).trim().optional(),
  warrantyDays: z.coerce.number().int().min(0).optional(),
  shippingCostPaise: z.coerce.number().int().min(0).optional(),
  estimatedDeliveryDays: z.coerce.number().int().min(1).optional(),
  notes: z.string().max(1000).optional(),
});

export const CreateDisputeSchema = z.object({
  orderId: z.string().min(1),
  subOrderId: z.string().min(1),
  reason: z.string().min(10).max(1500).trim(),
  evidenceAssetIds: z.array(z.string()).default([]),
});

export { USER_ROLES, PART_CONDITIONS, LISTING_STATUSES, ORDER_STATUSES };
