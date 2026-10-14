import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User';
import { SellerProfileModel } from '../models/SellerProfile';
import { CategoryModel } from '../models/Category';
import { BrandModel } from '../models/Brand';
import { DeviceModel } from '../models/Device';
import { PartModel } from '../models/Part';
import { CompatibilityRecordModel } from '../models/CompatibilityRecord';
import { ListingModel } from '../models/Listing';
import { logger } from '../middleware/logger';
import { env } from '../config/env';

export async function bootstrapAdminUser(): Promise<{
  status: 'created' | 'updated' | 'conflict' | 'skipped';
  email?: string;
}> {
  const bootstrapEmail = (process.env.ADMIN_BOOTSTRAP_EMAIL ?? env.ADMIN_BOOTSTRAP_EMAIL)?.trim().toLowerCase();
  const bootstrapPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? env.ADMIN_BOOTSTRAP_PASSWORD;

  if (!bootstrapEmail || !bootstrapPassword) {
    return { status: 'skipped' };
  }

  const existingUser = await UserModel.findOne({ email: bootstrapEmail });
  if (existingUser) {
    if (existingUser.role === 'administrator' || existingUser.role === 'super_administrator') {
      const passwordHash = await bcrypt.hash(bootstrapPassword, 12);
      existingUser.passwordHash = passwordHash;
      existingUser.isActive = true;
      await existingUser.save();
      logger.info('Bootstrap administrator account verified/synchronized', { email: bootstrapEmail });
      return { status: 'updated', email: bootstrapEmail };
    } else {
      logger.warn(
        `Admin bootstrap conflict: account with email ${bootstrapEmail} already exists with non-admin role '${existingUser.role}'. Account will not be overwritten or silently promoted.`,
        { email: bootstrapEmail, existingRole: existingUser.role }
      );
      return { status: 'conflict', email: bootstrapEmail };
    }
  }

  const passwordHash = await bcrypt.hash(bootstrapPassword, 12);
  await UserModel.create({
    email: bootstrapEmail,
    fullName: 'System Administrator',
    passwordHash,
    role: 'administrator',
    isActive: true,
    isEmailVerified: true,
    tokenVersion: 0,
  });

  logger.info('Bootstrap administrator account created successfully', { email: bootstrapEmail });
  return { status: 'created', email: bootstrapEmail };
}

export async function seedCatalogueData(sellerUserId?: mongoose.Types.ObjectId) {
  // Bootstrap administrator from environment variables if configured
  await bootstrapAdminUser();

  // 0. Seed Default Test Accounts for Immediate Login
  const defaultPasswordHash = await bcrypt.hash('StrongPassword123!', 10);

  const adminUser = await UserModel.findOneAndUpdate(
    { email: 'admin@fixme.com' },
    {
      email: 'admin@fixme.com',
      fullName: 'System Administrator',
      passwordHash: defaultPasswordHash,
      role: 'administrator',
      isActive: true,
      tokenVersion: 0,
    },
    { upsert: true, new: true }
  );

  const sellerUser = await UserModel.findOneAndUpdate(
    { email: 'vendor@fixme.com' },
    {
      email: 'vendor@fixme.com',
      fullName: 'Apex Spares Vendor',
      passwordHash: defaultPasswordHash,
      role: 'seller',
      isActive: true,
      tokenVersion: 0,
    },
    { upsert: true, new: true }
  );

  await SellerProfileModel.findOneAndUpdate(
    { userId: sellerUser._id },
    {
      userId: sellerUser._id,
      storeName: 'Apex Circuit Spares',
      status: 'approved',
      gstin: '29ABCDE1234F1Z5',
      panNumber: 'ABCDE1234F',
      businessAddress: 'SP Road Electronics Market, Bengaluru 560002',
    },
    { upsert: true, new: true }
  );

  const customerUser = await UserModel.findOneAndUpdate(
    { email: 'customer@fixme.com' },
    {
      email: 'customer@fixme.com',
      fullName: 'Alex Rivera',
      passwordHash: defaultPasswordHash,
      role: 'customer',
      isActive: true,
      tokenVersion: 0,
    },
    { upsert: true, new: true }
  );

  const defaultSellerId = sellerUserId || sellerUser._id;

  // 1. Categories
  const smartphonesCategory = await CategoryModel.findOneAndUpdate(
    { slug: 'smartphones' },
    {
      name: 'Smartphones',
      slug: 'smartphones',
      description: 'OEM and replacement modules for mobile phones',
      sortOrder: 1,
      isActive: true,
    },
    { upsert: true, new: true }
  );

  const audioCategory = await CategoryModel.findOneAndUpdate(
    { slug: 'true-wireless-audio' },
    {
      name: 'True Wireless Audio',
      slug: 'true-wireless-audio',
      description: 'Single replacement earbuds, charging cases, and micro-batteries',
      sortOrder: 2,
      isActive: true,
    },
    { upsert: true, new: true }
  );

  // 2. Brands
  const appleBrand = await BrandModel.findOneAndUpdate(
    { slug: 'apple' },
    { name: 'Apple', slug: 'apple', isActive: true },
    { upsert: true, new: true }
  );

  const samsungBrand = await BrandModel.findOneAndUpdate(
    { slug: 'samsung' },
    { name: 'Samsung', slug: 'samsung', isActive: true },
    { upsert: true, new: true }
  );

  // 3. Canonical Devices
  const iphone13 = await DeviceModel.findOneAndUpdate(
    { brandId: appleBrand._id, modelNumber: 'A2633' },
    {
      brandId: appleBrand._id,
      categoryId: smartphonesCategory._id,
      modelName: 'iPhone 13',
      modelNumber: 'A2633',
      variant: '128GB / 256GB International',
      region: 'IN',
      releaseYear: 2021,
      isActive: true,
    },
    { upsert: true, new: true }
  );

  const airpodsPro2 = await DeviceModel.findOneAndUpdate(
    { brandId: appleBrand._id, modelNumber: 'A2931' },
    {
      brandId: appleBrand._id,
      categoryId: audioCategory._id,
      modelName: 'AirPods Pro (2nd Generation)',
      modelNumber: 'A2931',
      variant: 'Lightning / MagSafe Case',
      region: 'IN',
      releaseYear: 2022,
      isActive: true,
    },
    { upsert: true, new: true }
  );

  const galaxyS22Ultra = await DeviceModel.findOneAndUpdate(
    { brandId: samsungBrand._id, modelNumber: 'SM-S908E' },
    {
      brandId: samsungBrand._id,
      categoryId: smartphonesCategory._id,
      modelName: 'Galaxy S22 Ultra 5G',
      modelNumber: 'SM-S908E',
      variant: 'Snapdragon India Variant',
      region: 'IN',
      releaseYear: 2022,
      isActive: true,
    },
    { upsert: true, new: true }
  );

  // 4. Canonical Spare Parts (No price or stock on Part!)
  const iphone13OledPart = await PartModel.findOneAndUpdate(
    { partNumber: 'APL-IP13-OLED-661-21992' },
    {
      categoryId: smartphonesCategory._id,
      brandId: appleBrand._id,
      partNumber: 'APL-IP13-OLED-661-21992',
      name: 'iPhone 13 Super Retina XDR OLED Display Assembly',
      componentType: 'display',
      description:
        'Canonical 6.1-inch Super Retina XDR OLED panel with integrated digitizer flex cable and sensor bracket.',
      specifications: {
        diagonal: '6.1 inches',
        resolution: '2532 x 1170 px',
        connectorPins: '34-pin FPC + 16-pin touch FPC',
      },
      oemReference: '661-21992',
      isActive: true,
    },
    { upsert: true, new: true }
  );

  const airpodsPro2LeftBudPart = await PartModel.findOneAndUpdate(
    { partNumber: 'APL-APP2-L-A2699' },
    {
      categoryId: audioCategory._id,
      brandId: appleBrand._id,
      partNumber: 'APL-APP2-L-A2699',
      name: 'AirPods Pro 2nd Gen Left Replacement Earbud (Model A2699)',
      componentType: 'left_earbud',
      description:
        'Single left side replacement earbud with H2 chip for AirPods Pro 2nd Gen Lightning charging case.',
      specifications: {
        side: 'Left (L)',
        modelCode: 'A2699',
        chipset: 'Apple H2',
      },
      oemReference: 'A2699-L',
      isActive: true,
    },
    { upsert: true, new: true }
  );

  const s22UltraBatteryPart = await PartModel.findOneAndUpdate(
    { partNumber: 'SAM-S908-BAT-EB-BS908ABY' },
    {
      categoryId: smartphonesCategory._id,
      brandId: samsungBrand._id,
      partNumber: 'SAM-S908-BAT-EB-BS908ABY',
      name: 'Galaxy S22 Ultra 5000mAh Li-Ion Battery Pack',
      componentType: 'battery',
      description:
        'OEM specification 5000mAh internal battery module with pre-installed pull tab adhesive.',
      specifications: {
        capacity: '5000 mAh / 19.40 Wh',
        nominalVoltage: '3.88V',
      },
      oemReference: 'EB-BS908ABY',
      isActive: true,
    },
    { upsert: true, new: true }
  );

  // 5. Structured Compatibility Records
  await CompatibilityRecordModel.findOneAndUpdate(
    { deviceId: iphone13._id, partId: iphone13OledPart._id },
    {
      deviceId: iphone13._id,
      partId: iphone13OledPart._id,
      verificationStatus: 'verified',
      evidenceNotes:
        'Verified against Apple Service Manual 661-21992 for model A2633. True Tone requires serial transfer.',
      sourceType: 'manufacturer_datasheet',
    },
    { upsert: true, new: true }
  );

  await CompatibilityRecordModel.findOneAndUpdate(
    { deviceId: airpodsPro2._id, partId: airpodsPro2LeftBudPart._id },
    {
      deviceId: airpodsPro2._id,
      partId: airpodsPro2LeftBudPart._id,
      verificationStatus: 'verified',
      evidenceNotes:
        'A2699 Left Earbud pairs with A2931 Lightning Case and A2698 Right Earbud. Incompatible with USB-C A3048.',
      sourceType: 'teardown_verified',
    },
    { upsert: true, new: true }
  );

  await CompatibilityRecordModel.findOneAndUpdate(
    { deviceId: galaxyS22Ultra._id, partId: s22UltraBatteryPart._id },
    {
      deviceId: galaxyS22Ultra._id,
      partId: s22UltraBatteryPart._id,
      verificationStatus: 'verified',
      evidenceNotes:
        'Verified exact fitment for SM-S908E chassis and BMS connector.',
      sourceType: 'manufacturer_datasheet',
    },
    { upsert: true, new: true }
  );

  // 6. Seller Listings (All prices in integer paise)
  const listing1 = await ListingModel.findOneAndUpdate(
    { partId: iphone13OledPart._id, sellerId: defaultSellerId, condition: 'new' },
    {
      partId: iphone13OledPart._id,
      sellerId: defaultSellerId,
      sellerSku: 'IPH13-OLED-NEW',
      title: 'iPhone 13 Original Service Pack OLED Assembly (New)',
      description: 'Brand new sealed service pack display assembly with adhesive gasket.',
      condition: 'new',
      pricePaise: 1499900, // ₹14,999.00
      currency: 'INR',
      stockAvailable: 12,
      stockReserved: 0,
      warrantyDays: 180,
      status: 'active',
    },
    { upsert: true, new: true }
  );

  const listing2 = await ListingModel.findOneAndUpdate(
    { partId: airpodsPro2LeftBudPart._id, sellerId: defaultSellerId, condition: 'refurbished' },
    {
      partId: airpodsPro2LeftBudPart._id,
      sellerId: defaultSellerId,
      sellerSku: 'APP2-L-BUD-RF',
      title: 'Genuine Apple AirPods Pro 2 Left Earbud A2699 — Sanitized & Tested',
      description: 'Tested for ANC, transparency mode, and battery health > 95%.',
      condition: 'refurbished',
      pricePaise: 649900, // ₹6,499.00
      currency: 'INR',
      stockAvailable: 8,
      stockReserved: 0,
      warrantyDays: 90,
      status: 'active',
    },
    { upsert: true, new: true }
  );

  const listing3 = await ListingModel.findOneAndUpdate(
    { partId: s22UltraBatteryPart._id, sellerId: defaultSellerId, condition: 'new' },
    {
      partId: s22UltraBatteryPart._id,
      sellerId: defaultSellerId,
      sellerSku: 'S22U-BATT-NEW',
      title: 'Samsung S22 Ultra EB-BS908ABY 5000mAh Zero-Cycle Battery',
      description: 'Fresh production batch with adhesive strips included.',
      condition: 'new',
      pricePaise: 249900, // ₹2,499.00
      currency: 'INR',
      stockAvailable: 25,
      stockReserved: 0,
      warrantyDays: 180,
      status: 'active',
    },
    { upsert: true, new: true }
  );

  return {
    categories: [smartphonesCategory, audioCategory],
    brands: [appleBrand, samsungBrand],
    devices: [iphone13, airpodsPro2, galaxyS22Ultra],
    parts: [iphone13OledPart, airpodsPro2LeftBudPart, s22UltraBatteryPart],
    listings: [listing1, listing2, listing3],
  };
}

