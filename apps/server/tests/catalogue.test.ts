import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { CategoryModel } from '../src/models/Category';
import { BrandModel } from '../src/models/Brand';
import { DeviceModel } from '../src/models/Device';
import { PartModel } from '../src/models/Part';
import { CompatibilityRecordModel } from '../src/models/CompatibilityRecord';
import { ListingModel } from '../src/models/Listing';
import { AssetModel } from '../src/models/Asset';
import { UserModel } from '../src/models/User';
import { signSessionToken } from '../src/permissions/rbac';
import { seedCatalogueData } from '../src/seed/seedData';

describe('Phase 2 — Catalogue, Structured Compatibility & Image Storage', () => {
  const app = createApp();

  const originalStorageProvider = process.env.STORAGE_PROVIDER;

  beforeAll(async () => {
    process.env.STORAGE_PROVIDER = 'local';
    const uri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/fixme_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }
  });

  beforeEach(async () => {
    await Promise.all([
      CategoryModel.deleteMany({}),
      BrandModel.deleteMany({}),
      DeviceModel.deleteMany({}),
      PartModel.deleteMany({}),
      CompatibilityRecordModel.deleteMany({}),
      ListingModel.deleteMany({}),
      AssetModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    if (originalStorageProvider !== undefined) {
      process.env.STORAGE_PROVIDER = originalStorageProvider;
    } else {
      delete process.env.STORAGE_PROVIDER;
    }
    await mongoose.connection.close();
  });

  it('seeds verified catalogue data and retrieves categories, brands, devices, and parts', async () => {
    const seeded = await seedCatalogueData();
    expect(seeded.devices.length).toBe(3);
    expect(seeded.parts.length).toBe(3);

    const catRes = await request(app).get('/api/v1/categories');
    expect(catRes.status).toBe(200);
    expect(catRes.body.data.length).toBe(2);

    const devRes = await request(app).get('/api/v1/devices?q=A2633');
    expect(devRes.status).toBe(200);
    expect(devRes.body.data.length).toBe(1);
    expect(devRes.body.data[0].modelName).toBe('iPhone 13');
  });

  it('verifies compatibility strictly via compatibilityRecords (never guessing from titles)', async () => {
    const seeded = await seedCatalogueData();
    const iphone13 = seeded.devices[0];
    const iphone13Oled = seeded.parts[0];
    const s22Battery = seeded.parts[2];

    // 1. Verified compatible pair
    const okRes = await request(app)
      .post('/api/v1/compatibility/check')
      .send({
        deviceId: iphone13._id.toString(),
        partId: iphone13Oled._id.toString(),
      });

    expect(okRes.status).toBe(200);
    expect(okRes.body.data.compatible).toBe(true);
    expect(okRes.body.data.verificationStatus).toBe('verified');
    expect(okRes.body.data.matchingListingsCount).toBeGreaterThanOrEqual(1);

    // 2. Unlinked pair must return compatible: false and verificationStatus: 'not_found'
    const badRes = await request(app)
      .post('/api/v1/compatibility/check')
      .send({
        deviceId: iphone13._id.toString(),
        partId: s22Battery._id.toString(),
      });

    expect(badRes.status).toBe(200);
    expect(badRes.body.data.compatible).toBe(false);
    expect(badRes.body.data.verificationStatus).toBe('not_found');

    // 3. GET /api/v1/devices/:id/parts returns compatible parts + lowestPricePaise
    const devPartsRes = await request(app).get(
      `/api/v1/devices/${iphone13._id.toString()}/parts`
    );
    expect(devPartsRes.status).toBe(200);
    expect(devPartsRes.body.data.compatibleParts.length).toBe(1);
    expect(devPartsRes.body.data.compatibleParts[0].lowestPricePaise).toBe(1499900);
  });

  it('enforces integer pricePaise on listings and rejects floating-point prices', async () => {
    const seeded = await seedCatalogueData();
    const partId = seeded.parts[0]._id.toString();

    // Reject float pricePaise
    const floatRes = await request(app)
      .post('/api/v1/listings')
      .send({
        partId,
        title: 'Invalid Float Price Listing',
        condition: 'new',
        pricePaise: 1499.99,
        stockAvailable: 5,
        warrantyDays: 90,
      });

    expect(floatRes.status).toBe(400);
    expect(floatRes.body.error.code).toBe('VALIDATION_ERROR');

    // Accept integer pricePaise
    const intRes = await request(app)
      .post('/api/v1/listings')
      .send({
        partId,
        title: 'Valid Integer Paise Listing',
        condition: 'new',
        pricePaise: 149999,
        stockAvailable: 5,
        warrantyDays: 90,
      });

    expect(intRes.status).toBe(201);
    expect(intRes.body.data.pricePaise).toBe(149999);
    expect(intRes.body.data.status).toBe('pending_review');
  });

  it('handles asset upload-intent and completion without storing binary buffers in MongoDB', async () => {
    const intentRes = await request(app)
      .post('/api/v1/assets/upload-intent')
      .send({
        assetType: 'product_photo',
        mimeType: 'image/webp',
        sizeBytes: 245000,
      });

    expect(intentRes.status).toBe(201);
    expect(intentRes.body.data.uploadUrl).toContain('upload');
    expect(intentRes.body.data.asset.storageKey).toMatch(/^product_photo\//);
    expect(intentRes.body.data.asset.status).toBe('pending');

    const assetId = intentRes.body.data.asset._id;
    const completeRes = await request(app).post(`/api/v1/assets/${assetId}/complete`);
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.status).toBe('ready');

    // Reject oversized file (> 10MB)
    const oversizedRes = await request(app)
      .post('/api/v1/assets/upload-intent')
      .send({
        assetType: 'product_photo',
        mimeType: 'image/png',
        sizeBytes: 15 * 1024 * 1024,
      });
    expect(oversizedRes.status).toBe(400);
  });

  it('implements local file storage, accepts binary PUT /upload-put, serves public assets, and deletes safely', async () => {
    const user = await UserModel.create({
      email: 'storage_owner@fixme.com',
      fullName: 'Storage Owner',
      passwordHash: 'dummy',
      role: 'seller',
      isActive: true,
    });
    const token = signSessionToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

    // 1. Create upload intent
    const fileBytes = Buffer.from('FixMe-Sample-Image-Data-1234567890');
    const intentRes = await request(app)
      .post('/api/v1/assets/upload-intent')
      .set('Authorization', `Bearer ${token}`)
      .send({
        assetType: 'product_photo',
        mimeType: 'image/png',
        sizeBytes: fileBytes.length,
      });

    expect(intentRes.status).toBe(201);
    const assetId = intentRes.body.data.asset._id;
    const storageKey = intentRes.body.data.asset.storageKey;
    const uploadUrl = intentRes.body.data.uploadUrl;
    expect(uploadUrl).toContain('/api/v1/assets/upload-put');

    // 2. Extract path & query parameters from uploadUrl to call via supertest
    const urlObj = new URL(uploadUrl);
    const relativePutPath = `${urlObj.pathname}${urlObj.search}`;

    // 3. Upload binary file via PUT /upload-put
    const putRes = await request(app)
      .put(relativePutPath)
      .set('Content-Type', 'image/png')
      .send(fileBytes);

    expect(putRes.status).toBe(200);
    expect(putRes.body.success).toBe(true);

    // 4. Complete upload
    const completeRes = await request(app).post(`/api/v1/assets/${assetId}/complete`);
    expect(completeRes.status).toBe(200);

    // 5. Serve public asset
    const serveRes = await request(app).get(`/api/v1/assets/public/${storageKey}`);
    expect(serveRes.status).toBe(200);
    expect(serveRes.headers['content-type']).toContain('image/png');
    expect(serveRes.body).toEqual(fileBytes);

    // 6. Path traversal attempt is blocked
    const traversalRes = await request(app).get('/api/v1/assets/public/..%2F..%2Fetc%2Fpasswd');
    expect([400, 404]).toContain(traversalRes.status);

    // 7. Delete asset (authenticated as owner)
    const deleteRes = await request(app)
      .delete(`/api/v1/assets/${assetId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(200);

    // 8. Subsequent GET returns 404
    const notFoundRes = await request(app).get(`/api/v1/assets/public/${storageKey}`);
    expect(notFoundRes.status).toBe(404);
  });
});

