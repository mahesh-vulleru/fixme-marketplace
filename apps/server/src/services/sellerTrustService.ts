import { DisputeStatus } from '@fixme/shared-types';
import { ListingModel, IListingDocument } from '../models/Listing';
import { InventoryMovementModel, IInventoryMovementDocument } from '../models/InventoryMovement';
import { PartModel } from '../models/Part';
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
   * Verifies that the authenticated seller has an approved SellerProfile.
   */
  static async requireApprovedSeller(sellerId: string, role?: string): Promise<void> {
    if (role === 'administrator' || role === 'super_administrator') return;
    const profile = await SellerProfileModel.findOne({ userId: sellerId });
    if (!profile || profile.status !== 'approved') {
      throw new AppError(
        403,
        'SELLER_NOT_APPROVED',
        'Your seller account must be approved by an administrator before performing seller operations'
      );
    }
  }

  /**
   * Lists listings owned exclusively by the authenticated seller with filtering, sorting and pagination.
   */
  static async listMyListings(
    sellerId: string,
    filters?: {
      status?: string;
      condition?: string;
      lowStock?: boolean;
      outOfStock?: boolean;
      q?: string;
      sort?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{
    listings: IListingDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query: any = { sellerId };

    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.condition) {
      query.condition = filters.condition;
    }
    if (filters?.outOfStock) {
      query.stockAvailable = 0;
    }

    if (filters?.q) {
      const regex = new RegExp(filters.q.trim(), 'i');
      query.$or = [{ title: regex }, { sellerSku: regex }];
    }

    let sortOption: any = { createdAt: -1 };
    if (filters?.sort === 'price_asc') sortOption = { pricePaise: 1 };
    if (filters?.sort === 'price_desc') sortOption = { pricePaise: -1 };
    if (filters?.sort === 'stock_asc') sortOption = { stockAvailable: 1 };
    if (filters?.sort === 'stock_desc') sortOption = { stockAvailable: -1 };
    if (filters?.sort === 'oldest') sortOption = { createdAt: 1 };

    const page = Math.max(1, filters?.page || 1);
    const limit = Math.max(1, Math.min(100, filters?.limit || 50));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      ListingModel.find(query)
        .populate({
          path: 'partId',
          select: 'name partNumber componentType categoryId brandId oemReference description specifications',
          populate: [
            { path: 'categoryId', select: 'name slug' },
            { path: 'brandId', select: 'name slug' },
          ],
        })
        .populate('assetIds', 'deliveryUrl thumbnailUrl mimeType')
        .sort(sortOption)
        .skip(skip)
        .limit(limit),
      ListingModel.countDocuments(query),
    ]);

    let resultItems = items;
    if (filters?.lowStock) {
      resultItems = items.filter(
        (l) => l.stockAvailable > 0 && l.stockAvailable <= (l.lowStockThreshold ?? 5)
      );
    }

    return {
      listings: resultItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Retrieves single listing owned by the authenticated seller.
   */
  static async getSellerListingById(
    sellerId: string,
    listingId: string
  ): Promise<IListingDocument> {
    const listing = await ListingModel.findById(listingId)
      .populate({
        path: 'partId',
        select: 'name partNumber componentType categoryId brandId oemReference description specifications',
        populate: [
          { path: 'categoryId', select: 'name slug' },
          { path: 'brandId', select: 'name slug' },
        ],
      })
      .populate('assetIds', 'deliveryUrl thumbnailUrl mimeType');

    if (!listing) {
      throw new AppError(404, 'LISTING_NOT_FOUND', 'Listing not found');
    }
    if (listing.sellerId.toString() !== sellerId) {
      throw new AppError(
        403,
        'OWNERSHIP_VIOLATION',
        'You cannot view details for another seller’s listing'
      );
    }
    return listing;
  }

  /**
   * Creates a listing owned by the authenticated approved seller.
   */
  static async createSellerListing(params: {
    sellerId: string;
    sellerRole?: string;
    partId: string;
    title: string;
    sellerSku?: string;
    description?: string;
    condition: string;
    pricePaise: number;
    stockAvailable: number;
    warrantyDays?: number;
    lowStockThreshold?: number;
    shippingFeePaise?: number;
    dispatchLeadTimeDays?: number;
    shippingOriginPostalCode?: string;
    assetIds?: string[];
    status?: string;
  }): Promise<IListingDocument> {
    await this.requireApprovedSeller(params.sellerId, params.sellerRole);

    const canonicalPart = await PartModel.findById(params.partId);
    if (!canonicalPart || !canonicalPart.isActive) {
      throw new AppError(
        400,
        'INVALID_CANONICAL_PART',
        'Canonical spare part does not exist or is inactive'
      );
    }

    const title = params.title.trim();
    if (!title) {
      throw new AppError(400, 'INVALID_TITLE', 'Listing title cannot be empty');
    }

    if (!Number.isInteger(params.pricePaise) || params.pricePaise <= 0) {
      throw new AppError(
        400,
        'INVALID_PRICE',
        'Price per piece must be a positive integer in paise'
      );
    }

    if (!Number.isInteger(params.stockAvailable) || params.stockAvailable < 0) {
      throw new AppError(
        400,
        'INVALID_STOCK_VALUE',
        'Initial stock quantity must be a non-negative integer'
      );
    }

    // Enforce unique SKU within seller's inventory
    const sku = params.sellerSku?.trim();
    if (sku) {
      const existingSku = await ListingModel.findOne({
        sellerId: params.sellerId,
        sellerSku: sku,
      });
      if (existingSku) {
        throw new AppError(
          409,
          'DUPLICATE_SELLER_SKU',
          `Seller SKU '${sku}' is already assigned to another of your listings`
        );
      }
    }

    const initialStatus =
      params.stockAvailable === 0
        ? 'out_of_stock'
        : params.status === 'draft'
        ? 'draft'
        : params.status === 'active'
        ? 'active'
        : 'pending_review';

    const listing = await ListingModel.create({
      partId: canonicalPart._id,
      sellerId: params.sellerId,
      sellerSku: sku || undefined,
      title,
      description: params.description?.trim() || title,
      condition: params.condition as any,
      pricePaise: params.pricePaise,
      currency: 'INR',
      stockAvailable: params.stockAvailable,
      stockReserved: 0,
      lowStockThreshold: params.lowStockThreshold ?? 5,
      warrantyDays: params.warrantyDays ?? 30,
      shippingFeePaise: params.shippingFeePaise ?? 0,
      dispatchLeadTimeDays: params.dispatchLeadTimeDays ?? 2,
      shippingOriginPostalCode: params.shippingOriginPostalCode?.trim() || undefined,
      assetIds: params.assetIds || [],
      status: initialStatus,
    });

    // Record initial stock movement if units received
    if (params.stockAvailable > 0) {
      await InventoryMovementModel.create({
        listingId: listing._id,
        sellerId: listing.sellerId,
        movementType: 'initial_receipt',
        quantityDelta: params.stockAvailable,
        previousAvailable: 0,
        newAvailable: params.stockAvailable,
        reason: 'Initial stock intake upon listing publication',
        actorUserId: params.sellerId as any,
      });
    }

    return listing;
  }

  /**
   * Updates a seller listing with ownership enforcement and moderation check.
   */
  static async updateSellerListing(params: {
    sellerId: string;
    listingId: string;
    update: {
      title?: string;
      sellerSku?: string;
      description?: string;
      condition?: string;
      pricePaise?: number;
      warrantyDays?: number;
      lowStockThreshold?: number;
      shippingFeePaise?: number;
      dispatchLeadTimeDays?: number;
      shippingOriginPostalCode?: string;
      assetIds?: string[];
    };
  }): Promise<IListingDocument> {
    const listing = await ListingModel.findById(params.listingId);
    if (!listing) {
      throw new AppError(404, 'LISTING_NOT_FOUND', 'Listing not found');
    }
    if (listing.sellerId.toString() !== params.sellerId) {
      throw new AppError(
        403,
        'OWNERSHIP_VIOLATION',
        'You cannot modify another seller’s listing'
      );
    }

    if (params.update.sellerSku !== undefined) {
      const sku = params.update.sellerSku.trim();
      if (sku && sku !== listing.sellerSku) {
        const existingSku = await ListingModel.findOne({
          sellerId: params.sellerId,
          sellerSku: sku,
          _id: { $ne: listing._id },
        });
        if (existingSku) {
          throw new AppError(
            409,
            'DUPLICATE_SKU',
            `Seller SKU '${sku}' is already in use by another of your listings`
          );
        }
        listing.sellerSku = sku;
      }
    }

    if (params.update.title !== undefined) {
      const title = params.update.title.trim();
      if (!title) throw new AppError(400, 'INVALID_TITLE', 'Title cannot be empty');
      listing.title = title;
    }

    if (params.update.pricePaise !== undefined) {
      if (!Number.isInteger(params.update.pricePaise) || params.update.pricePaise <= 0) {
        throw new AppError(
          400,
          'INVALID_PRICE',
          'Price per piece must be a positive integer in paise'
        );
      }
      listing.pricePaise = params.update.pricePaise;
    }

    if (params.update.description !== undefined) {
      listing.description = params.update.description.trim();
    }
    if (params.update.condition !== undefined) {
      listing.condition = params.update.condition as any;
    }
    if (params.update.warrantyDays !== undefined) {
      listing.warrantyDays = params.update.warrantyDays;
    }
    if (params.update.lowStockThreshold !== undefined) {
      listing.lowStockThreshold = params.update.lowStockThreshold;
    }
    if (params.update.shippingFeePaise !== undefined) {
      listing.shippingFeePaise = params.update.shippingFeePaise;
    }
    if (params.update.dispatchLeadTimeDays !== undefined) {
      listing.dispatchLeadTimeDays = params.update.dispatchLeadTimeDays;
    }
    if (params.update.shippingOriginPostalCode !== undefined) {
      listing.shippingOriginPostalCode = params.update.shippingOriginPostalCode.trim();
    }
    if (params.update.assetIds !== undefined) {
      listing.assetIds = params.update.assetIds as any;
    }

    await listing.save();
    return listing;
  }

  /**
   * Updates listing status with permission checks.
   */
  static async updateListingStatus(params: {
    sellerId: string;
    listingId: string;
    status: string;
  }): Promise<IListingDocument> {
    const listing = await ListingModel.findById(params.listingId);
    if (!listing) {
      throw new AppError(404, 'LISTING_NOT_FOUND', 'Listing not found');
    }
    if (listing.sellerId.toString() !== params.sellerId) {
      throw new AppError(
        403,
        'OWNERSHIP_VIOLATION',
        'You cannot change the status of another seller’s listing'
      );
    }

    const permitted = ['draft', 'pending_review', 'paused', 'archived', 'active'];
    if (!permitted.includes(params.status)) {
      throw new AppError(400, 'INVALID_STATUS', `Status '${params.status}' is not permitted`);
    }

    if (params.status === 'active') {
      await this.requireApprovedSeller(params.sellerId);
      if (listing.stockAvailable === 0) {
        throw new AppError(
          400,
          'CANNOT_ACTIVATE_EMPTY_STOCK',
          'Cannot activate a listing with 0 available stock'
        );
      }
    }

    listing.status = params.status as any;
    await listing.save();
    return listing;
  }

  /**
   * Adjusts seller listing stock and writes an immutable InventoryMovement record.
   */
  static async adjustSellerInventory(params: {
    sellerId: string;
    listingId: string;
    movementType?: string;
    quantityDelta?: number;
    stockAvailable?: number;
    reason: string;
    reference?: string;
    notes?: string;
  }): Promise<{
    listing: IListingDocument;
    movement: IInventoryMovementDocument;
  }> {
    let listing = await ListingModel.findById(params.listingId);
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

    if (!params.reason || !params.reason.trim()) {
      throw new AppError(400, 'REASON_REQUIRED', 'A clear reason is required for stock movements');
    }

    const previousAvailable = listing.stockAvailable;
    let nextAvailable: number;
    let delta: number;

    if (params.quantityDelta !== undefined) {
      if (!Number.isInteger(params.quantityDelta)) {
        throw new AppError(400, 'INVALID_DELTA', 'quantityDelta must be an integer');
      }
      delta = params.quantityDelta;

      const filter: any = { _id: params.listingId, sellerId: params.sellerId };
      if (delta < 0) {
        filter.stockAvailable = { $gte: Math.abs(delta) };
      }

      const updated = await ListingModel.findOneAndUpdate(
        filter,
        { $inc: { stockAvailable: delta } },
        { new: true }
      );

      if (!updated) {
        throw new AppError(
          400,
          'NEGATIVE_STOCK_PREVENTED',
          `Cannot deduct ${Math.abs(delta)} units: only ${previousAvailable} available on hand`
        );
      }

      nextAvailable = updated.stockAvailable;
      if (nextAvailable === 0 && updated.status === 'active') {
        updated.status = 'out_of_stock';
        await updated.save();
      } else if (nextAvailable > 0 && updated.status === 'out_of_stock') {
        updated.status = 'active';
        await updated.save();
      }
      listing = updated;
    } else if (params.stockAvailable !== undefined) {
      if (!Number.isInteger(params.stockAvailable) || params.stockAvailable < 0) {
        throw new AppError(
          400,
          'INVALID_STOCK_VALUE',
          'stockAvailable must be a non-negative integer'
        );
      }
      nextAvailable = params.stockAvailable;
      delta = nextAvailable - previousAvailable;

      listing.stockAvailable = nextAvailable;
      if (nextAvailable === 0 && listing.status === 'active') {
        listing.status = 'out_of_stock';
      } else if (nextAvailable > 0 && listing.status === 'out_of_stock') {
        listing.status = 'active';
      }
      await listing.save();
    } else {
      throw new AppError(400, 'MISSING_ADJUSTMENT_VALUE', 'Specify stockAvailable or quantityDelta');
    }

    const movementType = (params.movementType || 'manual_adjustment') as any;

    const movement = await InventoryMovementModel.create({
      listingId: listing._id,
      sellerId: listing.sellerId,
      movementType,
      quantityDelta: delta,
      previousAvailable,
      newAvailable: nextAvailable,
      reason: params.reason.trim(),
      reference: params.reference?.trim() || undefined,
      notes: params.notes?.trim() || undefined,
      actorUserId: params.sellerId as any,
    });

    return { listing, movement };
  }

  /**
   * Computes authoritative inventory valuation, stock counts, and status metrics for a seller.
   */
  static async getSellerInventorySummary(sellerId: string): Promise<{
    totalListings: number;
    activeListings: number;
    pendingListings: number;
    pausedListings: number;
    outOfStockListings: number;
    lowStockListings: number;
    totalSellableStock: number;
    totalInventoryValuePaise: number;
    recentMovements: IInventoryMovementDocument[];
  }> {
    const listings = await ListingModel.find({ sellerId });
    const totalListings = listings.length;
    let activeListings = 0;
    let pendingListings = 0;
    let pausedListings = 0;
    let outOfStockListings = 0;
    let lowStockListings = 0;
    let totalSellableStock = 0;
    let totalInventoryValuePaise = 0;

    for (const item of listings) {
      const avail = item.stockAvailable ?? 0;
      const threshold = item.lowStockThreshold ?? 5;
      const price = item.pricePaise ?? 0;

      totalInventoryValuePaise += price * avail;

      if (item.status === 'active') {
        activeListings++;
        totalSellableStock += avail;
      } else if (item.status === 'pending_review') {
        pendingListings++;
      } else if (item.status === 'paused') {
        pausedListings++;
      }

      if (avail === 0) {
        outOfStockListings++;
      } else if (avail <= threshold) {
        lowStockListings++;
      }
    }

    const recentMovements = await InventoryMovementModel.find({ sellerId })
      .populate('listingId', 'title sellerSku pricePaise')
      .sort({ createdAt: -1 })
      .limit(10);

    return {
      totalListings,
      activeListings,
      pendingListings,
      pausedListings,
      outOfStockListings,
      lowStockListings,
      totalSellableStock,
      totalInventoryValuePaise,
      recentMovements,
    };
  }

  /**
   * Lists audited inventory movements for a seller.
   */
  static async listStockMovements(params: {
    sellerId: string;
    listingId?: string;
    movementType?: string;
    limit?: number;
  }): Promise<IInventoryMovementDocument[]> {
    const query: any = { sellerId: params.sellerId };
    if (params.listingId) {
      query.listingId = params.listingId;
    }
    if (params.movementType) {
      query.movementType = params.movementType;
    }
    return InventoryMovementModel.find(query)
      .populate('listingId', 'title sellerSku pricePaise condition')
      .sort({ createdAt: -1 })
      .limit(params.limit || 100);
  }

  /**
   * Searchable canonical parts directory for sellers to map listings.
   */
  static async searchCanonicalParts(filters?: {
    q?: string;
    categoryId?: string;
    brandId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    parts: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: any = { isActive: true };
    if (filters?.categoryId) {
      query.categoryId = filters.categoryId;
    }
    if (filters?.brandId) {
      query.brandId = filters.brandId;
    }
    if (filters?.q) {
      const regex = new RegExp(filters.q.trim(), 'i');
      query.$or = [
        { name: regex },
        { partNumber: regex },
        { componentType: regex },
        { oemReference: regex },
        { description: regex },
      ];
    }

    const page = Math.max(1, filters?.page || 1);
    const limit = Math.max(1, Math.min(100, filters?.limit || 30));
    const skip = (page - 1) * limit;

    const [parts, total] = await Promise.all([
      PartModel.find(query)
        .populate('categoryId', 'name slug')
        .populate('brandId', 'name slug')
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit),
      PartModel.countDocuments(query),
    ]);

    return {
      parts,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    };
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
  /**
   * Wanted-Part Requests & Seller Offers Engine
   */
  static async createWantedRequest(params: {
    customerId: string;
    category?: string;
    brand?: string;
    deviceModel?: string;
    partNumber?: string;
    componentType: string;
    description: string;
    quantity?: number;
    requiredCondition?: 'any' | 'new' | 'refurbished' | 'used';
    maxBudgetPaise?: number;
    deliveryCity?: string;
    deliveryPostalCode?: string;
    preferredDeliveryDate?: string | Date;
    expiresAt?: string | Date;
    photoAssetIds?: string[];
    deviceId?: string;
  }): Promise<IWantedRequestDocument> {
    const maxBudget = params.maxBudgetPaise ?? 0;
    if (!Number.isInteger(maxBudget) || maxBudget < 0) {
      throw new AppError(
        400,
        'INVALID_BUDGET_PAISE',
        'maxBudgetPaise must be a non-negative integer in paise'
      );
    }

    const qty = params.quantity ?? 1;
    if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
      throw new AppError(400, 'INVALID_QUANTITY', 'Quantity must be between 1 and 100');
    }

    const expiresAt = params.expiresAt
      ? new Date(params.expiresAt)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return WantedRequestModel.create({
      customerId: params.customerId,
      category: params.category?.trim() || 'Smartphones',
      brand: params.brand?.trim() || 'Generic',
      deviceModel: params.deviceModel?.trim() || 'Various',
      partNumber: params.partNumber?.trim(),
      componentType: params.componentType.trim(),
      description: params.description.trim(),
      quantity: qty,
      requiredCondition: params.requiredCondition || 'any',
      maxBudgetPaise: maxBudget,
      deliveryCity: params.deliveryCity?.trim(),
      deliveryPostalCode: params.deliveryPostalCode?.trim(),
      preferredDeliveryDate: params.preferredDeliveryDate
        ? new Date(params.preferredDeliveryDate)
        : undefined,
      expiresAt,
      photoAssetIds: params.photoAssetIds || [],
      deviceId: params.deviceId || undefined,
      status: 'open',
      offers: [],
    });
  }

  static async listWantedRequests(filters?: {
    customerId?: string;
    status?: string;
    brand?: string;
    category?: string;
    q?: string;
  }): Promise<IWantedRequestDocument[]> {
    const query: any = {};

    if (filters?.customerId) {
      query.customerId = filters.customerId;
      if (filters.status) {
        query.status = filters.status;
      }
    } else {
      query.status = filters?.status || 'open';
    }

    if (filters?.brand) {
      query.brand = new RegExp(filters.brand.trim(), 'i');
    }
    if (filters?.category) {
      query.category = new RegExp(filters.category.trim(), 'i');
    }
    if (filters?.q) {
      const regex = new RegExp(filters.q.trim(), 'i');
      query.$or = [
        { componentType: regex },
        { deviceModel: regex },
        { brand: regex },
        { partNumber: regex },
        { description: regex },
      ];
    }

    return WantedRequestModel.find(query)
      .populate('customerId', 'fullName email phone')
      .populate('deviceId', 'modelName modelNumber')
      .populate('offers.sellerId', 'fullName email')
      .sort({ createdAt: -1 });
  }

  static async getWantedRequestById(id: string): Promise<IWantedRequestDocument> {
    const wanted = await WantedRequestModel.findById(id)
      .populate('customerId', 'fullName email phone')
      .populate('deviceId', 'modelName modelNumber')
      .populate('offers.sellerId', 'fullName email');

    if (!wanted) {
      throw new AppError(404, 'WANTED_REQUEST_NOT_FOUND', 'Wanted request not found');
    }

    // Auto-expire check
    if (wanted.status === 'open' && wanted.expiresAt && wanted.expiresAt < new Date()) {
      wanted.status = 'expired';
      await wanted.save();
    }

    return wanted;
  }

  static async updateWantedRequest(params: {
    customerId: string;
    requestId: string;
    update: {
      description?: string;
      maxBudgetPaise?: number;
      quantity?: number;
      requiredCondition?: 'any' | 'new' | 'refurbished' | 'used';
      deliveryCity?: string;
      deliveryPostalCode?: string;
      preferredDeliveryDate?: string | Date;
      expiresAt?: string | Date;
    };
  }): Promise<IWantedRequestDocument> {
    const wanted = await WantedRequestModel.findById(params.requestId);
    if (!wanted) {
      throw new AppError(404, 'WANTED_REQUEST_NOT_FOUND', 'Wanted request not found');
    }
    if (wanted.customerId.toString() !== params.customerId) {
      throw new AppError(403, 'OWNERSHIP_VIOLATION', 'Cannot edit another customer’s request');
    }
    if (wanted.status !== 'open') {
      throw new AppError(400, 'REQUEST_NOT_OPEN', 'Only open requests can be modified');
    }

    if (params.update.description !== undefined) {
      wanted.description = params.update.description.trim();
    }
    if (params.update.maxBudgetPaise !== undefined) {
      wanted.maxBudgetPaise = params.update.maxBudgetPaise;
    }
    if (params.update.quantity !== undefined) {
      wanted.quantity = params.update.quantity;
    }
    if (params.update.requiredCondition !== undefined) {
      wanted.requiredCondition = params.update.requiredCondition;
    }
    if (params.update.deliveryCity !== undefined) {
      wanted.deliveryCity = params.update.deliveryCity.trim();
    }
    if (params.update.deliveryPostalCode !== undefined) {
      wanted.deliveryPostalCode = params.update.deliveryPostalCode.trim();
    }
    if (params.update.preferredDeliveryDate !== undefined) {
      wanted.preferredDeliveryDate = params.update.preferredDeliveryDate
        ? new Date(params.update.preferredDeliveryDate)
        : undefined;
    }
    if (params.update.expiresAt !== undefined) {
      wanted.expiresAt = new Date(params.update.expiresAt);
    }

    await wanted.save();
    return wanted;
  }

  static async cancelWantedRequest(params: {
    customerId: string;
    requestId: string;
    userRole?: string;
  }): Promise<IWantedRequestDocument> {
    const wanted = await WantedRequestModel.findById(params.requestId);
    if (!wanted) {
      throw new AppError(404, 'WANTED_REQUEST_NOT_FOUND', 'Wanted request not found');
    }
    const isOwner = wanted.customerId.toString() === params.customerId;
    const isAdmin = ['administrator', 'super_administrator'].includes(params.userRole || '');
    if (!isOwner && !isAdmin) {
      throw new AppError(403, 'OWNERSHIP_VIOLATION', 'Cannot cancel another customer’s request');
    }
    if (wanted.status !== 'open') {
      throw new AppError(400, 'REQUEST_NOT_OPEN', `Cannot cancel a request that is already ${wanted.status}`);
    }

    wanted.status = 'cancelled';
    for (const offer of wanted.offers) {
      if (offer.status === 'pending') {
        offer.status = 'rejected';
      }
    }

    await wanted.save();
    return wanted;
  }

  static async createWantedOffer(params: {
    sellerId: string;
    wantedRequestId: string;
    offeredPricePaise: number;
    availableQuantity?: number;
    condition?: 'new' | 'refurbished' | 'used';
    compatibilityEvidence?: string;
    warrantyDays?: number;
    shippingCostPaise?: number;
    estimatedDeliveryDays?: number;
    notes?: string;
    listingId?: string;
  }): Promise<IWantedRequestDocument> {
    const wanted = await WantedRequestModel.findById(params.wantedRequestId);
    if (!wanted || wanted.status !== 'open') {
      throw new AppError(404, 'WANTED_REQUEST_NOT_OPEN', 'Wanted request not found or is closed');
    }

    if (wanted.expiresAt && wanted.expiresAt < new Date()) {
      wanted.status = 'expired';
      await wanted.save();
      throw new AppError(400, 'REQUEST_EXPIRED', 'This wanted-part request has expired and cannot accept offers');
    }

    // Check for duplicate pending offer from the same seller
    const existingOffer = wanted.offers.find(
      (o) => o.sellerId.toString() === params.sellerId && o.status === 'pending'
    );
    if (existingOffer) {
      throw new AppError(
        409,
        'DUPLICATE_OFFER',
        'You already have an active offer on this request. Please edit or withdraw your existing offer.'
      );
    }

    // Lookup seller profile to record storeName
    const sellerProfile = await SellerProfileModel.findOne({ userId: params.sellerId });
    const storeName = sellerProfile?.storeName || 'Verified Spares Seller';

    // Optional listing validation
    let listingObjId = undefined;
    if (params.listingId) {
      const listing = await ListingModel.findById(params.listingId);
      if (listing && listing.sellerId.toString() === params.sellerId) {
        listingObjId = listing._id;
      }
    }

    wanted.offers.push({
      sellerId: params.sellerId as any,
      storeName,
      listingId: listingObjId,
      offeredPricePaise: params.offeredPricePaise,
      availableQuantity: params.availableQuantity ?? 1,
      condition: params.condition || 'new',
      compatibilityEvidence: params.compatibilityEvidence?.trim(),
      warrantyDays: params.warrantyDays ?? 30,
      shippingCostPaise: params.shippingCostPaise ?? 0,
      estimatedDeliveryDays: params.estimatedDeliveryDays ?? 3,
      notes: params.notes?.trim(),
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    await wanted.save();

    await NotificationModel.create({
      userId: wanted.customerId,
      title: 'New Seller Offer on Wanted Part Request',
      message: `${storeName} submitted an offer of ₹${(
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

  static async updateWantedOffer(params: {
    sellerId: string;
    wantedRequestId: string;
    offerId: string;
    update: {
      offeredPricePaise?: number;
      availableQuantity?: number;
      condition?: 'new' | 'refurbished' | 'used';
      compatibilityEvidence?: string;
      warrantyDays?: number;
      shippingCostPaise?: number;
      estimatedDeliveryDays?: number;
      notes?: string;
    };
  }): Promise<IWantedRequestDocument> {
    const wanted = await WantedRequestModel.findById(params.wantedRequestId);
    if (!wanted) {
      throw new AppError(404, 'WANTED_REQUEST_NOT_FOUND', 'Wanted request not found');
    }
    if (wanted.status !== 'open') {
      throw new AppError(400, 'REQUEST_NOT_OPEN', 'Cannot edit offer on a closed or fulfilled request');
    }

    const offer = wanted.offers.id(params.offerId);
    if (!offer) {
      throw new AppError(404, 'OFFER_NOT_FOUND', 'Offer not found');
    }
    if (offer.sellerId.toString() !== params.sellerId) {
      throw new AppError(403, 'OWNERSHIP_VIOLATION', 'Cannot edit another seller’s offer');
    }
    if (offer.status !== 'pending') {
      throw new AppError(400, 'OFFER_NOT_PENDING', `Offer cannot be edited because it is ${offer.status}`);
    }

    if (params.update.offeredPricePaise !== undefined) {
      offer.offeredPricePaise = params.update.offeredPricePaise;
    }
    if (params.update.availableQuantity !== undefined) {
      offer.availableQuantity = params.update.availableQuantity;
    }
    if (params.update.condition !== undefined) {
      offer.condition = params.update.condition;
    }
    if (params.update.compatibilityEvidence !== undefined) {
      offer.compatibilityEvidence = params.update.compatibilityEvidence.trim();
    }
    if (params.update.warrantyDays !== undefined) {
      offer.warrantyDays = params.update.warrantyDays;
    }
    if (params.update.shippingCostPaise !== undefined) {
      offer.shippingCostPaise = params.update.shippingCostPaise;
    }
    if (params.update.estimatedDeliveryDays !== undefined) {
      offer.estimatedDeliveryDays = params.update.estimatedDeliveryDays;
    }
    if (params.update.notes !== undefined) {
      offer.notes = params.update.notes.trim();
    }
    offer.updatedAt = new Date();

    await wanted.save();
    return wanted;
  }

  static async withdrawWantedOffer(params: {
    sellerId: string;
    wantedRequestId: string;
    offerId: string;
  }): Promise<IWantedRequestDocument> {
    const wanted = await WantedRequestModel.findById(params.wantedRequestId);
    if (!wanted) {
      throw new AppError(404, 'WANTED_REQUEST_NOT_FOUND', 'Wanted request not found');
    }

    const offer = wanted.offers.id(params.offerId);
    if (!offer) {
      throw new AppError(404, 'OFFER_NOT_FOUND', 'Offer not found');
    }
    if (offer.sellerId.toString() !== params.sellerId) {
      throw new AppError(403, 'OWNERSHIP_VIOLATION', 'Cannot withdraw another seller’s offer');
    }
    if (offer.status !== 'pending') {
      throw new AppError(400, 'OFFER_NOT_PENDING', `Cannot withdraw an offer with status ${offer.status}`);
    }

    offer.status = 'withdrawn';
    offer.updatedAt = new Date();
    await wanted.save();
    return wanted;
  }

  /**
   * Concurrency-safe atomic offer acceptance by customer
   */
  static async acceptWantedOffer(params: {
    customerId: string;
    wantedRequestId: string;
    offerId: string;
  }): Promise<IWantedRequestDocument> {
    // 1. Verify existence and ownership first
    const wantedCheck = await WantedRequestModel.findById(params.wantedRequestId);
    if (!wantedCheck) {
      throw new AppError(404, 'WANTED_REQUEST_NOT_FOUND', 'Wanted request not found');
    }
    if (wantedCheck.customerId.toString() !== params.customerId) {
      throw new AppError(403, 'OWNERSHIP_VIOLATION', 'Cannot accept an offer on another customer’s request');
    }
    if (wantedCheck.status !== 'open') {
      throw new AppError(
        400,
        'REQUEST_ALREADY_CLOSED',
        `This request is already ${wantedCheck.status} and cannot accept further offers`
      );
    }

    const targetOffer = wantedCheck.offers.id(params.offerId);
    if (!targetOffer) {
      throw new AppError(404, 'OFFER_NOT_FOUND', 'Offer not found');
    }
    if (targetOffer.status !== 'pending') {
      throw new AppError(
        400,
        'OFFER_NOT_PENDING',
        `Offer cannot be accepted because its status is '${targetOffer.status}'`
      );
    }

    // 2. Concurrency-safe atomic update
    const updated = await WantedRequestModel.findOneAndUpdate(
      {
        _id: params.wantedRequestId,
        customerId: params.customerId,
        status: 'open',
        'offers._id': params.offerId,
        'offers.status': 'pending',
      },
      {
        $set: {
          status: 'fulfilled',
          acceptedOfferId: targetOffer._id,
          'offers.$[accepted].status': 'accepted',
          'offers.$[accepted].updatedAt': new Date(),
          'offers.$[others].status': 'rejected',
          'offers.$[others].updatedAt': new Date(),
        },
      },
      {
        arrayFilters: [
          { 'accepted._id': targetOffer._id },
          { 'others._id': { $ne: targetOffer._id }, 'others.status': 'pending' },
        ],
        new: true,
      }
    ).populate('customerId', 'fullName email')
     .populate('offers.sellerId', 'fullName email');

    if (!updated) {
      throw new AppError(
        409,
        'CONCURRENT_ACCEPTANCE_CONFLICT',
        'This offer or request has already been modified or accepted by a concurrent action'
      );
    }

    // Notify the accepted seller
    await NotificationModel.create({
      userId: targetOffer.sellerId,
      title: 'Your Wanted-Part Offer was Accepted!',
      message: `The buyer accepted your offer of ₹${(
        targetOffer.offeredPricePaise / 100
      ).toFixed(2)} for ${updated.componentType}.`,
      type: 'wanted_offer',
      metadata: {
        wantedRequestId: updated._id.toString(),
        offerId: targetOffer._id.toString(),
      },
    });

    return updated;
  }

  static async rejectWantedOffer(params: {
    customerId: string;
    wantedRequestId: string;
    offerId: string;
  }): Promise<IWantedRequestDocument> {
    const wanted = await WantedRequestModel.findById(params.wantedRequestId);
    if (!wanted) {
      throw new AppError(404, 'WANTED_REQUEST_NOT_FOUND', 'Wanted request not found');
    }
    if (wanted.customerId.toString() !== params.customerId) {
      throw new AppError(403, 'OWNERSHIP_VIOLATION', 'Cannot reject an offer on another customer’s request');
    }

    const offer = wanted.offers.id(params.offerId);
    if (!offer) {
      throw new AppError(404, 'OFFER_NOT_FOUND', 'Offer not found');
    }
    if (offer.status !== 'pending') {
      throw new AppError(400, 'OFFER_NOT_PENDING', `Offer is already ${offer.status}`);
    }

    offer.status = 'rejected';
    offer.updatedAt = new Date();
    await wanted.save();

    await NotificationModel.create({
      userId: offer.sellerId,
      title: 'Offer Declined on Wanted Part Request',
      message: `The buyer did not accept your offer on ${wanted.componentType}.`,
      type: 'wanted_offer',
      metadata: {
        wantedRequestId: wanted._id.toString(),
        offerId: offer._id.toString(),
      },
    });

    return wanted;
  }

  static async getWantedOffers(wantedRequestId: string): Promise<IWantedRequestDocument> {
    const wanted = await WantedRequestModel.findById(wantedRequestId)
      .populate('deviceId', 'modelName modelNumber')
      .populate('customerId', 'fullName email')
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

