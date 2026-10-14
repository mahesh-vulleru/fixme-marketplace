import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';

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
  saveLocalFile(storageKey: string, buffer: Buffer): Promise<void>;
  getLocalFile(storageKey: string): { filePath: string; exists: boolean };
  verifyUploadToken(params: {
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
    expiresAt: string;
    token: string;
  }): boolean;
}

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export class StorageAdapter implements IStorageAdapter {
  getUploadsDir(): string {
    const dir = process.env.UPLOADS_DIR || path.resolve(process.cwd(), 'uploads');
    return dir;
  }

  resolveSafePath(storageKey: string): string {
    const baseDir = this.getUploadsDir();
    if (!storageKey || storageKey.includes('..') || storageKey.includes('\0') || storageKey.includes('\\')) {
      throw new AppError(400, 'INVALID_STORAGE_KEY', 'Invalid storage key: path traversal prohibited');
    }
    const resolved = path.resolve(baseDir, storageKey);
    if (!resolved.startsWith(baseDir)) {
      throw new AppError(400, 'INVALID_STORAGE_KEY', 'Invalid storage key: path traversal prohibited');
    }
    return resolved;
  }

  async saveLocalFile(storageKey: string, buffer: Buffer): Promise<void> {
    const targetPath = this.resolveSafePath(storageKey);
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.promises.writeFile(targetPath, buffer);
  }

  getLocalFile(storageKey: string): { filePath: string; exists: boolean } {
    const targetPath = this.resolveSafePath(storageKey);
    const exists = fs.existsSync(targetPath);
    return { filePath: targetPath, exists };
  }

  async deleteObject(storageKey: string): Promise<void> {
    try {
      const targetPath = this.resolveSafePath(storageKey);
      if (fs.existsSync(targetPath)) {
        await fs.promises.unlink(targetPath);
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
    }
  }

  verifyUploadToken(params: {
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
    expiresAt: string;
    token: string;
  }): boolean {
    if (!params.token) return false;
    const expected = crypto
      .createHmac('sha256', env.SESSION_SECRET)
      .update(`${params.storageKey}:${params.mimeType}:${params.sizeBytes}:${params.expiresAt}`)
      .digest('hex');
    if (expected.length !== params.token.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(params.token));
  }

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

    const provider = process.env.STORAGE_PROVIDER || env.STORAGE_PROVIDER;
    if (provider === 'cloudinary' && env.CLOUDINARY_CLOUD_NAME) {
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
}

export const storageAdapter = new StorageAdapter();

