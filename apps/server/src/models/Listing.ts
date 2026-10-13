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
  title: string;
  description?: string;
  condition: PartCondition;
  pricePaise: number;
  currency: 'INR';
  stockAvailable: number;
  stockReserved: number;
  assetIds: mongoose.Types.ObjectId[];
  warrantyDays: number;
  status: ListingStatus;
  moderationNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ListingSchema = new Schema<IListingDocument>(
  {
    partId: { type: Schema.Types.ObjectId, ref: 'Part', required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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
    assetIds: [{ type: Schema.Types.ObjectId, ref: 'Asset' }],
    warrantyDays: { type: Number, default: 30, min: 0, max: 1095 },
    status: {
      type: String,
      enum: LISTING_STATUSES,
      default: 'pending_review',
    },
    moderationNotes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

ListingSchema.index({ partId: 1, status: 1, pricePaise: 1 });
ListingSchema.index({ sellerId: 1, status: 1 });
ListingSchema.index({ status: 1, createdAt: -1 });

export const ListingModel = mongoose.model<IListingDocument>('Listing', ListingSchema);

