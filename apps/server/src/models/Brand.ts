import mongoose, { Schema, Document } from 'mongoose';

export interface IBrandDocument extends Document {
  name: string;
  slug: string;
  logoAssetId?: mongoose.Types.ObjectId;
  website?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BrandSchema = new Schema<IBrandDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    logoAssetId: { type: Schema.Types.ObjectId, ref: 'Asset' },
    website: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

BrandSchema.index({ isActive: 1, name: 1 });

export const BrandModel = mongoose.model<IBrandDocument>('Brand', BrandSchema);

