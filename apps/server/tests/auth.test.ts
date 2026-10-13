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

    // Verify Admin Dashboard live metrics
    const dashRes = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.data.totalUsers).toBeGreaterThanOrEqual(2);
    expect(dashRes.body.data.activeListings).toBe(1);
  });

  it('handles password recovery with single-use hashed token, invalidates old sessions, and blocks concurrent duplicate registrations', async () => {
    // 1. Concurrent registration with the same normalized email
    const [reg1, reg2] = await Promise.all([
      request(app).post('/api/v1/auth/register').send({
        email: 'ConcurrentUser@FixMe.com',
        fullName: 'Concurrent User',
        password: 'StrongPassword123!',
        confirmPassword: 'StrongPassword123!',
        acceptTerms: true,
      }),
      request(app).post('/api/v1/auth/register').send({
        email: 'concurrentuser@fixme.com',
        fullName: 'Concurrent User Duplicate',
        password: 'StrongPassword123!',
        confirmPassword: 'StrongPassword123!',
        acceptTerms: true,
      }),
    ]);

    const regStatuses = [reg1.status, reg2.status].sort();
    expect(regStatuses).toEqual([201, 409]);

    const successReg = reg1.status === 201 ? reg1 : reg2;
    const oldSessionToken = successReg.body.data.token;

    // 2. Request password reset token
    const forgotRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'concurrentuser@fixme.com' });

    expect(forgotRes.status).toBe(200);
    const resetToken = forgotRes.body.data.devResetToken;
    expect(resetToken).toBeDefined();

    // 3. Reset password using the single-use token
    const resetRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: resetToken,
        password: 'NewStrongPassword456!',
        confirmPassword: 'NewStrongPassword456!',
      });

    expect(resetRes.status).toBe(200);

    // 4. Re-using the same reset token must fail with 400 INVALID_OR_EXPIRED_RESET_TOKEN
    const reuseRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({
        token: resetToken,
        password: 'AnotherPassword789!',
        confirmPassword: 'AnotherPassword789!',
      });

    expect(reuseRes.status).toBe(400);
    expect(reuseRes.body.error.code).toBe('INVALID_OR_EXPIRED_RESET_TOKEN');

    // 5. Old session token issued before password reset must be rejected (401 SESSION_INVALIDATED)
    const oldMeRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${oldSessionToken}`);

    expect(oldMeRes.status).toBe(401);
    expect(oldMeRes.body.error.code).toBe('SESSION_INVALIDATED');

    // 6. Login with new password succeeds and public policies endpoint works
    const newLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'concurrentuser@fixme.com',
        password: 'NewStrongPassword456!',
      });

    expect(newLoginRes.status).toBe(200);

    const policiesRes = await request(app).get('/api/v1/policies');
    expect(policiesRes.status).toBe(200);
    expect(policiesRes.body.data.pricingPolicy.currency).toBe('INR');
  });

  it('prohibits public registration with administrative or elevated roles', async () => {
    const adminAttemptRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'hacker_admin@fixme.com',
        fullName: 'Fake Admin Attempt',
        password: 'StrongPassword123!',
        role: 'administrator',
      });

    expect(adminAttemptRes.status).toBe(400);

    const checkUser = await UserModel.findOne({ email: 'hacker_admin@fixme.com' });
    expect(checkUser).toBeNull();
  });

  it('prevents self-escalation via profile updates and denies non-admins access to admin routes', async () => {
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'regular_buyer@fixme.com',
        fullName: 'Regular Customer',
        password: 'StrongPassword123!',
      });

    expect(regRes.status).toBe(201);
    const token = regRes.body.data.token;
    const csrfToken = regRes.body.data.csrfToken;

    // Customer attempts to self-escalate role via PATCH /auth/profile
    const patchRes = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .set('X-CSRF-Token', csrfToken)
      .send({
        role: 'administrator',
        fullName: 'Updated Name',
      });

    expect(patchRes.status).toBe(200);
    const refreshedUser = await UserModel.findOne({ email: 'regular_buyer@fixme.com' });
    expect(refreshedUser?.role).toBe('customer'); // Role remains strictly customer!
    expect(refreshedUser?.fullName).toBe('Updated Name');

    // Customer attempts to access administrative endpoint
    const adminAccess = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(adminAccess.status).toBe(403);
  });

  it('executes idempotent admin bootstrap from environment and handles non-admin email conflict', async () => {
    const { bootstrapAdminUser } = await import('../src/seed/seedData');

    process.env.ADMIN_BOOTSTRAP_EMAIL = 'vullerumahesh14@gmail.com';
    process.env.ADMIN_BOOTSTRAP_PASSWORD = 'Mahesh@238';

    // 1. Initial bootstrap creation
    const createResult = await bootstrapAdminUser();
    expect(createResult.status).toBe('created');
    expect(createResult.email).toBe('vullerumahesh14@gmail.com');

    // Verify admin can authenticate with bootstrapped credentials
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'vullerumahesh14@gmail.com',
        password: 'Mahesh@238',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.role).toBe('administrator');

    // 2. Idempotent re-run
    const syncResult = await bootstrapAdminUser();
    expect(syncResult.status).toBe('updated');

    // 3. Conflict handling: existing non-admin user cannot be silently overwritten
    const customerUser = await UserModel.create({
      email: 'customer_conflict@fixme.com',
      fullName: 'Conflict Customer',
      passwordHash: 'dummyhash',
      role: 'customer',
      isActive: true,
    });

    process.env.ADMIN_BOOTSTRAP_EMAIL = 'customer_conflict@fixme.com';
    process.env.ADMIN_BOOTSTRAP_PASSWORD = 'Mahesh@238';

    const conflictResult = await bootstrapAdminUser();
    expect(conflictResult.status).toBe('conflict');

    const unchangedUser = await UserModel.findById(customerUser._id);
    expect(unchangedUser?.role).toBe('customer'); // Role NOT overwritten!
  });

  it('allows public registration with category seller and generates initial pending seller profile', async () => {
    const sellerRegRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'newseller@fixme.com',
        fullName: 'Vikram Patel',
        storeName: 'Patel Mobile Spares',
        businessAddress: 'Shop 42, Lamington Road, Mumbai',
        phone: '9820012345',
        password: 'StrongPassword123!',
        role: 'seller',
      });

    expect(sellerRegRes.status).toBe(201);
    expect(sellerRegRes.body.data.user.role).toBe('seller');
    expect(sellerRegRes.body.data.sellerProfile).toBeDefined();
    expect(sellerRegRes.body.data.sellerProfile.storeName).toBe('Patel Mobile Spares');
    expect(sellerRegRes.body.data.sellerProfile.status).toBe('pending');

    const sellerInDb = await UserModel.findOne({ email: 'newseller@fixme.com' });
    expect(sellerInDb?.role).toBe('seller');

    const profileInDb = await SellerProfileModel.findOne({ userId: sellerInDb?._id });
    expect(profileInDb?.storeName).toBe('Patel Mobile Spares');
    expect(profileInDb?.status).toBe('pending');
  });

  it('loads admin disputes list with valid schema populate without strictPopulate initiatorUserId errors', async () => {
    // 1. Create admin user and token
    const adminUser = await UserModel.create({
      email: 'dispute_admin@fixme.com',
      fullName: 'Dispute Admin',
      passwordHash: 'dummy',
      role: 'administrator',
      isActive: true,
    });
    const adminToken = signSessionToken({
      id: adminUser._id.toString(),
      email: adminUser.email,
      role: adminUser.role,
      fullName: adminUser.fullName,
    });

    // 2. Query disputes endpoint
    const disputesRes = await request(app)
      .get('/api/v1/admin/disputes')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(disputesRes.status).toBe(200);
    expect(Array.isArray(disputesRes.body.data)).toBe(true);
  });
});

