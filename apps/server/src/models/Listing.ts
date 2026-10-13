import mongoose, { Schema, Document } from 'mongoose';
import {
  PART_CONDITIONS,
  PartCondition,
  LISTING_STATUSES,
  ListingStatus,
} from '@fixme/shared-types';

export interface IListingDocument extends Document {
  partId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  sellerSku?: string;
  title: string;
  description?: string;
  condition: PartCondition;
  pricePaise: number;
  currency: 'INR';
  stockAvailable: number;
  stockReserved: number;
  lowStockThreshold: number;
  assetIds: mongoose.Types.ObjectId[];
  warrantyDays: number;
  shippingFeePaise: number;
  dispatchLeadTimeDays: number;
  shippingOriginPostalCode?: string;
  status: ListingStatus;
  rejectionReason?: string;
  moderationNotes?: string;
  specifications?: Map<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const ListingSchema = new Schema<IListingDocument>(
  {
    partId: { type: Schema.Types.ObjectId, ref: 'Part', required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sellerSku: { type: String, trim: true, maxlength: 64 },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 2000 },
    condition: {
      type: String,
      enum: PART_CONDITIONS,
      required: true,
    },
    pricePaise: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'pricePaise must be an integer value in paise (never floating-point)',
      },
    },
    currency: { type: String, enum: ['INR'], default: 'INR' },
    stockAvailable: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'stockAvailable must be an integer',
      },
    },
    stockReserved: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'stockReserved must be an integer',
      },
    },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    assetIds: [{ type: Schema.Types.ObjectId, ref: 'Asset' }],
    warrantyDays: { type: Number, default: 30, min: 0, max: 1095 },
    shippingFeePaise: { type: Number, default: 0, min: 0 },
    dispatchLeadTimeDays: { type: Number, default: 2, min: 1, max: 30 },
    shippingOriginPostalCode: { type: String, trim: true, maxlength: 20 },
    status: {
      type: String,
      enum: LISTING_STATUSES,
      default: 'pending_review',
    },
    rejectionReason: { type: String, trim: true, maxlength: 1000 },
    moderationNotes: { type: String, trim: true, maxlength: 1000 },
    specifications: { type: Map, of: String, default: {} },
  },
  { timestamps: true }
);

// Indexes
ListingSchema.index({ partId: 1, status: 1, pricePaise: 1 });
ListingSchema.index({ sellerId: 1, status: 1 });
ListingSchema.index({ status: 1, createdAt: -1 });
ListingSchema.index(
  { sellerId: 1, sellerSku: 1 },
  { unique: true, partialFilterExpression: { sellerSku: { $type: 'string' } } }
);

export const ListingModel = mongoose.model<IListingDocument>('Listing', ListingSchema);
