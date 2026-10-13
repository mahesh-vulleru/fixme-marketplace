import mongoose, { Schema, Document } from 'mongoose';

export interface ICartItemSubdoc {
  listingId: mongoose.Types.ObjectId;
  quantity: number;
}

export interface ICartDocument extends Document {
  userId: mongoose.Types.ObjectId;
  items: ICartItemSubdoc[];
  updatedAt: Date;
  createdAt: Date;
}

const CartItemSchema = new Schema<ICartItemSubdoc>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
      validate: {
        validator: Number.isInteger,
        message: 'quantity must be an integer',
      },
    },
  },
  { _id: true }
);

const CartSchema = new Schema<ICartDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: { type: [CartItemSchema], default: [] },
  },
  { timestamps: true }
);

export const CartModel = mongoose.model<ICartDocument>('Cart', CartSchema);

