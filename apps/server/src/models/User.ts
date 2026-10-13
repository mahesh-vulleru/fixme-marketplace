import mongoose, { Schema, Document } from 'mongoose';
import { USER_ROLES, UserRole } from '@fixme/shared-types';

export interface IUserDocument extends Document {
  email: string;
  phone?: string;
  fullName: string;
  passwordHash: string;
  role: UserRole;
  isEmailVerified: boolean;
  isActive: boolean;
  mfaEnabled: boolean;
  failedLoginAttempts: number;
  lockUntil?: Date | null;
  passwordResetTokenHash?: string | null;
  passwordResetExpiresAt?: Date | null;
  tokenVersion: number;
  wishlistListingIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 160,
    },
    phone: { type: String, trim: true, maxlength: 20 },
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: USER_ROLES,
      default: 'customer',
    },
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    mfaEnabled: { type: Boolean, default: false },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetExpiresAt: { type: Date, default: null },
    tokenVersion: { type: Number, default: 0 },
    wishlistListingIds: [{ type: Schema.Types.ObjectId, ref: 'Listing' }],
  },
  { timestamps: true }
);

UserSchema.index({ role: 1, isActive: 1 });
UserSchema.index({ passwordResetTokenHash: 1 });

export const UserModel = mongoose.model<IUserDocument>('User', UserSchema);
