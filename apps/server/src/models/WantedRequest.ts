import mongoose, { Schema, Document } from 'mongoose';

export interface IWantedOfferSubdoc {
  _id: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  storeName?: string;
  listingId?: mongoose.Types.ObjectId;
  offeredPricePaise: number;
  availableQuantity: number;
  condition: 'new' | 'refurbished' | 'used';
  compatibilityEvidence?: string;
  warrantyDays: number;
  shippingCostPaise: number;
  estimatedDeliveryDays: number;
  notes?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  createdAt: Date;
  updatedAt: Date;
}

export interface IWantedRequestDocument extends Document {
  customerId: mongoose.Types.ObjectId;
  category: string;
  brand: string;
  deviceModel: string;
  partNumber?: string;
  componentType: string;
  description: string;
  quantity: number;
  requiredCondition: 'any' | 'new' | 'refurbished' | 'used';
  maxBudgetPaise: number;
  deliveryCity?: string;
  deliveryPostalCode?: string;
  preferredDeliveryDate?: Date;
  expiresAt: Date;
  photoAssetIds: string[];
  deviceId?: mongoose.Types.ObjectId;
  status: 'open' | 'fulfilled' | 'cancelled' | 'expired';
  acceptedOfferId?: mongoose.Types.ObjectId;
  offers: mongoose.Types.DocumentArray<IWantedOfferSubdoc>;
  createdAt: Date;
  updatedAt: Date;
}

const WantedOfferSchema = new Schema<IWantedOfferSubdoc>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    storeName: { type: String, trim: true, maxlength: 100 },
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: false },
    offeredPricePaise: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'offeredPricePaise must be an integer',
      },
    },
    availableQuantity: { type: Number, required: true, min: 1, default: 1 },
    condition: {
      type: String,
      enum: ['new', 'refurbished', 'used'],
      default: 'new',
    },
    compatibilityEvidence: { type: String, trim: true, maxlength: 1000 },
    warrantyDays: { type: Number, min: 0, default: 30 },
    shippingCostPaise: { type: Number, min: 0, default: 0 },
    estimatedDeliveryDays: { type: Number, min: 1, default: 3 },
    notes: { type: String, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'withdrawn', 'declined'],
      default: 'pending',
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const WantedRequestSchema = new Schema<IWantedRequestDocument>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    category: { type: String, trim: true, default: 'Smartphones', maxlength: 100 },
    brand: { type: String, trim: true, default: 'Generic', maxlength: 100 },
    deviceModel: { type: String, trim: true, default: 'Various', maxlength: 150 },
    partNumber: { type: String, trim: true, maxlength: 100 },
    componentType: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    quantity: { type: Number, required: true, min: 1, max: 100, default: 1 },
    requiredCondition: {
      type: String,
      enum: ['any', 'new', 'refurbished', 'used'],
      default: 'any',
    },
    maxBudgetPaise: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'maxBudgetPaise must be an integer',
      },
    },
    deliveryCity: { type: String, trim: true, maxlength: 100 },
    deliveryPostalCode: { type: String, trim: true, maxlength: 20 },
    preferredDeliveryDate: { type: Date },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    photoAssetIds: [{ type: String }],
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device', required: false },
    status: {
      type: String,
      enum: ['open', 'fulfilled', 'cancelled', 'expired'],
      default: 'open',
    },
    acceptedOfferId: { type: Schema.Types.ObjectId },
    offers: { type: [WantedOfferSchema], default: [] },
  },
  { timestamps: true }
);

WantedRequestSchema.index({ status: 1, createdAt: -1 });
WantedRequestSchema.index({ customerId: 1, createdAt: -1 });
WantedRequestSchema.index({ brand: 1, category: 1, status: 1 });

export const WantedRequestModel = mongoose.model<IWantedRequestDocument>(
  'WantedRequest',
  WantedRequestSchema
);
