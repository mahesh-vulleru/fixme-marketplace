import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '@fixme/shared-types';

export interface IAuditLogDocument extends Document {
  actorId: mongoose.Types.ObjectId;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  requestId?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true, trim: true },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: String, required: true, trim: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, trim: true },
    requestId: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export const AuditLogModel = mongoose.model<IAuditLogDocument>('AuditLog', AuditLogSchema);

