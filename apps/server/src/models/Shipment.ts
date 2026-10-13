import mongoose, { Schema, Document } from 'mongoose';

export interface IShipmentDocument extends Document {
  orderId: mongoose.Types.ObjectId;
  subOrderId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  carrier: string;
  trackingNumber: string;
  status: 'label_created' | 'in_transit' | 'delivered';
  shippedAt: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ShipmentSchema = new Schema<IShipmentDocument>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    subOrderId: { type: Schema.Types.ObjectId, required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    carrier: { type: String, required: true, trim: true },
    trackingNumber: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['label_created', 'in_transit', 'delivered'],
      default: 'in_transit',
    },
    shippedAt: { type: Date, default: Date.now },
    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

ShipmentSchema.index({ orderId: 1, subOrderId: 1 }, { unique: true });
ShipmentSchema.index({ sellerId: 1, createdAt: -1 });

export const ShipmentModel = mongoose.model<IShipmentDocument>('Shipment', ShipmentSchema);

