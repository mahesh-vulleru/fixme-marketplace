import mongoose, { Schema, Document } from 'mongoose';
import {
  ORDER_STATUSES,
  OrderStatus,
  PART_CONDITIONS,
  PartCondition,
} from '@fixme/shared-types';

export interface IOrderLineItem {
  listingId: mongoose.Types.ObjectId;
  partId: mongoose.Types.ObjectId;
  title: string;
  condition: PartCondition;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
}

export interface ISubOrderSubdoc {
  _id: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  items: IOrderLineItem[];
  subtotalPaise: number;
  platformFeePaise: number;
  sellerSettlementPaise: number;
  fulfillmentStatus: OrderStatus;
  trackingNumber?: string;
  carrier?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
  payoutStatus: 'pending' | 'eligible' | 'paid';
}

export interface IOrderDocument extends Document {
  orderNumber: string;
  customerId: mongoose.Types.ObjectId;
  subOrders: mongoose.Types.DocumentArray<ISubOrderSubdoc>;
  shippingAddress: {
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: 'IN';
  };
  subtotalPaise: number;
  shippingPaise: number;
  taxPaise: number;
  totalPaise: number;
  currency: 'INR';
  status: OrderStatus;
  reservationExpiresAt: Date;
  paymentId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OrderLineItemSchema = new Schema<IOrderLineItem>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    partId: { type: Schema.Types.ObjectId, ref: 'Part', required: true },
    title: { type: String, required: true },
    condition: { type: String, enum: PART_CONDITIONS, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPricePaise: { type: Number, required: true, min: 1 },
    lineTotalPaise: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const SubOrderSchema = new Schema<ISubOrderSubdoc>(
  {
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [OrderLineItemSchema], required: true },
    subtotalPaise: { type: Number, required: true, min: 0 },
    platformFeePaise: { type: Number, required: true, min: 0 },
    sellerSettlementPaise: { type: Number, required: true, min: 0 },
    fulfillmentStatus: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'pending_payment',
    },
    trackingNumber: { type: String, trim: true },
    carrier: { type: String, trim: true },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
    payoutStatus: {
      type: String,
      enum: ['pending', 'eligible', 'paid'],
      default: 'pending',
    },
  },
  { _id: true }
);

const OrderSchema = new Schema<IOrderDocument>(
  {
    orderNumber: { type: String, required: true, unique: true, trim: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subOrders: { type: [SubOrderSchema], required: true },
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      line1: { type: String, required: true },
      line2: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, enum: ['IN'], default: 'IN' },
    },
    subtotalPaise: { type: Number, required: true, min: 0 },
    shippingPaise: { type: Number, required: true, min: 0 },
    taxPaise: { type: Number, required: true, min: 0 },
    totalPaise: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ['INR'], default: 'INR' },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'pending_payment',
    },
    reservationExpiresAt: { type: Date, required: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
  },
  { timestamps: true }
);

OrderSchema.index({ customerId: 1, createdAt: -1 });
OrderSchema.index({ 'subOrders.sellerId': 1, createdAt: -1 });
OrderSchema.index({ status: 1, reservationExpiresAt: 1 });

export const OrderModel = mongoose.model<IOrderDocument>('Order', OrderSchema);

