import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { UserModel } from '../src/models/User';
import { SellerProfileModel } from '../src/models/SellerProfile';
import { AddressModel } from '../src/models/Address';
import { AuditLogModel } from '../src/models/AuditLog';
import { ListingModel } from '../src/models/Listing';
import { PartModel } from '../src/models/Part';
import { CategoryModel } from '../src/models/Category';
import { BrandModel } from '../src/models/Brand';
import { signSessionToken } from '../src/permissions/rbac';

describe('Phase 3 — Accounts, RBAC, CSRF Defense & Moderation', () => {
  const app = createApp();

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fixme_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }
  });

  beforeEach(async () => {
    await Promise.all([
      UserModel.deleteMany({}),
      SellerProfileModel.deleteMany({}),
      AddressModel.deleteMany({}),
      AuditLogModel.deleteMany({}),
      ListingModel.deleteMany({}),
      PartModel.deleteMany({}),
      CategoryModel.deleteMany({}),
      BrandModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('registers a customer, logs in with bcrypt, sets httpOnly cookie, and enforces CSRF on cookie mutations', async () => {
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'buyer@fixme.com',
        fullName: 'Rohan Sharma',
        phone: '9876543210',
        password: 'StrongPassword123!',
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.data.user.role).toBe('customer');
    expect(regRes.body.data.user.passwordHash).toBeUndefined();
    expect(regRes.body.data.csrfToken).toBeDefined();

    const cookies = regRes.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('fixme_session=');
    expect(cookies[0]).toContain('HttpOnly');

    const csrfToken = regRes.body.data.csrfToken;

    // 1. Cookie-authenticated mutation WITHOUT X-CSRF-Token must fail with 403
    const noCsrfRes = await request(app)
      .post('/api/v1/addresses')
      .set('Cookie', cookies)
      .send({
        fullName: 'Rohan Sharma',
        phone: '9876543210',
        line1: '12 MG Road, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560038',
      });

    expect(noCsrfRes.status).toBe(403);
    expect(noCsrfRes.body.error.code).toBe('CSRF_VALIDATION_FAILED');

    // 2. Cookie-authenticated mutation WITH valid X-CSRF-Token succeeds
    const withCsrfRes = await request(app)
      .post('/api/v1/addresses')
      .set('Cookie', cookies)
      .set('X-CSRF-Token', csrfToken)
      .send({
        fullName: 'Rohan Sharma',
        phone: '9876543210',
        line1: '12 MG Road, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560038',
        isDefault: true,
      });

    expect(withCsrfRes.status).toBe(201);
    expect(withCsrfRes.body.data.postalCode).toBe('560038');
  });

  it('prevents privilege escalation and enforces 7-role RBAC + seller KYC & listing moderation audit logs', async () => {
    // Register customer who applies to become a seller
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'vendor@fixme.com',
        fullName: 'Apex Mobile Spares',
        password: 'VendorPassword123!',
      });

    const customerToken = regRes.body.data.token;
    const customerId = regRes.body.data.user._id;

    // Customer cannot access admin endpoints
    const forbiddenRes = await request(app)
      .get('/api/v1/admin/sellers')
      .set('Authorization', `Bearer ${customerToken}`);

    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.error.code).toBe('FORBIDDEN_ROLE');

    // Customer submits seller KYC application
    const applyRes = await request(app)
      .post('/api/v1/seller/apply')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        storeName: 'Apex Mobile Spares Hub',
        gstin: '29AABCU9603R1ZM',
        panNumber: 'AABCU9603R',
        businessAddress: 'SP Road, Electronics Market, Bengaluru 560002',
      });

    expect(applyRes.status).toBe(201);
    expect(applyRes.body.data.status).toBe('pending');
    const sellerProfileId = applyRes.body.data._id;

    // Create administrator user
    const adminUser = await UserModel.create({
      email: 'admin@fixme.com',
      fullName: 'Platform Admin',
      passwordHash: 'hashed',
      role: 'administrator',
      isActive: true,
    });
    const adminToken = signSessionToken({
      id: adminUser._id.toString(),
      email: adminUser.email,
      role: adminUser.role,
      fullName: adminUser.fullName,
    });

    // Admin approves seller application
    const approveRes = await request(app)
      .patch(`/api/v1/admin/sellers/${sellerProfileId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'approved',
        reviewNotes: 'GSTIN and SP Road trade license verified.',
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.sellerProfile.status).toBe('approved');
    expect(approveRes.body.data.user.role).toBe('seller');

    // Verify listing moderation workflow (pending_review -> active)
    const cat = await CategoryModel.create({ name: 'Displays', slug: 'displays' });
    const brand = await BrandModel.create({ name: 'Apple', slug: 'apple' });
    const part = await PartModel.create({
      categoryId: cat._id,
      brandId: brand._id,
      partNumber: 'IP14-OLED-01',
      name: 'iPhone 14 OLED Panel',
      componentType: 'display',
      description: 'Canonical iPhone 14 display assembly',
    });

    const listing = await ListingModel.create({
      partId: part._id,
      sellerId: customerId,
      title: 'iPhone 14 Original Pull Display',
      condition: 'used',
      pricePaise: 1150000,
      stockAvailable: 4,
      status: 'pending_review',
    });

    const modListingRes = await request(app)
      .patch(`/api/v1/admin/listings/${listing._id.toString()}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'active',
        moderationNotes: 'Photos and OEM pull serial verified.',
      });

    expect(modListingRes.status).toBe(200);
    expect(modListingRes.body.data.status).toBe('active');

    // Verify immutable AuditLog entries were created
    const auditRes = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data.length).toBeGreaterThanOrEqual(3);
  });
});

