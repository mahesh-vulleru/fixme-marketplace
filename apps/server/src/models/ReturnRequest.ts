import mongoose, { Schema, Document } from 'mongoose';
import { RETURN_STATUSES, ReturnStatus } from '@fixme/shared-types';

export interface IReturnRequestDocument extends Document {
  orderId: mongoose.Types.ObjectId;
  subOrderId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  reason: string;
  evidenceAssetIds: mongoose.Types.ObjectId[];
  status: ReturnStatus;
  refundAmountPaise: number;
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReturnRequestSchema = new Schema<IReturnRequestDocument>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    subOrderId: { type: Schema.Types.ObjectId, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, trim: true, maxlength: 1000 },
    evidenceAssetIds: [{ type: Schema.Types.ObjectId, ref: 'Asset' }],
    status: {
      type: String,
      enum: RETURN_STATUSES,
      default: 'requested',
    },
    refundAmountPaise: { type: Number, required: true, min: 0 },
    resolutionNotes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

ReturnRequestSchema.index({ orderId: 1, subOrderId: 1 });
ReturnRequestSchema.index({ customerId: 1, createdAt: -1 });
ReturnRequestSchema.index({ sellerId: 1, status: 1 });

export const ReturnRequestModel = mongoose.model<IReturnRequestDocument>(
  'ReturnRequest',
  ReturnRequestSchema
);

