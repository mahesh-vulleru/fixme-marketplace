import mongoose, { Schema, Document } from 'mongoose';
import { SELLER_STATUSES, SellerStatus } from '@fixme/shared-types';

export interface ISellerProfileDocument extends Document {
  userId: mongoose.Types.ObjectId;
  storeName: string;
  storeSlug: string;
  gstin?: string;
  panNumber?: string;
  businessAddress: string;
  verificationDocumentAssetIds: mongoose.Types.ObjectId[];
  status: SellerStatus;
  ratingAverage: number;
  ratingCount: number;
  reviewedByAdminId?: mongoose.Types.ObjectId;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SellerProfileSchema = new Schema<ISellerProfileDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    storeName: { type: String, required: true, trim: true, maxlength: 80 },
    storeSlug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    gstin: { type: String, trim: true, maxlength: 20 },
    panNumber: { type: String, trim: true, maxlength: 10 },
    businessAddress: { type: String, required: true, trim: true, maxlength: 300 },
    verificationDocumentAssetIds: [{ type: Schema.Types.ObjectId, ref: 'Asset' }],
    status: {
      type: String,
      enum: SELLER_STATUSES,
      default: 'pending',
    },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    reviewedByAdminId: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewNotes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

SellerProfileSchema.index({ status: 1, createdAt: -1 });

export const SellerProfileModel = mongoose.model<ISellerProfileDocument>(
  'SellerProfile',
  SellerProfileSchema
);

