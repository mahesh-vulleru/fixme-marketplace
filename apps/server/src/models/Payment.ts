import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentDocument extends Document {
  orderId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  provider: string;
  providerOrderId: string;
  providerPaymentId?: string;
  amountPaise: number;
  currency: 'INR';
  status: 'pending' | 'captured' | 'failed' | 'refunded';
  processedEventIds: string[];
  rawWebhookPayload?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPaymentDocument>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, required: true, trim: true },
    providerOrderId: { type: String, required: true, unique: true, trim: true },
    providerPaymentId: { type: String, trim: true },
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
      enum: ['pending', 'captured', 'failed', 'refunded'],
      default: 'pending',
    },
    processedEventIds: { type: [String], default: [] },
    rawWebhookPayload: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ processedEventIds: 1 });

export const PaymentModel = mongoose.model<IPaymentDocument>('Payment', PaymentSchema);

