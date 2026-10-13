import { SellerStatus, ListingStatus, UserRole } from '@fixme/shared-types';
import { UserModel, IUserDocument } from '../models/User';
import { SellerProfileModel, ISellerProfileDocument } from '../models/SellerProfile';
import { ListingModel, IListingDocument } from '../models/Listing';
import { OrderModel } from '../models/Order';
import { DisputeModel } from '../models/Dispute';
import { AuditLogModel, IAuditLogDocument } from '../models/AuditLog';
import { AppError } from '../middleware/errorHandler';

export class ModerationService {
  static async getAdminDashboardMetrics(): Promise<{
    totalUsers: number;
    pendingSellers: number;
    approvedSellers: number;
    activeListings: number;
    pendingListings: number;
    totalOrders: number;
    openDisputes: number;
    totalGrossRevenuePaise: number;
  }> {
    const [
      totalUsers,
      pendingSellers,
      approvedSellers,
      activeListings,
      pendingListings,
      totalOrders,
      openDisputes,
      paidOrders,
    ] = await Promise.all([
      UserModel.countDocuments({}),
      SellerProfileModel.countDocuments({ status: 'pending' }),
      SellerProfileModel.countDocuments({ status: 'approved' }),
      ListingModel.countDocuments({ status: 'active' }),
      ListingModel.countDocuments({ status: 'pending_review' }),
      OrderModel.countDocuments({}),
      DisputeModel.countDocuments({ status: { $in: ['open', 'under_review'] } }),
      OrderModel.find({
        status: { $in: ['paid', 'confirmed', 'processing', 'shipped', 'delivered'] },
      }).select('totalPaise'),
    ]);

    const totalGrossRevenuePaise = paidOrders.reduce(
      (sum, o) => sum + (o.totalPaise || 0),
      0
    );

    return {
      totalUsers,
      pendingSellers,
      approvedSellers,
      activeListings,
      pendingListings,
      totalOrders,
      openDisputes,
      totalGrossRevenuePaise,
    };
  }

  static getMarketplacePolicies() {
    const pricingRules = {
      currency: 'INR',
      precisionUnit: 'paise',
      platformCommissionBps: 800,
      platformCommissionPercent: 8,
      gstTaxBps: 1800,
      gstRatePercent: 18,
      flatShippingPaise: 9900,
      standardShippingPaise: 9900,
      freeShippingThresholdPaise: 200000,
    };
    return {
      pricingRules,
      pricingPolicy: pricingRules,
      returnRefundPolicy: {
        returnWindowDays: 14,
        evidenceRequired: true,
        eligibleReasons: [
          'Wrong part received despite verified compatibility',
          'Dead on arrival (DOA) or bent connector pins',
          'Transit damage with unboxing photo evidence',
        ],
        refundProcessingDays: 5,
      },
      privacyPolicy: {
        collectedFields: [
          'Full name, email address, phone number, shipping/billing PIN code addresses',
          'Seller GSTIN/PAN and KYC business verification documents (stored in private access-controlled storage)',
        ],
        retentionSummary:
          'Order and tax invoice records are retained per statutory accounting requirements. Passwords, session tokens, and payment secrets are never logged.',
      },
      sellerPolicy: {
        prohibitedActivities: [
          'Counterfeit OEM markings or falsified compatibility claims',
          'Manipulated reviews or off-platform fee circumvention',
        ],
        requiredFields: [
          'Canonical part association, condition grade, warranty days, stockAvailable, and integer pricePaise',
        ],
      },
    };
  }

  static async reviewSellerApplication(params: {
    adminId: string;
    adminRole: UserRole;
    sellerProfileId: string;
    status: SellerStatus;
    reviewNotes?: string;
    requestId?: string;
  }): Promise<{ sellerProfile: ISellerProfileDocument; user: IUserDocument }> {
    const profile = await SellerProfileModel.findById(params.sellerProfileId);
    if (!profile) {
      throw new AppError(404, 'SELLER_PROFILE_NOT_FOUND', 'Seller application not found');
    }

    const user = await UserModel.findById(profile.userId);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Applicant user not found');
    }

    profile.status = params.status;
    profile.reviewedByAdminId = params.adminId as any;
    profile.reviewNotes = params.reviewNotes;
    await profile.save();

    if (params.status === 'approved' && user.role === 'customer') {
      user.role = 'seller';
      await user.save();
    } else if (params.status === 'suspended' && user.role === 'seller') {
      user.role = 'customer';
      await user.save();
    }

    await AuditLogModel.create({
      actorId: params.adminId,
      actorRole: params.adminRole,
      action: `SELLER_APPLICATION_${params.status.toUpperCase()}`,
      entityType: 'SellerProfile',
      entityId: profile._id.toString(),
      metadata: {
        applicantUserId: user._id.toString(),
        newStatus: params.status,
        reviewNotes: params.reviewNotes,
      },
      requestId: params.requestId,
    });

    return { sellerProfile: profile, user };
  }

  static async reviewListing(params: {
    adminId: string;
    adminRole: UserRole;
    listingId: string;
    status: ListingStatus;
    moderationNotes?: string;
    requestId?: string;
  }): Promise<IListingDocument> {
    const listing = await ListingModel.findById(params.listingId);
    if (!listing) {
      throw new AppError(404, 'LISTING_NOT_FOUND', 'Listing not found');
    }

    const previousStatus = listing.status;
    listing.status = params.status;
    listing.moderationNotes = params.moderationNotes;
    await listing.save();

    await AuditLogModel.create({
      actorId: params.adminId,
      actorRole: params.adminRole,
      action: `LISTING_MODERATION_${params.status.toUpperCase()}`,
      entityType: 'Listing',
      entityId: listing._id.toString(),
      metadata: {
        previousStatus,
        newStatus: params.status,
        moderationNotes: params.moderationNotes,
      },
      requestId: params.requestId,
    });

    return listing;
  }

  static async listSellerApplications(status?: string): Promise<ISellerProfileDocument[]> {
    const filter = status ? { status } : {};
    return SellerProfileModel.find(filter)
      .populate('userId', 'email fullName role isActive')
      .sort({ createdAt: -1 });
  }

  static async listAuditLogs(limit = 50): Promise<IAuditLogDocument[]> {
    return AuditLogModel.find({})
      .populate('actorId', 'email fullName role')
      .sort({ createdAt: -1 })
      .limit(Math.min(200, limit));
  }

  static async listUsers(role?: string, q?: string): Promise<IUserDocument[]> {
    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (q) {
      filter.$or = [
        { email: { $regex: q, $options: 'i' } },
        { fullName: { $regex: q, $options: 'i' } },
      ];
    }
    return UserModel.find(filter).sort({ createdAt: -1 });
  }

  static async updateUserRole(params: {
    userId: string;
    role: UserRole;
    adminId: string;
    requestId?: string;
  }): Promise<IUserDocument> {
    const user = await UserModel.findById(params.userId);
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    const oldRole = user.role;
    user.role = params.role;
    await user.save();

    await AuditLogModel.create({
      actorId: params.adminId,
      actorRole: 'administrator',
      action: 'USER_ROLE_UPDATED',
      entityType: 'User',
      entityId: user._id.toString(),
      metadata: { oldRole, newRole: params.role },
      requestId: params.requestId,
    });
    return user;
  }

  static async updateUserStatus(params: {
    userId: string;
    isActive: boolean;
    adminId: string;
    requestId?: string;
  }): Promise<IUserDocument> {
    const user = await UserModel.findById(params.userId);
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    user.isActive = params.isActive;
    await user.save();

    await AuditLogModel.create({
      actorId: params.adminId,
      actorRole: 'administrator',
      action: params.isActive ? 'USER_ACTIVATED' : 'USER_SUSPENDED',
      entityType: 'User',
      entityId: user._id.toString(),
      metadata: { isActive: params.isActive },
      requestId: params.requestId,
    });
    return user;
  }

  static async listAdminOrders(): Promise<any[]> {
    return OrderModel.find({})
      .populate('customerId', 'fullName email')
      .sort({ createdAt: -1 });
  }

  static async listAdminDisputes(): Promise<any[]> {
    return DisputeModel.find({})
      .populate('orderId', 'orderNumber totalPaise status')
      .populate('customerId', 'fullName email role')
      .populate('sellerId', 'fullName email role')
      .populate('resolvedByUserId', 'fullName email role')
      .sort({ createdAt: -1 });
  }

  static async getFinanceReport(): Promise<any> {
    const metrics = await this.getAdminDashboardMetrics();
    const orders = await OrderModel.find({ status: { $in: ['paid', 'shipped', 'delivered'] } })
      .sort({ createdAt: -1 })
      .limit(100);

    return {
      grossMerchandiseValuePaise: metrics.totalGrossRevenuePaise,
      platformCommissionPaise: Math.round(metrics.totalGrossRevenuePaise * 0.08),
      totalOrders: metrics.totalOrders,
      recentPaidOrders: orders,
    };
  }
}
