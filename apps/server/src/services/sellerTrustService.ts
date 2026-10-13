import { DisputeStatus } from '@fixme/shared-types';
import { ListingModel, IListingDocument } from '../models/Listing';
import { InventoryMovementModel, IInventoryMovementDocument } from '../models/InventoryMovement';
import { OrderModel, IOrderDocument } from '../models/Order';
import { ShipmentModel, IShipmentDocument } from '../models/Shipment';
import { ReviewModel, IReviewDocument } from '../models/Review';
import { SellerProfileModel } from '../models/SellerProfile';
import { WantedRequestModel, IWantedRequestDocument } from '../models/WantedRequest';
import { DisputeModel, IDisputeDocument } from '../models/Dispute';
import { NotificationModel, INotificationDocument } from '../models/Notification';
import { AuditLogModel } from '../models/AuditLog';
import { AppError } from '../middleware/errorHandler';

export class SellerTrustService {
  /**
   * Adjusts seller listing stock and writes an immutable InventoryMovement record.
   * Enforces strict ownership: a seller can only adjust their own listing.
   */
  static async adjustSellerInventory(params: {
    sellerId: string;
    listingId: string;
    stockAvailable: number;
    reason: string;
  }): Promise<{
    listing: IListingDocument;
    movement: IInventoryMovementDocument;
  }> {
    if (!Number.isInteger(params.stockAvailable) || params.stockAvailable < 0) {
      throw new AppError(
        400,
        'INVALID_STOCK_VALUE',
        'stockAvailable must be a non-negative integer'
      );
    }

    const listing = await ListingModel.findById(params.listingId);
    if (!listing) {
      throw new AppError(404, 'LISTING_NOT_FOUND', 'Listing not found');
    }

    if (listing.sellerId.toString() !== params.sellerId) {
      throw new AppError(
        403,
        'OWNERSHIP_VIOLATION',
        'You cannot modify inventory for another seller’s listing'
      );
    }

    const previousAvailable = listing.stockAvailable;
    const quantityDelta = params.stockAvailable - previousAvailable;

    listing.stockAvailable = params.stockAvailable;
    await listing.save();

    const movement = await InventoryMovementModel.create({
      listingId: listing._id,
      sellerId: listing.sellerId,
      movementType: 'manual_adjustment',
      quantityDelta,
      previousAvailable,
      newAvailable: params.stockAvailable,
      reason: params.reason,
      actorUserId: params.sellerId as any,
    });

    return { listing, movement };
  }

  /**
   * Lists orders containing subOrders belonging to the authenticated seller.
   */
  static async listSellerOrders(sellerId: string): Promise<IOrderDocument[]> {
    return OrderModel.find({ 'subOrders.sellerId': sellerId }).sort({ createdAt: -1 });
  }

  /**
   * Marks a seller's subOrder as shipped, creates a Shipment record, and notifies the buyer.
   */
  static async markSubOrderShipped(params: {
    sellerId: string;
    orderId: string;
    subOrderId: string;
    carrier: string;
    trackingNumber: string;
  }): Promise<{
    order: IOrderDocument;
    shipment: IShipmentDocument;
  }> {
    const order = await OrderModel.findById(params.orderId);
    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    const subOrder = order.subOrders.id(params.subOrderId);
    if (!subOrder) {
      throw new AppError(404, 'SUBORDER_NOT_FOUND', 'Seller suborder not found');
    }

    if (subOrder.sellerId.toString() !== params.sellerId) {
      throw new AppError(
        403,
        'OWNERSHIP_VIOLATION',
        'You cannot ship another seller’s suborder'
      );
    }

    if (!['paid', 'confirmed', 'processing'].includes(subOrder.fulfillmentStatus)) {
      throw new AppError(
        400,
        'INVALID_SUBORDER_STATE',
        `Cannot mark suborder as shipped from status '${subOrder.fulfillmentStatus}'`
      );
    }

    const now = new Date();
    subOrder.fulfillmentStatus = 'shipped';
    subOrder.carrier = params.carrier;
    subOrder.trackingNumber = params.trackingNumber;
    subOrder.shippedAt = now;
    subOrder.payoutStatus = 'eligible';

    const allShippedOrDelivered = order.subOrders.every((s) =>
      ['shipped', 'delivered'].includes(s.fulfillmentStatus)
    );
    if (allShippedOrDelivered) {
      order.status = 'shipped';
    }

    await order.save();

    const shipment = await ShipmentModel.findOneAndUpdate(
      { orderId: order._id, subOrderId: subOrder._id },
      {
        orderId: order._id,
        subOrderId: subOrder._id,
        sellerId: params.sellerId,
        carrier: params.carrier,
        trackingNumber: params.trackingNumber,
        status: 'in_transit',
        shippedAt: now,
      },
      { upsert: true, new: true }
    );

    await NotificationModel.create({
      userId: order.customerId,
      title: `Order ${order.orderNumber} Shipped`,
      message: `Your spare parts suborder has been shipped via ${params.carrier} (Tracking: ${params.trackingNumber}).`,
      type: 'order_update',
      metadata: {
        orderId: order._id.toString(),
        subOrderId: subOrder._id.toString(),
        carrier: params.carrier,
        trackingNumber: params.trackingNumber,
      },
    });

    return { order, shipment };
  }

  static async getOrderShipments(
    orderId: string,
    userId: string,
    userRole: string
  ): Promise<IShipmentDocument[]> {
    const order = await OrderModel.findById(orderId);
    if (!order) {
      throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    const isStaff = ['support_staff', 'administrator', 'super_administrator'].includes(
      userRole
    );
    const isBuyer = order.customerId.toString() === userId;
    const isSeller = order.subOrders.some((s) => s.sellerId.toString() === userId);

    if (!isStaff && !isBuyer && !isSeller) {
      throw new AppError(403, 'OWNERSHIP_VIOLATION', 'Not authorized to view shipments');
    }

    return ShipmentModel.find({ orderId: order._id }).sort({ createdAt: -1 });
  }

  /**
   * Computes integer-paise settlement & payout summary for a seller.
   */
  static async getSellerPayoutSummary(sellerId: string): Promise<{
    totalGrossSalesPaise: number;
    totalPlatformFeesPaise: number;
    eligibleSettlementPaise: number;
    pendingSettlementPaise: number;
    subOrderBreakdown: Array<{
      orderId: string;
      orderNumber: string;
      subOrderId: string;
      fulfillmentStatus: string;
      payoutStatus: string;
      subtotalPaise: number;
      platformFeePaise: number;
      sellerSettlementPaise: number;
    }>;
  }> {
    const orders = await OrderModel.find({ 'subOrders.sellerId': sellerId }).sort({
      createdAt: -1,
    });

    let totalGrossSalesPaise = 0;
    let totalPlatformFeesPaise = 0;
    let eligibleSettlementPaise = 0;
    let pendingSettlementPaise = 0;
    const subOrderBreakdown: Array<{
      orderId: string;
      orderNumber: string;
      subOrderId: string;
      fulfillmentStatus: string;
      payoutStatus: string;
      subtotalPaise: number;
      platformFeePaise: number;
      sellerSettlementPaise: number;
    }> = [];

    for (const order of orders) {
      for (const sub of order.subOrders) {
        if (sub.sellerId.toString() !== sellerId) continue;
        if (['cancelled', 'expired', 'payment_failed'].includes(sub.fulfillmentStatus)) {
          continue;
        }

        totalGrossSalesPaise += sub.subtotalPaise;
        totalPlatformFeesPaise += sub.platformFeePaise;

        if (sub.payoutStatus === 'eligible' || sub.payoutStatus === 'paid') {
          eligibleSettlementPaise += sub.sellerSettlementPaise;
        } else {
          pendingSettlementPaise += sub.sellerSettlementPaise;
        }

        subOrderBreakdown.push({
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          subOrderId: sub._id.toString(),
          fulfillmentStatus: sub.fulfillmentStatus,
          payoutStatus: sub.payoutStatus,
          subtotalPaise: sub.subtotalPaise,
          platformFeePaise: sub.platformFeePaise,
          sellerSettlementPaise: sub.sellerSettlementPaise,
        });
      }
    }

    return {
      totalGrossSalesPaise,
      totalPlatformFeesPaise,
      eligibleSettlementPaise,
      pendingSettlementPaise,
      subOrderBreakdown,
    };
  }

  /**
   * Verified-Purchase Review Engine:
   * Only allows a customer to review a listing if they have a paid/shipped/delivered order
   * containing that exact listingId. Updates seller ratingAverage.
   */
  static async createVerifiedReview(params: {
    customerId: string;
    orderId: string;
    listingId: string;
    rating: number;
    comment: string;
  }): Promise<IReviewDocument> {
    const order = await OrderModel.findById(params.orderId);
    if (!order || order.customerId.toString() !== params.customerId) {
      throw new AppError(
        403,
        'UNVERIFIED_PURCHASE',
        'Reviews can only be submitted by the customer who purchased the item'
      );
    }

    if (!['paid', 'confirmed', 'processing', 'shipped', 'delivered'].includes(order.status)) {
      throw new AppError(
        403,
        'UNVERIFIED_PURCHASE',
        'Order must be paid before submitting a verified-purchase review'
      );
    }

    let matchedSubOrderSellerId: string | null = null;
    let matchedPartId: string | null = null;

    for (const sub of order.subOrders) {
      for (const item of sub.items) {
        if (item.listingId.toString() === params.listingId) {
          matchedSubOrderSellerId = sub.sellerId.toString();
          matchedPartId = item.partId.toString();
          break;
        }
      }
    }

    if (!matchedSubOrderSellerId || !matchedPartId) {
      throw new AppError(
        403,
        'UNVERIFIED_PURCHASE',
        'This listing was not part of the specified order'
      );
    }

    const existingReview = await ReviewModel.findOne({
      orderId: params.orderId,
      listingId: params.listingId,
      customerId: params.customerId,
    });
    if (existingReview) {
      throw new AppError(
        409,
        'DUPLICATE_REVIEW',
        'You have already reviewed this listing for this order'
      );
    }

    const review = await ReviewModel.create({
      orderId: params.orderId,
      listingId: params.listingId,
      partId: matchedPartId,
      sellerId: matchedSubOrderSellerId,
      customerId: params.customerId,
      rating: params.rating,
      comment: params.comment,
      isVerifiedPurchase: true,
    });

    // Recalculate seller's ratingAverage and ratingCount
    const sellerReviews = await ReviewModel.find({ sellerId: matchedSubOrderSellerId });
    const ratingCount = sellerReviews.length;
    const ratingAverage =
      ratingCount > 0
        ? Number(
            (
              sellerReviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount
            ).toFixed(2)
          )
        : 0;

    await SellerProfileModel.findOneAndUpdate(
      { userId: matchedSubOrderSellerId },
      { $set: { ratingAverage, ratingCount } }
    );

    return review;
  }

  static async listReviewsForListing(listingId: string): Promise<IReviewDocument[]> {
    return ReviewModel.find({ listingId })
      .populate('customerId', 'fullName')
      .sort({ createdAt: -1 });
  }

  /**
   * Wanted-Part Requests & Seller Offers
   */
  static async createWantedRequest(params: {
    customerId: string;
    deviceId: string;
    componentType: string;
    description: string;
    maxBudgetPaise: number;
  }): Promise<IWantedRequestDocument> {
    if (!Number.isInteger(params.maxBudgetPaise) || params.maxBudgetPaise <= 0) {
      throw new AppError(
        400,
        'INVALID_BUDGET_PAISE',
        'maxBudgetPaise must be a positive integer in paise'
      );
    }

    return WantedRequestModel.create({
      ...params,
      status: 'open',
      offers: [],
    });
  }

  static async listWantedRequests(): Promise<IWantedRequestDocument[]> {
    return WantedRequestModel.find({ status: 'open' })
      .populate('deviceId', 'modelName modelNumber')
      .populate('customerId', 'fullName')
      .sort({ createdAt: -1 });
  }

  static async createWantedOffer(params: {
    sellerId: string;
    wantedRequestId: string;
    listingId: string;
    offeredPricePaise: number;
    notes?: string;
  }): Promise<IWantedRequestDocument> {
    const wanted = await WantedRequestModel.findById(params.wantedRequestId);
    if (!wanted || wanted.status !== 'open') {
      throw new AppError(404, 'WANTED_REQUEST_NOT_OPEN', 'Wanted request not found or closed');
    }

    const listing = await ListingModel.findById(params.listingId);
    if (!listing || listing.sellerId.toString() !== params.sellerId) {
      throw new AppError(
        403,
        'OWNERSHIP_VIOLATION',
        'Offer must reference an active listing owned by the seller'
      );
    }

    wanted.offers.push({
      sellerId: params.sellerId as any,
      listingId: listing._id,
      offeredPricePaise: params.offeredPricePaise,
      notes: params.notes,
      status: 'pending',
      createdAt: new Date(),
    } as any);

    await wanted.save();

    await NotificationModel.create({
      userId: wanted.customerId,
      title: 'New Seller Offer on Wanted Part Request',
      message: `A verified seller submitted an offer of ₹${(
        params.offeredPricePaise / 100
      ).toFixed(2)} for your requested ${wanted.componentType}.`,
      type: 'wanted_offer',
      metadata: {
        wantedRequestId: wanted._id.toString(),
        offeredPricePaise: params.offeredPricePaise,
      },
    });

    return wanted;
  }

  static async getWantedOffers(wantedRequestId: string): Promise<IWantedRequestDocument> {
    const wanted = await WantedRequestModel.findById(wantedRequestId)
      .populate('deviceId', 'modelName modelNumber')
      .populate('offers.sellerId', 'fullName email')
      .populate('offers.listingId', 'title condition pricePaise warrantyDays');

    if (!wanted) {
      throw new AppError(404, 'WANTED_REQUEST_NOT_FOUND', 'Wanted request not found');
    }

    return wanted;
  }

  /**
   * Escalated Buyer-Seller Disputes
   */
  static async createDispute(params: {
    customerId: string;
    orderId: string;
    subOrderId: string;
    reason: string;
    evidenceAssetIds?: string[];
  }): Promise<IDisputeDocument> {
    const order = await OrderModel.findById(params.orderId);
    if (!order || order.customerId.toString() !== params.customerId) {
      throw new AppError(403, 'OWNERSHIP_VIOLATION', 'Cannot open dispute on another buyer’s order');
    }

    const subOrder = order.subOrders.id(params.subOrderId);
    if (!subOrder) {
      throw new AppError(404, 'SUBORDER_NOT_FOUND', 'Suborder not found');
    }

    return DisputeModel.create({
      orderId: order._id,
      subOrderId: subOrder._id,
      customerId: params.customerId,
      sellerId: subOrder.sellerId,
      reason: params.reason,
      evidenceAssetIds: params.evidenceAssetIds || [],
      status: 'open',
    });
  }

  static async resolveDispute(params: {
    actorUserId: string;
    actorRole: any;
    disputeId: string;
    status: DisputeStatus;
    resolutionNotes: string;
    requestId?: string;
  }): Promise<IDisputeDocument> {
    const dispute = await DisputeModel.findById(params.disputeId);
    if (!dispute) {
      throw new AppError(404, 'DISPUTE_NOT_FOUND', 'Dispute not found');
    }

    dispute.status = params.status;
    dispute.resolutionNotes = params.resolutionNotes;
    dispute.resolvedByUserId = params.actorUserId as any;
    await dispute.save();

    await AuditLogModel.create({
      actorId: params.actorUserId,
      actorRole: params.actorRole,
      action: `DISPUTE_RESOLVED_${params.status.toUpperCase()}`,
      entityType: 'Dispute',
      entityId: dispute._id.toString(),
      metadata: {
        status: params.status,
        resolutionNotes: params.resolutionNotes,
      },
      requestId: params.requestId,
    });

    return dispute;
  }

  static async listUserNotifications(userId: string): Promise<INotificationDocument[]> {
    return NotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(50);
  }
}

