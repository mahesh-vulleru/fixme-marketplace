import { FilterQuery } from 'mongoose';
import { CompatibilityStatus, PartCondition } from '@fixme/shared-types';
import { CategoryModel, ICategoryDocument } from '../models/Category';
import { BrandModel, IBrandDocument } from '../models/Brand';
import { DeviceModel, IDeviceDocument } from '../models/Device';
import { PartModel, IPartDocument } from '../models/Part';
import {
  CompatibilityRecordModel,
  ICompatibilityRecordDocument,
} from '../models/CompatibilityRecord';
import { ListingModel, IListingDocument } from '../models/Listing';
import { AppError } from '../middleware/errorHandler';

export class CatalogueService {
  // Categories
  static async listCategories(onlyActive = true): Promise<ICategoryDocument[]> {
    const filter: FilterQuery<ICategoryDocument> = onlyActive
      ? { isActive: true }
      : {};
    return CategoryModel.find(filter).sort({ sortOrder: 1, name: 1 });
  }

  static async createCategory(input: {
    name: string;
    slug: string;
    description?: string;
    parentCategoryId?: string;
  }): Promise<ICategoryDocument> {
    const existing = await CategoryModel.findOne({ slug: input.slug });
    if (existing) {
      throw new AppError(409, 'DUPLICATE_SLUG', `Category slug '${input.slug}' already exists`);
    }
    return CategoryModel.create({
      name: input.name,
      slug: input.slug,
      description: input.description,
      parentId: input.parentCategoryId || null,
    });
  }

  // Brands
  static async listBrands(onlyActive = true): Promise<IBrandDocument[]> {
    const filter: FilterQuery<IBrandDocument> = onlyActive ? { isActive: true } : {};
    return BrandModel.find(filter).sort({ name: 1 });
  }

  static async createBrand(input: {
    name: string;
    slug: string;
    logoAssetId?: string;
  }): Promise<IBrandDocument> {
    const existing = await BrandModel.findOne({ slug: input.slug });
    if (existing) {
      throw new AppError(409, 'DUPLICATE_SLUG', `Brand slug '${input.slug}' already exists`);
    }
    return BrandModel.create(input);
  }

  // Devices
  static async listDevices(params: {
    brandId?: string;
    categoryId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    items: IDeviceDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const filter: FilterQuery<IDeviceDocument> = { isActive: true };

    if (params.brandId) filter.brandId = params.brandId;
    if (params.categoryId) filter.categoryId = params.categoryId;
    if (params.search && params.search.trim()) {
      const escaped = params.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [{ modelName: regex }, { modelNumber: regex }, { variant: regex }];
    }

    const [items, total] = await Promise.all([
      DeviceModel.find(filter)
        .populate('brandId', 'name slug')
        .populate('categoryId', 'name slug')
        .sort({ releaseYear: -1, modelName: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      DeviceModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  static async getDeviceById(id: string): Promise<IDeviceDocument> {
    const device = await DeviceModel.findById(id)
      .populate('brandId', 'name slug')
      .populate('categoryId', 'name slug');

    if (!device) {
      throw new AppError(404, 'DEVICE_NOT_FOUND', 'Device not found');
    }
    return device;
  }

  static async createDevice(input: {
    brandId: string;
    categoryId: string;
    modelName: string;
    modelNumber: string;
    variant?: string;
    region?: string;
    releaseYear?: number;
  }): Promise<IDeviceDocument> {
    const existing = await DeviceModel.findOne({
      brandId: input.brandId,
      modelNumber: input.modelNumber,
    });
    if (existing) {
      throw new AppError(
        409,
        'DUPLICATE_DEVICE',
        'Device with this brand and modelNumber already exists'
      );
    }
    return DeviceModel.create(input);
  }

  // Canonical Parts
  static async listParts(params: {
    categoryId?: string;
    brandId?: string;
    componentType?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    items: IPartDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const filter: FilterQuery<IPartDocument> = { isActive: true };

    if (params.categoryId) filter.categoryId = params.categoryId;
    if (params.brandId) filter.brandId = params.brandId;
    if (params.componentType) filter.componentType = params.componentType;
    if (params.search && params.search.trim()) {
      const escaped = params.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { name: regex },
        { partNumber: regex },
        { componentType: regex },
        { oemReference: regex },
      ];
    }

    const [items, total] = await Promise.all([
      PartModel.find(filter)
        .populate('brandId', 'name slug')
        .populate('categoryId', 'name slug')
        .sort({ name: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      PartModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  static async getPartById(id: string): Promise<{
    part: IPartDocument;
    compatibleDevices: ICompatibilityRecordDocument[];
    activeListings: IListingDocument[];
  }> {
    const part = await PartModel.findById(id)
      .populate('brandId', 'name slug')
      .populate('categoryId', 'name slug');

    if (!part) {
      throw new AppError(404, 'PART_NOT_FOUND', 'Canonical part not found');
    }

    const [compatibleDevices, activeListings] = await Promise.all([
      CompatibilityRecordModel.find({
        partId: part._id,
        verificationStatus: 'verified',
      }).populate('deviceId', 'modelName modelNumber variant releaseYear'),
      ListingModel.find({
        partId: part._id,
        status: 'active',
        stockAvailable: { $gt: 0 },
      }).sort({ pricePaise: 1 }),
    ]);

    return { part, compatibleDevices, activeListings };
  }

  static async createPart(input: {
    categoryId: string;
    brandId: string;
    partNumber: string;
    name: string;
    componentType: any;
    description: string;
    specifications?: Record<string, string>;
    oemReference?: string;
  }): Promise<IPartDocument> {
    const existing = await PartModel.findOne({ partNumber: input.partNumber });
    if (existing) {
      throw new AppError(409, 'DUPLICATE_PART_NUMBER', `Part number '${input.partNumber}' already exists`);
    }
    return PartModel.create(input);
  }

  // Structured Compatibility Engine (NEVER guesses from listing titles)
  static async createCompatibilityRecord(
    input: {
      deviceId: string;
      partId: string;
      verificationStatus: CompatibilityStatus;
      evidenceNotes: string;
      sourceType: 'manufacturer_datasheet' | 'teardown_verified' | 'seller_submitted' | 'admin_verified';
    },
    verifiedByUserId?: string
  ): Promise<ICompatibilityRecordDocument> {
    const [device, part] = await Promise.all([
      DeviceModel.findById(input.deviceId),
      PartModel.findById(input.partId),
    ]);
    if (!device) {
      throw new AppError(404, 'DEVICE_NOT_FOUND', 'Device not found for compatibility link');
    }
    if (!part) {
      throw new AppError(404, 'PART_NOT_FOUND', 'Part not found for compatibility link');
    }

    const record = await CompatibilityRecordModel.findOneAndUpdate(
      { deviceId: input.deviceId, partId: input.partId },
      {
        ...input,
        verifiedByUserId,
      },
      { new: true, upsert: true, runValidators: true }
    );

    return record!;
  }

  static async checkCompatibility(input: {
    deviceId: string;
    partId: string;
  }): Promise<{
    compatible: boolean;
    verificationStatus: CompatibilityStatus | 'not_found';
    evidenceNotes?: string;
    sourceType?: string;
    device: IDeviceDocument;
    part: IPartDocument;
    matchingListingsCount: number;
  }> {
    const [device, part] = await Promise.all([
      DeviceModel.findById(input.deviceId),
      PartModel.findById(input.partId),
    ]);
    if (!device) {
      throw new AppError(404, 'DEVICE_NOT_FOUND', 'Device not found');
    }
    if (!part) {
      throw new AppError(404, 'PART_NOT_FOUND', 'Part not found');
    }

    const [record, matchingListingsCount] = await Promise.all([
      CompatibilityRecordModel.findOne({
        deviceId: device._id,
        partId: part._id,
      }),
      ListingModel.countDocuments({
        partId: part._id,
        status: 'active',
        stockAvailable: { $gt: 0 },
      }),
    ]);

    if (!record) {
      return {
        compatible: false,
        verificationStatus: 'not_found',
        evidenceNotes:
          'No structured compatibility record exists linking this exact device model and canonical part. Compatibility is never guessed from listing titles.',
        device,
        part,
        matchingListingsCount,
      };
    }

    return {
      compatible: record.verificationStatus === 'verified',
      verificationStatus: record.verificationStatus,
      evidenceNotes: record.evidenceNotes,
      sourceType: record.sourceType,
      device,
      part,
      matchingListingsCount,
    };
  }

  static async getCompatiblePartsForDevice(deviceId: string): Promise<{
    device: IDeviceDocument;
    compatibleParts: Array<{
      compatibility: ICompatibilityRecordDocument;
      part: IPartDocument;
      listings: IListingDocument[];
      lowestPricePaise: number | null;
    }>;
  }> {
    const device = await this.getDeviceById(deviceId);

    const records = await CompatibilityRecordModel.find({
      deviceId: device._id,
      verificationStatus: 'verified',
    }).populate('partId');

    const results = await Promise.all(
      records.map(async (record) => {
        const part = record.partId as unknown as IPartDocument;
        const listings = await ListingModel.find({
          partId: part._id,
          status: 'active',
          stockAvailable: { $gt: 0 },
        }).sort({ pricePaise: 1 });

        const lowestPricePaise = listings.length > 0 ? listings[0].pricePaise : null;

        return {
          compatibility: record,
          part,
          listings,
          lowestPricePaise,
        };
      })
    );

    return {
      device,
      compatibleParts: results,
    };
  }

  // Listings
  static async listListings(params: {
    partId?: string;
    sellerId?: string;
    condition?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    items: IListingDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const filter: FilterQuery<IListingDocument> = {};

    if (params.partId) filter.partId = params.partId;
    if (params.sellerId) filter.sellerId = params.sellerId;
    if (params.condition) filter.condition = params.condition;
    if (params.status && params.status !== 'all') {
      filter.status = params.status;
    } else if (!params.status) {
      filter.status = 'active';
    }

    const [items, total] = await Promise.all([
      ListingModel.find(filter)
        .populate('partId', 'name partNumber componentType oemReference')
        .sort({ pricePaise: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      ListingModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  static async createListing(
    sellerId: string,
    input: {
      partId: string;
      title: string;
      description?: string;
      condition: PartCondition;
      pricePaise: number;
      stockAvailable: number;
      assetIds?: string[];
      warrantyDays?: number;
    },
    autoActivate = false
  ): Promise<IListingDocument> {
    if (!Number.isInteger(input.pricePaise) || input.pricePaise <= 0) {
      throw new AppError(
        400,
        'INVALID_PRICE_PAISE',
        'pricePaise must be a positive integer in paise (never floating-point)'
      );
    }

    const part = await PartModel.findById(input.partId);
    if (!part) {
      throw new AppError(404, 'PART_NOT_FOUND', 'Canonical part not found for listing');
    }

    return ListingModel.create({
      ...input,
      sellerId,
      currency: 'INR',
      stockReserved: 0,
      status: autoActivate ? 'active' : 'pending_review',
    });
  }
}

