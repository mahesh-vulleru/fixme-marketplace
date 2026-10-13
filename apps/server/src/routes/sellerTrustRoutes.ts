import { Router } from 'express';
import { z } from 'zod';
import { DISPUTE_STATUSES } from '@fixme/shared-types';
import {
  UpdateInventorySchema,
  MarkShippedSchema,
  CreateReviewSchema,
  CreateWantedRequestSchema,
  CreateWantedOfferSchema,
  CreateDisputeSchema,
} from '@fixme/validation';
import { SellerTrustController } from '../controllers/sellerTrustController';
import { authenticate, requireRole } from '../permissions/rbac';
import { validateBody } from '../validators/validateRequest';

const router = Router();

// Seller Inventory & Operations
router.patch(
  '/seller/inventory/:listingId',
  authenticate,
  requireRole('seller', 'administrator', 'super_administrator'),
  validateBody(UpdateInventorySchema),
  SellerTrustController.adjustInventory
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
router.get('/wanted-requests/:id/offers', SellerTrustController.getWantedOffers);
router.post(
  '/wanted-requests/:id/offers',
  authenticate,
  requireRole('seller', 'administrator', 'super_administrator'),
  validateBody(CreateWantedOfferSchema),
  SellerTrustController.createWantedOffer
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

