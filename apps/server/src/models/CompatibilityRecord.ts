import mongoose, { Schema, Document } from 'mongoose';
import { COMPATIBILITY_STATUSES, CompatibilityStatus } from '@fixme/shared-types';

export interface ICompatibilityRecordDocument extends Document {
  deviceId: mongoose.Types.ObjectId;
  partId: mongoose.Types.ObjectId;
  verificationStatus: CompatibilityStatus;
  evidenceNotes: string;
  sourceType: 'manufacturer_datasheet' | 'teardown_verified' | 'seller_submitted' | 'admin_verified';
  verifiedByUserId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CompatibilityRecordSchema = new Schema<ICompatibilityRecordDocument>(
  {
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device', required: true },
    partId: { type: Schema.Types.ObjectId, ref: 'Part', required: true },
    verificationStatus: {
      type: String,
      enum: COMPATIBILITY_STATUSES,
      default: 'verified',
    },
    evidenceNotes: { type: String, required: true, trim: true, maxlength: 1000 },
    sourceType: {
      type: String,
      enum: ['manufacturer_datasheet', 'teardown_verified', 'seller_submitted', 'admin_verified'],
      required: true,
    },
    verifiedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

CompatibilityRecordSchema.index({ deviceId: 1, partId: 1 }, { unique: true });
CompatibilityRecordSchema.index({ partId: 1, verificationStatus: 1 });
CompatibilityRecordSchema.index({ deviceId: 1, verificationStatus: 1 });

export const CompatibilityRecordModel = mongoose.model<ICompatibilityRecordDocument>(
  'CompatibilityRecord',
  CompatibilityRecordSchema
);

