import { Request, Response, NextFunction } from 'express';
import { AssetService } from '../services/assetService';

export class AssetController {
  static async createUploadIntent(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const ownerUserId = req.user?.id || req.body.ownerUserId || 'system';
      const result = await AssetService.createUploadIntent({
        ...req.body,
        ownerUserId,
      });
      res.status(201).json({
        success: true,
        data: {
          asset: result.asset,
          uploadUrl: result.uploadUrl,
          uploadToken: result.uploadToken,
          expiresAt: result.expiresAt,
        },
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async completeUpload(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const asset = await AssetService.completeUpload(req.params.id);
      res.status(200).json({
        success: true,
        data: asset,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAssetAccess(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await AssetService.getAuthorizedAssetAccess({
        assetId: req.params.id,
        requesterUserId: req.user?.id,
        requesterRole: req.user?.role,
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
