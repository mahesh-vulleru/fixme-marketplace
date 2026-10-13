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
    return {
      pricingRules: {
        currency: 'INR',
        precisionUnit: 'paise',
        platformCommissionBps: 800,
        gstTaxBps: 1800,
        flatShippingPaise: 9900,
        freeShippingThresholdPaise: 200000,
      },
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
}
