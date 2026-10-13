import mongoose, { Schema, Document } from 'mongoose';

export interface IRefundDocument extends Document {
  returnId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  amountPaise: number;
  currency: 'INR';
  status: 'initiated' | 'processed' | 'failed';
  providerRefundId?: string;
  processedByUserId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RefundSchema = new Schema<IRefundDocument>(
  {
    returnId: { type: Schema.Types.ObjectId, ref: 'ReturnRequest', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amountPaise: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'amountPaise must be an integer',
      },
    },
    currency: { type: String, enum: ['INR'], default: 'INR' },
    status: {
      type: String,
      enum: ['initiated', 'processed', 'failed'],
      default: 'processed',
    },
    providerRefundId: { type: String, trim: true },
    processedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

RefundSchema.index({ returnId: 1 });
RefundSchema.index({ orderId: 1 });

export const RefundModel = mongoose.model<IRefundDocument>('Refund', RefundSchema);

