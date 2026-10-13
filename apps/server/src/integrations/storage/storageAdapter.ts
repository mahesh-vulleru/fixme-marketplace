import crypto from 'crypto';
import { env } from '../../config/env';

export interface SignedUploadIntent {
  storageKey: string;
  uploadUrl: string;
  uploadToken: string;
  deliveryUrl: string;
  expiresAt: string;
}

export interface IStorageAdapter {
  createUploadIntent(params: {
    ownerUserId: string;
    assetType: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<SignedUploadIntent>;
  deleteObject(storageKey: string): Promise<void>;
}

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export class StorageAdapter implements IStorageAdapter {
  async createUploadIntent(params: {
    ownerUserId: string;
    assetType: string;
    mimeType: string;
    sizeBytes: number;
  }): Promise<SignedUploadIntent> {
    const ext = MIME_TO_EXT[params.mimeType] || 'bin';
    const randomId = crypto.randomUUID();
    const safeAssetType = params.assetType.replace(/[^a-z0-9_-]/gi, '');
    const safeOwnerId = params.ownerUserId.replace(/[^a-z0-9_-]/gi, '');
    const storageKey = `${safeAssetType}/${safeOwnerId}/${randomId}.${ext}`;

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const uploadToken = crypto
      .createHmac('sha256', env.SESSION_SECRET)
      .update(`${storageKey}:${params.mimeType}:${params.sizeBytes}:${expiresAt}`)
      .digest('hex');

    if (env.STORAGE_PROVIDER === 'cloudinary' && env.CLOUDINARY_CLOUD_NAME) {
      return {
        storageKey,
        uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
        uploadToken,
        deliveryUrl: `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/image/upload/${storageKey}`,
        expiresAt,
      };
    }

    const baseApiUrl = `http://localhost:${env.PORT}/api/v1`;
    return {
      storageKey,
      uploadUrl: `${baseApiUrl}/assets/upload-put?key=${encodeURIComponent(storageKey)}&sig=${uploadToken}&exp=${encodeURIComponent(expiresAt)}`,
      uploadToken,
      deliveryUrl: `${baseApiUrl}/assets/public/${storageKey}`,
      expiresAt,
    };
  }

  async deleteObject(_storageKey: string): Promise<void> {
    return Promise.resolve();
  }
}

export const storageAdapter = new StorageAdapter();

