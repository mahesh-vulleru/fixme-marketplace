import { Router } from 'express';
import {
  AddCartItemSchema,
  UpdateCartItemSchema,
  CheckoutSchema,
  CreateReturnSchema,
} from '@fixme/validation';
import { CommerceController } from '../controllers/commerceController';
import { authenticate, requireRole } from '../permissions/rbac';
import { validateBody } from '../validators/validateRequest';

const router = Router();

// Server-Recalculated Cart
router.get('/cart', authenticate, CommerceController.getCart);
router.post(
  '/cart/items',
  authenticate,
  validateBody(AddCartItemSchema),
  CommerceController.addCartItem
);
router.patch(
  '/cart/items/:listingId',
  authenticate,
  validateBody(UpdateCartItemSchema),
  CommerceController.updateCartItem
);
router.delete(
  '/cart/items/:listingId',
  authenticate,
  CommerceController.removeCartItem
);

// Atomic Checkout & Payment Webhook
router.post(
  '/checkout',
  authenticate,
  validateBody(CheckoutSchema),
  CommerceController.checkout
);

router.post('/webhooks/payments/:provider', CommerceController.handlePaymentWebhook);

// Orders, Cancellations & Returns
router.get('/orders', authenticate, CommerceController.listOrders);
router.get('/orders/:id', authenticate, CommerceController.getOrder);
router.post('/orders/:id/cancel', authenticate, CommerceController.cancelOrder);
router.post(
  '/orders/:id/returns',
  authenticate,
  validateBody(CreateReturnSchema),
  CommerceController.requestReturn
);
router.patch(
  '/returns/:id/process',
  authenticate,
  requireRole('support_staff', 'administrator', 'super_administrator'),
  CommerceController.processReturn
);

export default router;
