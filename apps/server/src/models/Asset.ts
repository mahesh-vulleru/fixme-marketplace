import mongoose, { Schema, Document } from 'mongoose';
import {
  ASSET_TYPES,
  AssetType,
  ASSET_STATUSES,
  AssetStatus,
} from '@fixme/shared-types';

export interface IAssetDocument extends Document {
  ownerUserId: string;
  assetType: AssetType;
  storageKey: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
  isPublic: boolean;
  status: AssetStatus;
  deliveryUrl?: string;
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssetSchema = new Schema<IAssetDocument>(
  {
    ownerUserId: { type: String, required: true, trim: true },
    assetType: {
      type: String,
      enum: ASSET_TYPES,
      required: true,
    },
    storageKey: { type: String, required: true, unique: true, trim: true },
    mimeType: {
      type: String,
      enum: ['image/jpeg', 'image/png', 'image/webp'],
      required: true,
    },
    sizeBytes: { type: Number, required: true, min: 1, max: 10 * 1024 * 1024 },
    isPublic: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ASSET_STATUSES,
      default: 'pending',
    },
    deliveryUrl: { type: String, trim: true },
    thumbnailUrl: { type: String, trim: true },
  },
  { timestamps: true }
);

AssetSchema.index({ ownerUserId: 1, status: 1 });

export const AssetModel = mongoose.model<IAssetDocument>('Asset', AssetSchema);

