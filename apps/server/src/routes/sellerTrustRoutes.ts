import { Router } from 'express';
import { z } from 'zod';
import { DISPUTE_STATUSES } from '@fixme/shared-types';
import {
  UpdateInventorySchema,
  CreateSellerListingSchema,
  UpdateSellerListingSchema,
  UpdateListingStatusSchema,
  CreateStockAdjustmentSchema,
  MarkShippedSchema,
  CreateReviewSchema,
  CreateWantedRequestSchema,
  UpdateWantedRequestSchema,
  CreateWantedOfferSchema,
  UpdateWantedOfferSchema,
  CreateDisputeSchema,
} from '@fixme/validation';
import { SellerTrustController } from '../controllers/sellerTrustController';
import { authenticate, requireRole } from '../permissions/rbac';
import { validateBody } from '../validators/validateRequest';

const router = Router();

// Canonical Parts Search for Sellers
router.get(
  '/seller/canonical-parts',
  authenticate,
  requireRole('seller', 'administrator', 'super_administrator'),
  SellerTrustController.searchCanonicalParts
);

// Seller Inventory & Operations
router.get(
  '/seller/inventory/summary',
  authenticate,
  requireRole('seller', 'administrator', 'super_administrator'),
  SellerTrustController.getInventorySummary
);

router.get(
  '/seller/stock-movements',
  authenticate,
  requireRole('seller', 'administrator', 'super_administrator'),
  SellerTrustController.listStockMovements
);

router.get(
  '/seller/listings',
  authenticate,
  requireRole('seller', 'administrator', 'super_administrator'),
  SellerTrustController.listMyListings
);

router.post(
  '/seller/listings',
  authenticate,
  requireRole('seller', 'administrator', 'super_administrator'),
  validateBody(CreateSellerListingSchema),
  SellerTrustController.createSellerListing
);

router.get(
  '/seller/listings/:listingId',
  authenticate,
  requireRole('seller', 'administrator', 'super_administrator'),
  SellerTrustController.getSellerListing
);

router.patch(
  '/seller/listings/:listingId',
  authenticate,
  requireRole('seller', 'administrator', 'super_administrator'),
  validateBody(UpdateSellerListingSchema),
  SellerTrustController.updateSellerListing
);

router.patch(
  '/seller/listings/:listingId/status',
  authenticate,
  requireRole('seller', 'administrator', 'super_administrator'),
  validateBody(UpdateListingStatusSchema),
  SellerTrustController.updateListingStatus
);

router.patch(
  '/seller/inventory/:listingId',
  authenticate,
  requireRole('seller', 'administrator', 'super_administrator'),
  validateBody(UpdateInventorySchema),
  SellerTrustController.adjustInventory
);

router.post(
  '/seller/listings/:listingId/stock-adjustments',
  authenticate,
  requireRole('seller', 'administrator', 'super_administrator'),
  validateBody(CreateStockAdjustmentSchema),
  SellerTrustController.adjustInventory
);

router.get(
  '/seller/listings/:listingId/stock-movements',
  authenticate,
  requireRole('seller', 'administrator', 'super_administrator'),
  SellerTrustController.listStockMovements
);

router.get(
  '/seller/orders',
  authenticate,
  requireRole('seller', 'administrator', 'super_administrator'),
  SellerTrustController.listSellerOrders
);

router.get(
  '/seller/payouts',
  authenticate,
  requireRole('seller', 'administrator', 'super_administrator'),
  SellerTrustController.getSellerPayouts
);

// Order Shipments
router.post(
  '/orders/:id/ship',
  authenticate,
  requireRole('seller', 'administrator', 'super_administrator'),
  validateBody(MarkShippedSchema),
  SellerTrustController.markShipped
);

router.get(
  '/orders/:id/shipment',
  authenticate,
  SellerTrustController.getOrderShipments
);

// Verified-Purchase Reviews
router.post(
  '/reviews',
  authenticate,
  validateBody(CreateReviewSchema),
  SellerTrustController.createReview
);

router.get('/listings/:id/reviews', SellerTrustController.listListingReviews);

// Wanted-Part Requests & Seller Offers
router.get('/wanted-requests', SellerTrustController.listWantedRequests);
router.post(
  '/wanted-requests',
  authenticate,
  validateBody(CreateWantedRequestSchema),
  SellerTrustController.createWantedRequest
);
router.get('/wanted-requests/:id', SellerTrustController.getWantedRequestById);
router.patch(
  '/wanted-requests/:id',
  authenticate,
  validateBody(UpdateWantedRequestSchema),
  SellerTrustController.updateWantedRequest
);
router.patch(
  '/wanted-requests/:id/cancel',
  authenticate,
  SellerTrustController.cancelWantedRequest
);
router.get('/wanted-requests/:id/offers', SellerTrustController.getWantedOffers);
router.post(
  '/wanted-requests/:id/offers',
  authenticate,
  requireRole('seller', 'administrator', 'super_administrator'),
  validateBody(CreateWantedOfferSchema),
  SellerTrustController.createWantedOffer
);
router.patch(
  '/wanted-requests/:id/offers/:offerId',
  authenticate,
  requireRole('seller', 'administrator', 'super_administrator'),
  validateBody(UpdateWantedOfferSchema),
  SellerTrustController.updateWantedOffer
);
router.delete(
  '/wanted-requests/:id/offers/:offerId',
  authenticate,
  requireRole('seller', 'administrator', 'super_administrator'),
  SellerTrustController.withdrawWantedOffer
);
router.patch(
  '/wanted-requests/:id/offers/:offerId/accept',
  authenticate,
  SellerTrustController.acceptWantedOffer
);
router.patch(
  '/wanted-requests/:id/offers/:offerId/reject',
  authenticate,
  SellerTrustController.rejectWantedOffer
);

// Disputes & Notifications
router.post(
  '/disputes',
  authenticate,
  validateBody(CreateDisputeSchema),
  SellerTrustController.createDispute
);

router.patch(
  '/admin/disputes/:id/resolve',
  authenticate,
  requireRole('support_staff', 'administrator', 'super_administrator'),
  validateBody(
    z.object({
      status: z.enum(DISPUTE_STATUSES),
      resolutionNotes: z.string().min(5).max(1500),
    })
  ),
  SellerTrustController.resolveDispute
);

router.get('/notifications', authenticate, SellerTrustController.listNotifications);

export default router;

