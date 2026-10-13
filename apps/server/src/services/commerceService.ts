import crypto from 'crypto';
import { ICart, ICartItem } from '@fixme/shared-types';
import { CartModel } from '../models/Cart';
import { ListingModel, IListingDocument } from '../models/Listing';
import { OrderModel, IOrderDocument, IOrderLineItem } from '../models/Order';
import { PaymentModel, IPaymentDocument } from '../models/Payment';
import { InventoryMovementModel } from '../models/InventoryMovement';
import { ReturnRequestModel, IReturnRequestDocument } from '../models/ReturnRequest';
import { RefundModel, IRefundDocument } from '../models/Refund';
import { PaymentGateway, PaymentIntentResult } from '../integrations/payments/paymentGateway';
import { AppError } from '../middleware/errorHandler';

const PLATFORM_FEE_BPS = 800; // 8.00% platform commission (calculated in integer paise)
const GST_TAX_BPS = 1800; // 18.00% GST (calculated in integer paise)
const FLAT_SHIPPING_PAISE = 9900; // ₹99.00 flat shipping when subtotal < ₹2,000.00
const FREE_SHIPPING_THRESHOLD_PAISE = 200000; // ₹2,000.00

export class CommerceService {
  /**
   * Always recalculates cart items, prices, eligibility, and totals from database listings.
   * Never trusts client-submitted prices or totals.
   */
  static async getRecalculatedCart(userId: string): Promise<ICart> {
    let cartDoc = await CartModel.findOne({ userId });
    if (!cartDoc) {
      cartDoc = await CartModel.create({ userId, items: [] });
    }

    const listingIds = cartDoc.items.map((i) => i.listingId);
    const listings = await ListingModel.find({ _id: { $in: listingIds } });
    const listingMap = new Map<string, IListingDocument>();
    for (const l of listings) {
      listingMap.set(l._id.toString(), l);
    }

    const calculatedItems: ICartItem[] = [];
    let subtotalPaise = 0;

    for (const item of cartDoc.items) {
      const listing = listingMap.get(item.listingId.toString());
      if (!listing) continue;

      const isEligible =
        listing.status === 'active' && listing.stockAvailable >= item.quantity;
      const unitPricePaise = listing.pricePaise;
      const lineTotalPaise = unitPricePaise * item.quantity;

      if (isEligible) {
        subtotalPaise += lineTotalPaise;
      }

      calculatedItems.push({
        _id: (item as any)._id?.toString() || item.listingId.toString(),
        listingId: listing._id.toString(),
        partId: listing.partId.toString(),
        sellerId: listing.sellerId.toString(),
        title: listing.title,
        condition: listing.condition,
        quantity: item.quantity,
        unitPricePaise,
        lineTotalPaise,
        stockAvailable: listing.stockAvailable,
        isEligible,
      });
    }

    const shippingPaise =
      subtotalPaise > 0 && subtotalPaise < FREE_SHIPPING_THRESHOLD_PAISE
        ? FLAT_SHIPPING_PAISE
        : 0;
    const taxPaise = Math.round((subtotalPaise * GST_TAX_BPS) / 10000);
    const totalPaise = subtotalPaise + shippingPaise + taxPaise;

    return {
      _id: cartDoc._id.toString(),
      userId,
      items: calculatedItems,
      subtotalPaise,
      shippingPaise,
      taxPaise,
      totalPaise,
      currency: 'INR',
      updatedAt: cartDoc.updatedAt,
    };
  }

  static async addOrUpdateCartItem(
    userId: string,
    listingId: string,
    quantity: number
  ): Promise<ICart> {
    const listing = await ListingModel.findById(listingId);
    if (!listing || listing.status !== 'active') {
      throw new AppError(404, 'LISTING_UNAVAILABLE', 'Listing is not available for purchase');
    }

    if (quantity > 0 && listing.stockAvailable < quantity) {
      throw new AppError(
        409,
        'INSUFFICIENT_STOCK',
        `Only ${listing.stockAvailable} unit(s) available in stock`
      );
    }

    let cartDoc = await CartModel.findOne({ userId });
    if (!cartDoc) {
      cartDoc = await CartModel.create({ userId, items: [] });
    }

    const existingIndex = cartDoc.items.findIndex(
      (i) => i.listingId.toString() === listingId
    );

    if (quantity <= 0) {
      if (existingIndex >= 0) {
        cartDoc.items.splice(existingIndex, 1);
      }
    } else if (existingIndex >= 0) {
      cartDoc.items[existingIndex].quantity = quantity;
    } else {
      cartDoc.items.push({ listingId: listing._id, quantity });
    }

    await cartDoc.save();
    return this.getRecalculatedCart(userId);
  }

  /**
   * Atomically reserves stock across all cart items, splits multi-seller items into subOrders,
   * creates a parent Order + PaymentIntent, and clears the cart.
   * Rolls back reserved stock if any item fails atomic reservation.
   */
  static async checkout(
    customerId: string,
    shippingAddress: {
      fullName: string;
      phone: string;
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: 'IN';
    }
  ): Promise<{
    order: IOrderDocument;
    paymentIntent: PaymentIntentResult;
  }> {
    const cartDoc = await CartModel.findOne({ userId: customerId });
    if (!cartDoc || cartDoc.items.length === 0) {
      throw new AppError(400, 'EMPTY_CART', 'Cannot checkout with an empty cart');
    }

    // Atomic reservation tracking for rollback safety
    const reservedItems: Array<{
      listing: IListingDocument;
      quantity: number;
      previousAvailable: number;
    }> = [];

    try {
      for (const cartItem of cartDoc.items) {
        const updatedListing = await ListingModel.findOneAndUpdate(
          {
            _id: cartItem.listingId,
            status: 'active',
            stockAvailable: { $gte: cartItem.quantity },
          },
          {
            $inc: {
              stockAvailable: -cartItem.quantity,
              stockReserved: cartItem.quantity,
            },
          },
          { new: true }
        );

        if (!updatedListing) {
          throw new AppError(
            409,
            'INSUFFICIENT_STOCK',
            `Insufficient stock for listing ${cartItem.listingId.toString()}`
          );
        }

        reservedItems.push({
          listing: updatedListing,
          quantity: cartItem.quantity,
          previousAvailable: updatedListing.stockAvailable + cartItem.quantity,
        });
      }
    } catch (err) {
      // Rollback any already-reserved items in this checkout attempt
      for (const r of reservedItems) {
        await ListingModel.findByIdAndUpdate(r.listing._id, {
          $inc: {
            stockAvailable: r.quantity,
            stockReserved: -r.quantity,
          },
        });
      }
      throw err;
    }

    // Group items by sellerId into subOrders
    const sellerGroups = new Map<string, IOrderLineItem[]>();
    let subtotalPaise = 0;

    for (const r of reservedItems) {
      const sellerIdStr = r.listing.sellerId.toString();
      const unitPricePaise = r.listing.pricePaise;
      const lineTotalPaise = unitPricePaise * r.quantity;
      subtotalPaise += lineTotalPaise;

      const lineItem: IOrderLineItem = {
        listingId: r.listing._id,
        partId: r.listing.partId,
        title: r.listing.title,
        condition: r.listing.condition,
        quantity: r.quantity,
        unitPricePaise,
        lineTotalPaise,
      };

      const group = sellerGroups.get(sellerIdStr) || [];
      group.push(lineItem);
      sellerGroups.set(sellerIdStr, group);
    }

    const subOrders = Array.from(sellerGroups.entries()).map(([sellerId, items]) => {
      const subOrderSubtotal = items.reduce((sum, i) => sum + i.lineTotalPaise, 0);
      const platformFeePaise = Math.round(
        (subOrderSubtotal * PLATFORM_FEE_BPS) / 10000
      );
      const sellerSettlementPaise = subOrderSubtotal - platformFeePaise;

      return {
        sellerId,
        items,
        subtotalPaise: subOrderSubtotal,
        platformFeePaise,
        sellerSettlementPaise,
        fulfillmentStatus: 'pending_payment' as const,
        payoutStatus: 'pending' as const,
      };
    });

    const shippingPaise =
      subtotalPaise < FREE_SHIPPING_THRESHOLD_PAISE ? FLAT_SHIPPING_PAISE : 0;
    const taxPaise = Math.round((subtotalPaise * GST_TAX_BPS) / 10000);
    const totalPaise = subtotalPaise + shippingPaise + taxPaise;

    const orderNumber = `FXM-${Date.now().toString(36).toUpperCase()}-${crypto
      .randomBytes(2)
      .toString('hex')
      .toUpperCase()}`;

    const reservationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const order = await OrderModel.create({
      orderNumber,
      customerId,
      subOrders,
      shippingAddress,
      subtotalPaise,
      shippingPaise,
      taxPaise,
      totalPaise,
      currency: 'INR',
      status: 'pending_payment',
      reservationExpiresAt,
    });

    // Record inventory reservation movements
    await Promise.all(
      reservedItems.map((r) =>
        InventoryMovementModel.create({
          listingId: r.listing._id,
          sellerId: r.listing.sellerId,
          orderId: order._id,
          movementType: 'reserve',
          quantityDelta: -r.quantity,
          previousAvailable: r.previousAvailable,
          newAvailable: r.listing.stockAvailable,
          reason: `Checkout stock reservation for order ${orderNumber}`,
          actorUserId: customerId as any,
        })
      )
    );

    const paymentIntent = PaymentGateway.createPaymentIntent({
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      amountPaise: order.totalPaise,
    });

    const payment = await PaymentModel.create({
      orderId: order._id,
      customerId,
      provider: paymentIntent.provider,
      providerOrderId: paymentIntent.providerOrderId,
      amountPaise: order.totalPaise,
      currency: 'INR',
      status: 'pending',
      processedEventIds: [],
    });

    order.paymentId = payment._id;
    await order.save();

    // Clear customer's cart
    cartDoc.items = [];
    await cartDoc.save();

    return { order, paymentIntent };
  }

  /**
   * Idempotently processes signed payment webhooks.
   * Never double-commits stock when a duplicate webhook event arrives.
   */
  static async handlePaymentWebhook(params: {
    provider: string;
    rawBody: string;
    signature?: string;
    payload: {
      eventId: string;
      eventType: 'payment.captured' | 'payment.failed';
      providerOrderId: string;
      providerPaymentId: string;
      amountPaise: number;
    };
  }): Promise<{
    payment: IPaymentDocument;
    order: IOrderDocument;
    idempotentReplay: boolean;
  }> {
    if (!PaymentGateway.verifyWebhookSignature(params.rawBody, params.signature)) {
      throw new AppError(
        401,
        'INVALID_WEBHOOK_SIGNATURE',
        'Webhook signature verification failed'
      );
    }

    const payment = await PaymentModel.findOne({
      providerOrderId: params.payload.providerOrderId,
    });
    if (!payment) {
      throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Payment record not found');
    }

    const order = await OrderModel.findById(payment.orderId);
    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Associated order not found');
    }

    // Idempotency check: if eventId was already processed or payment already captured
    if (
      payment.processedEventIds.includes(params.payload.eventId) ||
      (params.payload.eventType === 'payment.captured' && payment.status === 'captured')
    ) {
      return { payment, order, idempotentReplay: true };
    }

    if (params.payload.amountPaise !== payment.amountPaise) {
      throw new AppError(
        400,
        'PAYMENT_AMOUNT_MISMATCH',
        'Webhook amountPaise does not match order amountPaise'
      );
    }

    payment.processedEventIds.push(params.payload.eventId);
    payment.providerPaymentId = params.payload.providerPaymentId;
    payment.rawWebhookPayload = params.payload as unknown as Record<string, unknown>;

    if (params.payload.eventType === 'payment.captured') {
      payment.status = 'captured';
      await payment.save();

      order.status = 'paid';
      for (const sub of order.subOrders) {
        sub.fulfillmentStatus = 'paid';
      }
      await order.save();

      // Commit reserved stock (decrement stockReserved)
      for (const sub of order.subOrders) {
        for (const item of sub.items) {
          const listing = await ListingModel.findByIdAndUpdate(
            item.listingId,
            { $inc: { stockReserved: -item.quantity } },
            { new: true }
          );
          if (listing) {
            await InventoryMovementModel.create({
              listingId: listing._id,
              sellerId: listing.sellerId,
              orderId: order._id,
              movementType: 'commit',
              quantityDelta: 0,
              previousAvailable: listing.stockAvailable,
              newAvailable: listing.stockAvailable,
              reason: `Payment captured for order ${order.orderNumber}`,
            });
          }
        }
      }
    } else if (params.payload.eventType === 'payment.failed') {
      payment.status = 'failed';
      await payment.save();

      order.status = 'payment_failed';
      for (const sub of order.subOrders) {
        sub.fulfillmentStatus = 'payment_failed';
      }
      await order.save();

      // Release reserved stock back to stockAvailable
      for (const sub of order.subOrders) {
        for (const item of sub.items) {
          const listing = await ListingModel.findByIdAndUpdate(
            item.listingId,
            {
              $inc: {
                stockAvailable: item.quantity,
                stockReserved: -item.quantity,
              },
            },
            { new: true }
          );
          if (listing) {
            await InventoryMovementModel.create({
              listingId: listing._id,
              sellerId: listing.sellerId,
              orderId: order._id,
              movementType: 'release',
              quantityDelta: item.quantity,
              previousAvailable: listing.stockAvailable - item.quantity,
              newAvailable: listing.stockAvailable,
              reason: `Payment failed stock release for order ${order.orderNumber}`,
            });
          }
        }
      }
    }

    return { payment, order, idempotentReplay: false };
  }

  /**
   * Releases reserved stock for expired pending_payment orders.
   */
  static async expireOverdueReservations(now = new Date()): Promise<number> {
    const expiredOrders = await OrderModel.find({
      status: 'pending_payment',
      reservationExpiresAt: { $lt: now },
    });

    let expiredCount = 0;

    for (const order of expiredOrders) {
      order.status = 'expired';
      for (const sub of order.subOrders) {
        sub.fulfillmentStatus = 'expired';
      }
      await order.save();

      for (const sub of order.subOrders) {
        for (const item of sub.items) {
          const listing = await ListingModel.findByIdAndUpdate(
            item.listingId,
            {
              $inc: {
                stockAvailable: item.quantity,
                stockReserved: -item.quantity,
              },
            },
            { new: true }
          );
          if (listing) {
            await InventoryMovementModel.create({
              listingId: listing._id,
              sellerId: listing.sellerId,
              orderId: order._id,
              movementType: 'release',
              quantityDelta: item.quantity,
              previousAvailable: listing.stockAvailable - item.quantity,
              newAvailable: listing.stockAvailable,
              reason: `Reservation expired for order ${order.orderNumber}`,
            });
          }
        }
      }

      expiredCount++;
    }

    return expiredCount;
  }

  static async listCustomerOrders(customerId: string): Promise<IOrderDocument[]> {
    return OrderModel.find({ customerId }).sort({ createdAt: -1 });
  }

  static async getOrderByIdForUser(
    orderId: string,
    userId: string,
    userRole: string
  ): Promise<IOrderDocument> {
    const order = await OrderModel.findById(orderId);
    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    const isAdminOrStaff = ['support_staff', 'administrator', 'super_administrator'].includes(
      userRole
    );
    const isCustomerOwner = order.customerId.toString() === userId;
    const isSellerParticipant = order.subOrders.some(
      (sub) => sub.sellerId.toString() === userId
    );

    if (!isAdminOrStaff && !isCustomerOwner && !isSellerParticipant) {
      throw new AppError(
        403,
        'OWNERSHIP_VIOLATION',
        'You are not authorized to access this order'
      );
    }

    return order;
  }

  static async cancelOrder(params: {
    customerId: string;
    orderId: string;
    reason?: string;
  }): Promise<IOrderDocument> {
    const order = await OrderModel.findById(params.orderId);
    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }
    if (order.customerId.toString() !== params.customerId) {
      throw new AppError(
        403,
        'OWNERSHIP_VIOLATION',
        'You cannot cancel another customer’s order'
      );
    }

    const anyShippedOrDelivered = order.subOrders.some((sub) =>
      ['shipped', 'delivered'].includes(sub.fulfillmentStatus)
    );
    if (
      anyShippedOrDelivered ||
      ['shipped', 'delivered', 'cancelled', 'expired'].includes(order.status)
    ) {
      throw new AppError(
        400,
        'CANCELLATION_NOT_ELIGIBLE',
        `Order in status '${order.status}' cannot be cancelled`
      );
    }

    const wasPendingPayment = order.status === 'pending_payment';
    order.status = 'cancelled';
    for (const sub of order.subOrders) {
      sub.fulfillmentStatus = 'cancelled';
      sub.payoutStatus = 'pending';
    }
    await order.save();

    // Restore stock safely
    for (const sub of order.subOrders) {
      for (const item of sub.items) {
        const updateQuery = wasPendingPayment
          ? {
              $inc: {
                stockAvailable: item.quantity,
                stockReserved: -item.quantity,
              },
            }
          : {
              $inc: {
                stockAvailable: item.quantity,
              },
            };

        const listing = await ListingModel.findByIdAndUpdate(
          item.listingId,
          updateQuery,
          { new: true }
        );
        if (listing) {
          await InventoryMovementModel.create({
            listingId: listing._id,
            sellerId: listing.sellerId,
            orderId: order._id,
            movementType: wasPendingPayment ? 'release' : 'return_restock',
            quantityDelta: item.quantity,
            previousAvailable: listing.stockAvailable - item.quantity,
            newAvailable: listing.stockAvailable,
            reason:
              params.reason || `Order ${order.orderNumber} cancelled by customer`,
            actorUserId: params.customerId as any,
          });
        }
      }
    }

    return order;
  }

  // Returns & Refunds
  static async requestReturn(params: {
    customerId: string;
    orderId: string;
    subOrderId: string;
    reason: string;
    evidenceAssetIds?: string[];
  }): Promise<IReturnRequestDocument> {
    const order = await OrderModel.findById(params.orderId);
    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }
    if (order.customerId.toString() !== params.customerId) {
      throw new AppError(
        403,
        'OWNERSHIP_VIOLATION',
        'Cannot request a return on another customer’s order'
      );
    }

    const subOrder = order.subOrders.id(params.subOrderId);
    if (!subOrder) {
      throw new AppError(404, 'SUBORDER_NOT_FOUND', 'Seller suborder not found');
    }

    return ReturnRequestModel.create({
      orderId: order._id,
      subOrderId: subOrder._id,
      customerId: params.customerId,
      sellerId: subOrder.sellerId,
      reason: params.reason,
      evidenceAssetIds: params.evidenceAssetIds || [],
      status: 'requested',
      refundAmountPaise: subOrder.subtotalPaise,
    });
  }

  static async processReturnRefund(params: {
    actorUserId: string;
    returnId: string;
    approve: boolean;
    resolutionNotes?: string;
    simulateGatewayFailure?: boolean;
  }): Promise<{
    returnRequest: IReturnRequestDocument;
    refund: IRefundDocument | null;
  }> {
    const returnReq = await ReturnRequestModel.findById(params.returnId);
    if (!returnReq) {
      throw new AppError(404, 'RETURN_NOT_FOUND', 'Return request not found');
    }

    if (returnReq.status === 'refunded') {
      throw new AppError(
        409,
        'DUPLICATE_REFUND',
        'This return request has already been refunded'
      );
    }

    returnReq.resolutionNotes = params.resolutionNotes;

    if (!params.approve) {
      returnReq.status = 'rejected';
      await returnReq.save();
      return { returnRequest: returnReq, refund: null };
    }

    // If gateway refund execution fails, never falsely mark the return as 'refunded'
    if (params.simulateGatewayFailure) {
      returnReq.status = 'approved';
      await returnReq.save();

      const failedRefund = await RefundModel.create({
        returnId: returnReq._id,
        orderId: returnReq.orderId,
        customerId: returnReq.customerId,
        amountPaise: returnReq.refundAmountPaise,
        currency: 'INR',
        status: 'failed',
        processedByUserId: params.actorUserId as any,
      });

      throw new AppError(
        502,
        'REFUND_GATEWAY_FAILED',
        'Payment gateway failed to process refund; return remains approved pending retry',
        { refundId: failedRefund._id.toString(), status: failedRefund.status }
      );
    }

    returnReq.status = 'refunded';
    await returnReq.save();

    const refund = await RefundModel.create({
      returnId: returnReq._id,
      orderId: returnReq.orderId,
      customerId: returnReq.customerId,
      amountPaise: returnReq.refundAmountPaise,
      currency: 'INR',
      status: 'processed',
      providerRefundId: `rfnd_${crypto.randomUUID().slice(0, 10)}`,
      processedByUserId: params.actorUserId as any,
    });

    return { returnRequest: returnReq, refund };
  }
}

