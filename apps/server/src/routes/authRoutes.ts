import { Router } from 'express';
import { z } from 'zod';
import { SELLER_STATUSES, LISTING_STATUSES } from '@fixme/shared-types';
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
  UpdateProfileSchema,
  SellerApplicationSchema,
  AddressSchema,
} from '@fixme/validation';
import { AuthController } from '../controllers/authController';
import { ModerationController } from '../controllers/moderationController';
import { authenticate, requireRole } from '../permissions/rbac';
import { validateBody } from '../validators/validateRequest';
import { authRateLimiter } from '../middleware/rateLimit';

const router = Router();

// Public Configurable Policies
router.get('/policies', ModerationController.getPolicies);

// Authentication & Password Recovery
router.post(
  '/auth/register',
  authRateLimiter,
  validateBody(RegisterSchema),
  AuthController.register
);
router.post(
  '/auth/login',
  authRateLimiter,
  validateBody(LoginSchema),
  AuthController.login
);
router.post('/auth/logout', authenticate, AuthController.logout);
router.get('/auth/me', authenticate, AuthController.getMe);
router.post(
  '/auth/forgot-password',
  authRateLimiter,
  validateBody(ForgotPasswordSchema),
  AuthController.forgotPassword
);
router.post(
  '/auth/reset-password',
  authRateLimiter,
  validateBody(ResetPasswordSchema),
  AuthController.resetPassword
);
router.post(
  '/auth/change-password',
  authenticate,
  validateBody(ChangePasswordSchema),
  AuthController.changePassword
);
router.patch(
  '/auth/profile',
  authenticate,
  validateBody(UpdateProfileSchema),
  AuthController.updateProfile
);

// Customer Addresses & Wishlist
router.get('/addresses', authenticate, AuthController.listAddresses);
router.post(
  '/addresses',
  authenticate,
  validateBody(AddressSchema),
  AuthController.addAddress
);
router.get('/wishlist', authenticate, AuthController.listWishlist);
router.post('/wishlist/:listingId', authenticate, AuthController.addWishlistItem);
router.delete('/wishlist/:listingId', authenticate, AuthController.removeWishlistItem);

// Seller KYC Application & Profile
router.get('/seller/profile', authenticate, AuthController.getSellerProfile);
router.post(
  '/seller/apply',
  authenticate,
  validateBody(SellerApplicationSchema),
  AuthController.applyForSeller
);

// Admin Moderation, Dashboard Metrics & Governance
router.get(
  '/admin/dashboard',
  authenticate,
  requireRole('support_staff', 'catalogue_manager', 'administrator', 'super_administrator'),
  ModerationController.getDashboardMetrics
);

router.get(
  '/admin/sellers',
  authenticate,
  requireRole('administrator', 'super_administrator'),
  ModerationController.listSellerApplications
);

router.patch(
  '/admin/sellers/:id/review',
  authenticate,
  requireRole('administrator', 'super_administrator'),
  validateBody(
    z.object({
      status: z.enum(SELLER_STATUSES),
      reviewNotes: z.string().max(1000).optional(),
    })
  ),
  ModerationController.reviewSellerApplication
);

router.patch(
  '/admin/listings/:id/review',
  authenticate,
  requireRole('catalogue_manager', 'administrator', 'super_administrator'),
  validateBody(
    z.object({
      status: z.enum(LISTING_STATUSES),
      moderationNotes: z.string().max(1000).optional(),
    })
  ),
  ModerationController.reviewListing
);

router.get(
  '/admin/audit-logs',
  authenticate,
  requireRole('administrator', 'super_administrator'),
  ModerationController.listAuditLogs
);

router.get(
  '/admin/users',
  authenticate,
  requireRole('administrator', 'super_administrator'),
  ModerationController.listUsers
);

router.patch(
  '/admin/users/:id/role',
  authenticate,
  requireRole('administrator', 'super_administrator'),
  validateBody(z.object({ role: z.string() })),
  ModerationController.updateUserRole
);

router.patch(
  '/admin/users/:id/status',
  authenticate,
  requireRole('administrator', 'super_administrator'),
  validateBody(z.object({ isActive: z.boolean() })),
  ModerationController.updateUserStatus
);

router.get(
  '/admin/orders',
  authenticate,
  requireRole('support_staff', 'administrator', 'super_administrator'),
  ModerationController.listAdminOrders
);

router.get(
  '/admin/disputes',
  authenticate,
  requireRole('support_staff', 'administrator', 'super_administrator'),
  ModerationController.listAdminDisputes
);

router.get(
  '/admin/finance',
  authenticate,
  requireRole('administrator', 'super_administrator'),
  ModerationController.getFinanceReport
);

export default router;
