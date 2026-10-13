import mongoose, { Schema, Document } from 'mongoose';

export interface IWantedOfferSubdoc {
  _id: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  offeredPricePaise: number;
  notes?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
}

export interface IWantedRequestDocument extends Document {
  customerId: mongoose.Types.ObjectId;
  deviceId: mongoose.Types.ObjectId;
  componentType: string;
  description: string;
  maxBudgetPaise: number;
  status: 'open' | 'fulfilled' | 'cancelled';
  offers: mongoose.Types.DocumentArray<IWantedOfferSubdoc>;
  createdAt: Date;
  updatedAt: Date;
}

const WantedOfferSchema = new Schema<IWantedOfferSubdoc>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    offeredPricePaise: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'offeredPricePaise must be an integer',
      },
    },
    notes: { type: String, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const WantedRequestSchema = new Schema<IWantedRequestDocument>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deviceId: { type: Schema.Types.ObjectId, ref: 'Device', required: true },
    componentType: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, required: true, trim: true, maxlength: 1000 },
    maxBudgetPaise: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'maxBudgetPaise must be an integer',
      },
    },
    status: {
      type: String,
      enum: ['open', 'fulfilled', 'cancelled'],
      default: 'open',
    },
    offers: { type: [WantedOfferSchema], default: [] },
  },
  { timestamps: true }
);

WantedRequestSchema.index({ status: 1, createdAt: -1 });
WantedRequestSchema.index({ customerId: 1, createdAt: -1 });

export const WantedRequestModel = mongoose.model<IWantedRequestDocument>(
  'WantedRequest',
  WantedRequestSchema
);

