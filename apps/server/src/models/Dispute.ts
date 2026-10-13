import mongoose, { Schema, Document } from 'mongoose';
import { DISPUTE_STATUSES, DisputeStatus } from '@fixme/shared-types';

export interface IDisputeDocument extends Document {
  orderId: mongoose.Types.ObjectId;
  subOrderId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  reason: string;
  evidenceAssetIds: mongoose.Types.ObjectId[];
  status: DisputeStatus;
  resolutionNotes?: string;
  resolvedByUserId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DisputeSchema = new Schema<IDisputeDocument>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    subOrderId: { type: Schema.Types.ObjectId, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, trim: true, maxlength: 1500 },
    evidenceAssetIds: [{ type: Schema.Types.ObjectId, ref: 'Asset' }],
    status: {
      type: String,
      enum: DISPUTE_STATUSES,
      default: 'open',
    },
    resolutionNotes: { type: String, trim: true, maxlength: 1500 },
    resolvedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

DisputeSchema.index({ orderId: 1, subOrderId: 1 });
DisputeSchema.index({ status: 1, createdAt: -1 });

export const DisputeModel = mongoose.model<IDisputeDocument>('Dispute', DisputeSchema);

