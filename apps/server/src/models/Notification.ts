import mongoose, { Schema, Document } from 'mongoose';

export interface INotificationDocument extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: 'order_update' | 'wanted_offer' | 'dispute_update' | 'moderation_update';
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    type: {
      type: String,
      enum: ['order_update', 'wanted_offer', 'dispute_update', 'moderation_update'],
      default: 'order_update',
    },
    isRead: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const NotificationModel = mongoose.model<INotificationDocument>(
  'Notification',
  NotificationSchema
);

