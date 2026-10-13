import mongoose, { Schema, Document } from 'mongoose';

export interface IInventoryMovementDocument extends Document {
  listingId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  movementType: 'manual_adjustment' | 'reserve' | 'commit' | 'release' | 'return_restock';
  quantityDelta: number;
  previousAvailable: number;
  newAvailable: number;
  reason: string;
  actorUserId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const InventoryMovementSchema = new Schema<IInventoryMovementDocument>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    movementType: {
      type: String,
      enum: ['manual_adjustment', 'reserve', 'commit', 'release', 'return_restock'],
      required: true,
    },
    quantityDelta: { type: Number, required: true },
    previousAvailable: { type: Number, required: true },
    newAvailable: { type: Number, required: true },
    reason: { type: String, required: true, trim: true },
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

InventoryMovementSchema.index({ listingId: 1, createdAt: -1 });
InventoryMovementSchema.index({ sellerId: 1, createdAt: -1 });

export const InventoryMovementModel = mongoose.model<IInventoryMovementDocument>(
  'InventoryMovement',
  InventoryMovementSchema
);

