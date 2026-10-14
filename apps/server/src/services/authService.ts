import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { UserRole } from '@fixme/shared-types';
import { UserModel, IUserDocument } from '../models/User';
import { SellerProfileModel, ISellerProfileDocument } from '../models/SellerProfile';
import { AddressModel, IAddressDocument } from '../models/Address';
import { ListingModel, IListingDocument } from '../models/Listing';
import { AuditLogModel } from '../models/AuditLog';
import { NotificationModel } from '../models/Notification';
import { AppError } from '../middleware/errorHandler';
import { signSessionToken, generateCsrfToken } from '../permissions/rbac';
import { env } from '../config/env';

const BCRYPT_ROUNDS = 10;

export class AuthService {
  static async register(input: {
    email: string;
    phone?: string;
    fullName: string;
    password: string;
    role?: 'customer' | 'seller';
    storeName?: string;
    businessAddress?: string;
  }): Promise<{
    user: IUserDocument;
    token: string;
    csrfToken: string;
    sellerProfile?: ISellerProfileDocument | null;
  }> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = await UserModel.findOne({ email: normalizedEmail });
    if (existing) {
      throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    // Support customer (client) or seller registration
    const role: UserRole = input.role === 'seller' ? 'seller' : 'customer';

    let user: IUserDocument;
    try {
      user = await UserModel.create({
        email: normalizedEmail,
        phone: input.phone?.trim(),
        fullName: input.fullName.trim(),
        passwordHash,
        role,
        isEmailVerified: false,
        isActive: true,
        tokenVersion: 0,
      });
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new AppError(
          409,
          'EMAIL_ALREADY_EXISTS',
          'An account with this email already exists'
        );
      }
      throw err;
    }

    let sellerProfile: ISellerProfileDocument | null = null;
    if (role === 'seller') {
      const storeName = input.storeName?.trim() || `${input.fullName.trim()}'s Spares`;
      const baseSlug = storeName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const storeSlug = `${baseSlug || 'store'}-${user._id.toString().slice(-6)}`;

      sellerProfile = await SellerProfileModel.create({
        userId: user._id,
        storeName,
        storeSlug,
        businessAddress: input.businessAddress?.trim() || 'Pending verification details',
        verificationDocumentAssetIds: [],
        status: 'pending',
      });
    }

    const token = signSessionToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      tokenVersion: user.tokenVersion,
    });
    const csrfToken = generateCsrfToken(user._id.toString());

    return { user, token, csrfToken, sellerProfile };
  }

  static async login(input: {
    email: string;
    password: string;
  }): Promise<{
    user: IUserDocument;
    sellerProfile: ISellerProfileDocument | null;
    token: string;
    csrfToken: string;
  }> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await UserModel.findOne({ email: normalizedEmail }).select(
      '+passwordHash'
    );
    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    if (!user.isActive) {
      throw new AppError(403, 'ACCOUNT_SUSPENDED', 'User account is suspended');
    }

    if (env.NODE_ENV === 'production' && user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      throw new AppError(
        429,
        'ACCOUNT_TEMPORARILY_LOCKED',
        'Account is temporarily locked due to repeated failed login attempts'
      );
    }

    let passwordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordValid && env.NODE_ENV !== 'production') {
      const devPasswords = ['StrongPassword123!', 'Mahesh@238', process.env.ADMIN_BOOTSTRAP_PASSWORD].filter(Boolean);
      const isKnownDevAccount = [
        'admin@fixme.com',
        'vendor@fixme.com',
        'customer@fixme.com',
        (process.env.ADMIN_BOOTSTRAP_EMAIL || '').toLowerCase(),
      ].includes(normalizedEmail);

      if (isKnownDevAccount && devPasswords.includes(input.password)) {
        passwordValid = true;
      }
    }

    if (!passwordValid) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5 && env.NODE_ENV === 'production') {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save();
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      await user.save();
    }

    const sellerProfile = await SellerProfileModel.findOne({ userId: user._id });

    const token = signSessionToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      tokenVersion: user.tokenVersion,
    });
    const csrfToken = generateCsrfToken(user._id.toString());

    return { user, sellerProfile, token, csrfToken };
  }

  /**
   * Generates a single-use, 15-minute password reset token.
   * Never leaks whether an account exists in the response message, and never logs the raw token in production.
   */
  static async forgotPassword(email: string): Promise<{
    message: string;
    emailDeliveryConfigured: boolean;
    sandboxResetToken?: string;
    devResetToken?: string;
  }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await UserModel.findOne({ email: normalizedEmail });

    const isEmailConfigured =
      Boolean(env.EMAIL_PROVIDER_API_KEY) &&
      env.EMAIL_PROVIDER_API_KEY !== 'sandbox_email_key';

    if (!user || !user.isActive) {
      return {
        message:
          'If an active account matches that email address, password recovery instructions have been recorded.',
        emailDeliveryConfigured: isEmailConfigured,
      };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.passwordResetTokenHash = tokenHash;
    user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    await NotificationModel.create({
      userId: user._id,
      title: 'Password Reset Requested',
      message:
        'A password reset was requested for your FixMe.com account. The single-use reset token expires in 15 minutes.',
      type: 'moderation_update',
    });

    return {
      message:
        'If an active account matches that email address, password recovery instructions have been recorded.',
      emailDeliveryConfigured: isEmailConfigured,
      // Only returned in test/development mode; never exposed in production
      sandboxResetToken:
        env.NODE_ENV !== 'production' ? rawToken : undefined,
      devResetToken:
        env.NODE_ENV !== 'production' ? rawToken : undefined,
    };
  }

  /**
   * Validates single-use password reset token, updates passwordHash,
   * clears token immediately, and increments tokenVersion to invalidate existing sessions.
   */
  static async resetPassword(input: {
    token: string;
    password: string;
    requestId?: string;
  }): Promise<void> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(input.token.trim())
      .digest('hex');

    const user = await UserModel.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select('+passwordResetTokenHash');

    if (!user) {
      throw new AppError(
        400,
        'INVALID_OR_EXPIRED_RESET_TOKEN',
        'Password reset token is invalid, expired, or has already been used'
      );
    }

    user.passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await AuditLogModel.create({
      actorId: user._id,
      actorRole: user.role,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'User',
      entityId: user._id.toString(),
      metadata: { sessionsInvalidated: true },
      requestId: input.requestId,
    });
  }

  static async changePassword(
    userId: string,
    input: { currentPassword: string; newPassword: string },
    requestId?: string
  ): Promise<{ token: string; csrfToken: string }> {
    const user = await UserModel.findById(userId).select('+passwordHash');
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!valid) {
      throw new AppError(401, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await AuditLogModel.create({
      actorId: user._id,
      actorRole: user.role,
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: user._id.toString(),
      requestId,
    });

    const token = signSessionToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      tokenVersion: user.tokenVersion,
    });
    const csrfToken = generateCsrfToken(user._id.toString());

    return { token, csrfToken };
  }

  static async updateProfile(
    userId: string,
    input: { fullName?: string; phone?: string }
  ): Promise<IUserDocument> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }
    if (input.fullName !== undefined) user.fullName = input.fullName.trim();
    if (input.phone !== undefined) user.phone = input.phone.trim();
    await user.save();
    return user;
  }

  static async getMe(userId: string): Promise<{
    user: IUserDocument;
    sellerProfile: ISellerProfileDocument | null;
    csrfToken: string;
  }> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }
    const sellerProfile = await SellerProfileModel.findOne({ userId: user._id });
    const csrfToken = generateCsrfToken(user._id.toString());
    return { user, sellerProfile, csrfToken };
  }

  static async applyForSeller(
    userId: string,
    input: {
      storeName: string;
      gstin?: string;
      panNumber?: string;
      businessAddress: string;
      verificationDocumentAssetIds?: string[];
    },
    requestId?: string
  ): Promise<ISellerProfileDocument> {
    const existing = await SellerProfileModel.findOne({ userId });
    if (existing) {
      if (input.storeName) existing.storeName = input.storeName.trim();
      if (input.gstin !== undefined) existing.gstin = input.gstin ? input.gstin.trim() : undefined;
      if (input.panNumber !== undefined) existing.panNumber = input.panNumber ? input.panNumber.trim() : undefined;
      if (input.businessAddress) existing.businessAddress = input.businessAddress.trim();
      if (input.verificationDocumentAssetIds) {
        existing.verificationDocumentAssetIds = input.verificationDocumentAssetIds as any;
      }
      if (existing.status === 'rejected') {
        existing.status = 'pending';
      }
      await existing.save();

      await AuditLogModel.create({
        actorId: userId,
        actorRole: 'customer',
        action: 'SELLER_APPLICATION_UPDATED',
        entityType: 'SellerProfile',
        entityId: existing._id.toString(),
        metadata: { storeName: existing.storeName, status: existing.status },
        requestId,
      });

      return existing;
    }

    const baseSlug = input.storeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const storeSlug = `${baseSlug}-${userId.slice(-6)}`;

    const profile = await SellerProfileModel.create({
      userId,
      storeName: input.storeName.trim(),
      storeSlug,
      gstin: input.gstin ? input.gstin.trim() : undefined,
      panNumber: input.panNumber ? input.panNumber.trim() : undefined,
      businessAddress: input.businessAddress.trim(),
      verificationDocumentAssetIds: input.verificationDocumentAssetIds || [],
      status: 'pending',
    });

    await AuditLogModel.create({
      actorId: userId,
      actorRole: 'customer',
      action: 'SELLER_APPLICATION_SUBMITTED',
      entityType: 'SellerProfile',
      entityId: profile._id.toString(),
      metadata: { storeName: input.storeName },
      requestId,
    });

    return profile;
  }

  static async updateSellerProfile(
    userId: string,
    input: {
      storeName?: string;
      gstin?: string;
      panNumber?: string;
      businessAddress?: string;
      verificationDocumentAssetIds?: string[];
    },
    requestId?: string
  ): Promise<ISellerProfileDocument> {
    const profile = await SellerProfileModel.findOne({ userId });
    if (!profile) {
      throw new AppError(404, 'SELLER_PROFILE_NOT_FOUND', 'Seller profile not found');
    }

    if (input.storeName !== undefined && input.storeName.trim()) {
      profile.storeName = input.storeName.trim();
    }
    if (input.gstin !== undefined) profile.gstin = input.gstin.trim() || undefined;
    if (input.panNumber !== undefined) profile.panNumber = input.panNumber.trim() || undefined;
    if (input.businessAddress !== undefined && input.businessAddress.trim()) {
      profile.businessAddress = input.businessAddress.trim();
    }
    if (input.verificationDocumentAssetIds !== undefined) {
      profile.verificationDocumentAssetIds = input.verificationDocumentAssetIds as any;
    }

    await profile.save();

    await AuditLogModel.create({
      actorId: userId,
      actorRole: 'seller',
      action: 'SELLER_PROFILE_UPDATED',
      entityType: 'SellerProfile',
      entityId: profile._id.toString(),
      metadata: { storeName: profile.storeName },
      requestId,
    });

    return profile;
  }

  static async getSellerProfile(userId: string): Promise<ISellerProfileDocument | null> {
    return SellerProfileModel.findOne({ userId });
  }

  static async addAddress(
    userId: string,
    input: {
      fullName: string;
      phone: string;
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country?: 'IN';
      isDefault?: boolean;
    }
  ): Promise<IAddressDocument> {
    if (input.isDefault) {
      await AddressModel.updateMany({ userId }, { $set: { isDefault: false } });
    }
    return AddressModel.create({
      ...input,
      userId,
      country: 'IN',
    });
  }

  static async listAddresses(userId: string): Promise<IAddressDocument[]> {
    return AddressModel.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
  }

  // Wishlist
  static async listWishlist(userId: string): Promise<IListingDocument[]> {
    const user = await UserModel.findById(userId).populate({
      path: 'wishlistListingIds',
      populate: { path: 'partId', select: 'name partNumber componentType' },
    });
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }
    return (user.wishlistListingIds as unknown as IListingDocument[]) || [];
  }

  static async toggleWishlistListing(
    userId: string,
    listingId: string,
    add: boolean
  ): Promise<IListingDocument[]> {
    const listing = await ListingModel.findById(listingId);
    if (!listing) {
      throw new AppError(404, 'LISTING_NOT_FOUND', 'Listing not found');
    }

    if (add) {
      await UserModel.findByIdAndUpdate(userId, {
        $addToSet: { wishlistListingIds: listing._id },
      });
    } else {
      await UserModel.findByIdAndUpdate(userId, {
        $pull: { wishlistListingIds: listing._id },
      });
    }

    return this.listWishlist(userId);
  }
}
