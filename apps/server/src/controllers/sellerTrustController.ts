import { Request, Response, NextFunction } from 'express';
import { SellerTrustService } from '../services/sellerTrustService';

export class SellerTrustController {
  static async listMyListings(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const items = await SellerTrustService.listMyListings(req.user!.id);
      res.status(200).json({
        success: true,
        data: items,
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
        description: req.body.description,
        condition: req.body.condition,
        pricePaise: req.body.pricePaise,
        stockAvailable: req.body.stockAvailable ?? req.body.stockOnHand ?? 0,
        warrantyDays: req.body.warrantyDays,
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

  static async adjustInventory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await SellerTrustService.adjustSellerInventory({
        sellerId: req.user!.id,
        listingId: req.params.listingId,
        stockAvailable: req.body.stockAvailable,
        reason: req.body.reason,
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

