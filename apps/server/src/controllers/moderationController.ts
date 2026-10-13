import { Request, Response, NextFunction } from 'express';
import { ModerationService } from '../services/moderationService';

export class ModerationController {
  static async getDashboardMetrics(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const metrics = await ModerationService.getAdminDashboardMetrics();
      res.status(200).json({
        success: true,
        data: metrics,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static getPolicies(req: Request, res: Response): void {
    const policies = ModerationService.getMarketplacePolicies();
    res.status(200).json({
      success: true,
      data: policies,
      requestId: req.requestId,
    });
  }

  static async listSellerApplications(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const sellers = await ModerationService.listSellerApplications(
        req.query.status as string | undefined
      );
      res.status(200).json({
        success: true,
        data: sellers,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async reviewSellerApplication(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await ModerationService.reviewSellerApplication({
        adminId: req.user!.id,
        adminRole: req.user!.role,
        sellerProfileId: req.params.id,
        status: req.body.status,
        reviewNotes: req.body.reviewNotes,
        requestId: req.requestId,
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

  static async reviewListing(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const listing = await ModerationService.reviewListing({
        adminId: req.user!.id,
        adminRole: req.user!.role,
        listingId: req.params.id,
        status: req.body.status,
        moderationNotes: req.body.moderationNotes,
        requestId: req.requestId,
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

  static async listAuditLogs(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const logs = await ModerationService.listAuditLogs(
        req.query.limit ? Number(req.query.limit) : 50
      );
      res.status(200).json({
        success: true,
        data: logs,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listUsers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const users = await ModerationService.listUsers(
        req.query.role as string | undefined,
        (req.query.q || req.query.search) as string | undefined
      );
      res.status(200).json({
        success: true,
        data: users,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateUserRole(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await ModerationService.updateUserRole({
        userId: req.params.id,
        role: req.body.role,
        adminId: req.user!.id,
        requestId: req.requestId,
      });
      res.status(200).json({
        success: true,
        data: user,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateUserStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await ModerationService.updateUserStatus({
        userId: req.params.id,
        isActive: req.body.isActive,
        adminId: req.user!.id,
        requestId: req.requestId,
      });
      res.status(200).json({
        success: true,
        data: user,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listAdminOrders(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const orders = await ModerationService.listAdminOrders();
      res.status(200).json({
        success: true,
        data: orders,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listAdminDisputes(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const disputes = await ModerationService.listAdminDisputes();
      res.status(200).json({
        success: true,
        data: disputes,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getFinanceReport(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const report = await ModerationService.getFinanceReport();
      res.status(200).json({
        success: true,
        data: report,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }
}
