import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AssetService } from '../services/assetService';
import { storageAdapter } from '../integrations/storage/storageAdapter';
import { AssetModel } from '../models/Asset';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';

export class AssetController {
  static async createUploadIntent(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      let tokenUserId: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const decoded = jwt.verify(authHeader.slice(7), env.SESSION_SECRET) as { id?: string };
          tokenUserId = decoded.id;
        } catch {
          // Ignore invalid optional token on public upload-intent
        }
      }
      const ownerUserId = req.user?.id || tokenUserId || req.body.ownerUserId || 'system';
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

  static async handleLocalUpload(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const key = req.query.key as string;
      const sig = req.query.sig as string;
      const exp = req.query.exp as string;

      if (!key || !sig || !exp) {
        throw new AppError(400, 'MISSING_UPLOAD_PARAMS', 'Upload key, signature, and expiration are required');
      }

      const expDate = new Date(exp);
      if (Number.isNaN(expDate.getTime()) || expDate.getTime() < Date.now()) {
        throw new AppError(400, 'EXPIRED_UPLOAD_TOKEN', 'Upload URL has expired');
      }

      const asset = await AssetModel.findOne({ storageKey: key });
      if (!asset) {
        throw new AppError(404, 'ASSET_NOT_FOUND', 'Asset record not found');
      }

      const isValidToken = storageAdapter.verifyUploadToken({
        storageKey: key,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
        expiresAt: exp,
        token: sig,
      });

      if (!isValidToken) {
        throw new AppError(403, 'INVALID_UPLOAD_TOKEN', 'Upload token signature is invalid');
      }

      const buffer = Buffer.isBuffer(req.body)
        ? req.body
        : typeof req.body === 'string'
        ? Buffer.from(req.body)
        : Buffer.alloc(0);

      if (buffer.length === 0) {
        throw new AppError(400, 'EMPTY_FILE', 'Uploaded file body cannot be empty');
      }

      await storageAdapter.saveLocalFile(key, buffer);

      res.status(200).json({
        success: true,
        message: 'File uploaded successfully to local storage',
        data: { storageKey: key, sizeBytes: buffer.length },
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async servePublicAsset(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const storageKey = req.params[0];
      if (!storageKey) {
        throw new AppError(400, 'INVALID_STORAGE_KEY', 'Storage key is required');
      }

      const asset = await AssetModel.findOne({ storageKey });
      if (!asset || !asset.isPublic) {
        throw new AppError(404, 'ASSET_NOT_FOUND', 'Public asset not found');
      }

      const { filePath, exists } = storageAdapter.getLocalFile(storageKey);
      if (!exists) {
        throw new AppError(404, 'FILE_NOT_FOUND', 'File not found on storage server');
      }

      res.setHeader('Content-Type', asset.mimeType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  }

  static async servePrivateAsset(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const storageKey = req.params[0];
      const sig = req.query.sig as string;
      const exp = req.query.exp as string;

      if (!storageKey || !sig || !exp) {
        throw new AppError(400, 'MISSING_ACCESS_PARAMS', 'Access signature and expiration are required');
      }

      const expDate = new Date(exp);
      if (Number.isNaN(expDate.getTime()) || expDate.getTime() < Date.now()) {
        throw new AppError(403, 'EXPIRED_ACCESS_TOKEN', 'Private access URL has expired');
      }

      const expectedSig = crypto
        .createHmac('sha256', env.SESSION_SECRET)
        .update(`access:${storageKey}:${exp}`)
        .digest('hex');

      if (expectedSig.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(sig))) {
        throw new AppError(403, 'INVALID_ACCESS_TOKEN', 'Access token signature is invalid');
      }

      const asset = await AssetModel.findOne({ storageKey });
      const { filePath, exists } = storageAdapter.getLocalFile(storageKey);
      if (!exists) {
        throw new AppError(404, 'FILE_NOT_FOUND', 'File not found on storage server');
      }

      res.setHeader('Content-Type', asset?.mimeType || 'application/octet-stream');
      res.setHeader('Cache-Control', 'private, no-store');
      res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  }

  static async deleteAsset(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await AssetService.deleteAsset(
        req.params.id,
        req.user?.id,
        req.user?.role
      );
      res.status(200).json({
        success: true,
        message: 'Asset and associated storage object deleted successfully',
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }
}
