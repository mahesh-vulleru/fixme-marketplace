import mongoose, { Schema, Document } from 'mongoose';

export interface IReviewDocument extends Document {
  orderId: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  partId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  isVerifiedPurchase: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReviewDocument>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    partId: { type: Schema.Types.ObjectId, ref: 'Part', required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 1000 },
    isVerifiedPurchase: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ReviewSchema.index({ orderId: 1, listingId: 1, customerId: 1 }, { unique: true });
ReviewSchema.index({ listingId: 1, createdAt: -1 });
ReviewSchema.index({ sellerId: 1, rating: -1 });

export const ReviewModel = mongoose.model<IReviewDocument>('Review', ReviewSchema);

