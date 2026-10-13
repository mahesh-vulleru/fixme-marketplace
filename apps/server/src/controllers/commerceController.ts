import { Request, Response, NextFunction } from 'express';
import { CommerceService } from '../services/commerceService';

export class CommerceController {
  static async getCart(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cart = await CommerceService.getRecalculatedCart(req.user!.id);
      res.status(200).json({
        success: true,
        data: cart,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async addCartItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cart = await CommerceService.addOrUpdateCartItem(
        req.user!.id,
        req.body.listingId,
        req.body.quantity
      );
      res.status(200).json({
        success: true,
        data: cart,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateCartItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cart = await CommerceService.addOrUpdateCartItem(
        req.user!.id,
        req.params.listingId,
        req.body.quantity
      );
      res.status(200).json({
        success: true,
        data: cart,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async removeCartItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cart = await CommerceService.addOrUpdateCartItem(
        req.user!.id,
        req.params.listingId,
        0
      );
      res.status(200).json({
        success: true,
        data: cart,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async checkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CommerceService.checkout(
        req.user!.id,
        req.body.shippingAddress
      );
      res.status(201).json({
        success: true,
        data: result,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async handlePaymentWebhook(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const rawBody = JSON.stringify(req.body);
      const signature = req.headers['x-webhook-signature'] as string | undefined;
      const result = await CommerceService.handlePaymentWebhook({
        provider: req.params.provider,
        rawBody,
        signature,
        payload: req.body,
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

  static async listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orders = await CommerceService.listCustomerOrders(req.user!.id);
      res.status(200).json({
        success: true,
        data: orders,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await CommerceService.getOrderByIdForUser(
        req.params.id,
        req.user!.id,
        req.user!.role
      );
      res.status(200).json({
        success: true,
        data: order,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async cancelOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const order = await CommerceService.cancelOrder({
        customerId: req.user!.id,
        orderId: req.params.id,
        reason: req.body.reason,
      });
      res.status(200).json({
        success: true,
        data: order,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async requestReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ret = await CommerceService.requestReturn({
        customerId: req.user!.id,
        orderId: req.params.id,
        subOrderId: req.body.subOrderId,
        reason: req.body.reason,
        evidenceAssetIds: req.body.evidenceAssetIds,
      });
      res.status(201).json({
        success: true,
        data: ret,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async processReturn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await CommerceService.processReturnRefund({
        actorUserId: req.user!.id,
        returnId: req.params.id,
        approve: Boolean(req.body.approve),
        resolutionNotes: req.body.resolutionNotes,
        simulateGatewayFailure: Boolean(req.body.simulateGatewayFailure),
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
}
