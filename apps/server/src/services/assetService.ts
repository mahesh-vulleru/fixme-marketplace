import crypto from 'crypto';
import { AssetType, UserRole } from '@fixme/shared-types';
import { AssetModel, IAssetDocument } from '../models/Asset';
import { storageAdapter } from '../integrations/storage/storageAdapter';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export class AssetService {
  static async createUploadIntent(input: {
    ownerUserId?: string;
    assetType: AssetType;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
    sizeBytes: number;
  }): Promise<{
    asset: IAssetDocument;
    uploadUrl: string;
    uploadToken: string;
    expiresAt: string;
  }> {
    if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
      throw new AppError(
        400,
        'UNSUPPORTED_ASSET_TYPE',
        `Unsupported MIME type: ${input.mimeType}. Allowed: jpeg, png, webp`
      );
    }

    if (input.sizeBytes <= 0 || input.sizeBytes > MAX_SIZE_BYTES) {
      throw new AppError(
        400,
        'ASSET_SIZE_EXCEEDED',
        `File size must be between 1 byte and ${MAX_SIZE_BYTES} bytes`
      );
    }

    const ownerUserId = input.ownerUserId || 'anonymous';
    const isPublic =
      input.assetType === 'product_photo' || input.assetType === 'avatar';

    const intent = await storageAdapter.createUploadIntent({
      ownerUserId,
      assetType: input.assetType,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    });

    const asset = await AssetModel.create({
      ownerUserId,
      assetType: input.assetType,
      storageKey: intent.storageKey,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      isPublic,
      status: 'pending',
      // Never expose private seller documents or dispute/return evidence through public URLs
      deliveryUrl: isPublic ? intent.deliveryUrl : undefined,
    });

    return {
      asset,
      uploadUrl: intent.uploadUrl,
      uploadToken: intent.uploadToken,
      expiresAt: intent.expiresAt,
    };
  }

  static async completeUpload(assetId: string): Promise<IAssetDocument> {
    const asset = await AssetModel.findById(assetId);
    if (!asset) {
      throw new AppError(404, 'ASSET_NOT_FOUND', 'Asset record not found');
    }

    if (asset.status === 'rejected') {
      throw new AppError(400, 'INVALID_ASSET_STATE', 'Cannot complete a rejected asset');
    }

    asset.status = 'ready';
    await asset.save();

    return asset;
  }

  /**
   * Enforces strict access control on private assets (seller_document, return_photo, dispute_evidence).
   * Only the asset owner, support_staff, administrator, or super_administrator can obtain a signed private access URL.
   */
  static async getAuthorizedAssetAccess(params: {
    assetId: string;
    requesterUserId?: string;
    requesterRole?: UserRole;
  }): Promise<{
    asset: IAssetDocument;
    signedAccessUrl: string;
    expiresAt: string;
  }> {
    const asset = await AssetModel.findById(params.assetId);
    if (!asset || asset.status === 'rejected') {
      throw new AppError(404, 'ASSET_NOT_FOUND', 'Asset not found');
    }

    if (!asset.isPublic) {
      if (!params.requesterUserId) {
        throw new AppError(
          401,
          'AUTHENTICATION_REQUIRED',
          'Authentication is required to access private verification or evidence files'
        );
      }

      const isAuthorizedStaff =
        params.requesterRole === 'support_staff' ||
        params.requesterRole === 'administrator' ||
        params.requesterRole === 'super_administrator';
      const isOwner = asset.ownerUserId === params.requesterUserId;

      if (!isAuthorizedStaff && !isOwner) {
        throw new AppError(
          403,
          'PRIVATE_ASSET_FORBIDDEN',
          'You do not have permission to access this private document or evidence file'
        );
      }
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const sig = crypto
      .createHmac('sha256', env.SESSION_SECRET)
      .update(`access:${asset.storageKey}:${expiresAt}`)
      .digest('hex');

    const signedAccessUrl = asset.isPublic
      ? asset.deliveryUrl || `http://localhost:${env.PORT}/api/v1/assets/public/${asset.storageKey}`
      : `http://localhost:${env.PORT}/api/v1/assets/private/${asset.storageKey}?sig=${sig}&exp=${encodeURIComponent(expiresAt)}`;

    return {
      asset,
      signedAccessUrl,
      expiresAt,
    };
  }
}
