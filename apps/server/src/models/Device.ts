import mongoose, { Schema, Document } from 'mongoose';

export interface IDeviceDocument extends Document {
  brandId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  modelName: string;
  modelNumber: string;
  variant?: string;
  region: string;
  releaseYear?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema = new Schema<IDeviceDocument>(
  {
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    modelName: { type: String, required: true, trim: true, maxlength: 120 },
    modelNumber: { type: String, required: true, trim: true, maxlength: 80 },
    variant: { type: String, trim: true, maxlength: 80 },
    region: { type: String, trim: true, maxlength: 40, default: 'IN' },
    releaseYear: { type: Number, min: 2000, max: 2035 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DeviceSchema.index({ brandId: 1, modelNumber: 1 }, { unique: true });
DeviceSchema.index({ categoryId: 1, brandId: 1 });
DeviceSchema.index({ modelName: 'text', modelNumber: 'text' });

export const DeviceModel = mongoose.model<IDeviceDocument>('Device', DeviceSchema);

