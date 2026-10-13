import { Request, Response, NextFunction } from 'express';
import { SellerTrustService } from '../services/sellerTrustService';

export class SellerTrustController {
  static async listMyListings(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const filters = {
        status: req.query.status as string,
        condition: req.query.condition as string,
        lowStock: req.query.lowStock === 'true',
        outOfStock: req.query.outOfStock === 'true',
        q: req.query.q as string,
        sort: req.query.sort as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      };
      const result = await SellerTrustService.listMyListings(req.user!.id, filters);
      const data = req.query.paginated === 'true' ? result : result.listings;
      res.status(200).json({
        success: true,
        data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getSellerListing(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const listing = await SellerTrustService.getSellerListingById(
        req.user!.id,
        req.params.listingId
      );
      res.status(200).json({
        success: true,
        data: listing,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createSellerListing(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const listing = await SellerTrustService.createSellerListing({
        sellerId: req.user!.id,
        sellerRole: req.user!.role,
        partId: req.body.partId,
        title: req.body.title || req.body.sku || 'Verified Spare Part Listing',
        sellerSku: req.body.sellerSku,
        description: req.body.description,
        condition: req.body.condition,
        pricePaise: req.body.pricePaise,
        stockAvailable: req.body.stockAvailable ?? req.body.initialStock ?? req.body.stockOnHand ?? 0,
        warrantyDays: req.body.warrantyDays,
        lowStockThreshold: req.body.lowStockThreshold,
        shippingFeePaise: req.body.shippingFeePaise,
        dispatchLeadTimeDays: req.body.dispatchLeadTimeDays,
        shippingOriginPostalCode: req.body.shippingOriginPostalCode,
        assetIds: req.body.assetIds,
        status: req.body.status,
      });
      res.status(201).json({
        success: true,
        data: listing,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateSellerListing(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const listing = await SellerTrustService.updateSellerListing({
        sellerId: req.user!.id,
        listingId: req.params.listingId,
        update: req.body,
      });
      res.status(200).json({
        success: true,
        data: listing,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateListingStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const listing = await SellerTrustService.updateListingStatus({
        sellerId: req.user!.id,
        listingId: req.params.listingId,
        status: req.body.status,
      });
      res.status(200).json({
        success: true,
        data: listing,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async adjustInventory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await SellerTrustService.adjustSellerInventory({
        sellerId: req.user!.id,
        listingId: req.params.listingId,
        movementType: req.body.movementType,
        quantityDelta: req.body.quantityDelta,
        stockAvailable: req.body.stockAvailable ?? req.body.newStockAvailable,
        reason: req.body.reason,
        reference: req.body.reference,
        notes: req.body.internalNote || req.body.notes,
      });
      res.status(200).json({
        success: true,
        data: result,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getInventorySummary(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const summary = await SellerTrustService.getSellerInventorySummary(req.user!.id);
      res.status(200).json({
        success: true,
        data: summary,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listStockMovements(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const movements = await SellerTrustService.listStockMovements({
        sellerId: req.user!.id,
        listingId: req.params.listingId || (req.query.listingId as string),
        movementType: req.query.movementType as string,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });
      res.status(200).json({
        success: true,
        data: movements,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async searchCanonicalParts(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await SellerTrustService.searchCanonicalParts({
        q: req.query.q as string,
        categoryId: req.query.categoryId as string,
        brandId: req.query.brandId as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      });
      res.status(200).json({
        success: true,
        data: result.parts,
        pagination: {
          page: result.page,
          total: result.total,
          totalPages: result.totalPages,
        },
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listSellerOrders(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const orders = await SellerTrustService.listSellerOrders(req.user!.id);
      res.status(200).json({
        success: true,
        data: orders,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async markShipped(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await SellerTrustService.markSubOrderShipped({
        sellerId: req.user!.id,
        orderId: req.params.id,
        subOrderId: req.body.subOrderId,
        carrier: req.body.carrier,
        trackingNumber: req.body.trackingNumber,
      });
      res.status(200).json({
        success: true,
        data: result,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getOrderShipments(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const shipments = await SellerTrustService.getOrderShipments(
        req.params.id,
        req.user!.id,
        req.user!.role
      );
      res.status(200).json({
        success: true,
        data: shipments,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getSellerPayouts(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const summary = await SellerTrustService.getSellerPayoutSummary(req.user!.id);
      res.status(200).json({
        success: true,
        data: summary,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createReview(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const review = await SellerTrustService.createVerifiedReview({
        customerId: req.user!.id,
        orderId: req.body.orderId,
        listingId: req.body.listingId,
        rating: req.body.rating,
        comment: req.body.comment,
      });
      res.status(201).json({
        success: true,
        data: review,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listListingReviews(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const reviews = await SellerTrustService.listReviewsForListing(req.params.id);
      res.status(200).json({
        success: true,
        data: reviews,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createWantedRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const wanted = await SellerTrustService.createWantedRequest({
        customerId: req.user!.id,
        ...req.body,
      });
      res.status(201).json({
        success: true,
        data: wanted,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listWantedRequests(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const myFilter = req.query.my === 'true' && req.user ? req.user.id : undefined;
      const wanted = await SellerTrustService.listWantedRequests({
        customerId: myFilter,
        status: req.query.status as string,
        brand: req.query.brand as string,
        category: req.query.category as string,
        q: req.query.q as string,
      });
      res.status(200).json({
        success: true,
        data: wanted,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getWantedRequestById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const wanted = await SellerTrustService.getWantedRequestById(req.params.id);
      res.status(200).json({
        success: true,
        data: wanted,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateWantedRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const wanted = await SellerTrustService.updateWantedRequest({
        customerId: req.user!.id,
        requestId: req.params.id,
        update: req.body,
      });
      res.status(200).json({
        success: true,
        data: wanted,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async cancelWantedRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const wanted = await SellerTrustService.cancelWantedRequest({
        customerId: req.user!.id,
        requestId: req.params.id,
        userRole: req.user?.role,
      });
      res.status(200).json({
        success: true,
        data: wanted,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createWantedOffer(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const wanted = await SellerTrustService.createWantedOffer({
        sellerId: req.user!.id,
        wantedRequestId: req.params.id,
        ...req.body,
      });
      res.status(201).json({
        success: true,
        data: wanted,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateWantedOffer(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const wanted = await SellerTrustService.updateWantedOffer({
        sellerId: req.user!.id,
        wantedRequestId: req.params.id,
        offerId: req.params.offerId,
        update: req.body,
      });
      res.status(200).json({
        success: true,
        data: wanted,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async withdrawWantedOffer(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const wanted = await SellerTrustService.withdrawWantedOffer({
        sellerId: req.user!.id,
        wantedRequestId: req.params.id,
        offerId: req.params.offerId,
      });
      res.status(200).json({
        success: true,
        data: wanted,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async acceptWantedOffer(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const wanted = await SellerTrustService.acceptWantedOffer({
        customerId: req.user!.id,
        wantedRequestId: req.params.id,
        offerId: req.params.offerId,
      });
      res.status(200).json({
        success: true,
        data: wanted,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async rejectWantedOffer(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const wanted = await SellerTrustService.rejectWantedOffer({
        customerId: req.user!.id,
        wantedRequestId: req.params.id,
        offerId: req.params.offerId,
      });
      res.status(200).json({
        success: true,
        data: wanted,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getWantedOffers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const wanted = await SellerTrustService.getWantedOffers(req.params.id);
      res.status(200).json({
        success: true,
        data: wanted,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createDispute(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dispute = await SellerTrustService.createDispute({
        customerId: req.user!.id,
        ...req.body,
      });
      res.status(201).json({
        success: true,
        data: dispute,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async resolveDispute(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dispute = await SellerTrustService.resolveDispute({
        actorUserId: req.user!.id,
        actorRole: req.user!.role,
        disputeId: req.params.id,
        status: req.body.status,
        resolutionNotes: req.body.resolutionNotes,
        requestId: req.requestId,
      });
      res.status(200).json({
        success: true,
        data: dispute,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listNotifications(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const notifications = await SellerTrustService.listUserNotifications(req.user!.id);
      res.status(200).json({
        success: true,
        data: notifications,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }
}

