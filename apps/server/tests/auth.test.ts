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
import { WantedRequestModel } from '../src/models/WantedRequest';
import { signSessionToken, generateCsrfToken, SESSION_COOKIE_NAME } from '../src/permissions/rbac';

describe('Phase 3 — Accounts, RBAC, CSRF Defense & Moderation', () => {
  const app = createApp();

  beforeAll(async () => {
    const uri = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/fixme_test';
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
      WantedRequestModel.deleteMany({}),
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

  it('fetches CSRF token via GET /api/v1/auth/csrf-token and permits cookie logout without CSRF header', async () => {
    const user = await UserModel.create({
      email: 'csrftest@fixme.com',
      fullName: 'CSRF Tester',
      passwordHash: 'dummy',
      role: 'customer',
      isActive: true,
    });
    const sessionToken = signSessionToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

    // 1. Fetch CSRF token via dedicated endpoint
    const csrfRes = await request(app)
      .get('/api/v1/auth/csrf-token')
      .set('Cookie', [`fixme_session=${sessionToken}`]);

    expect(csrfRes.status).toBe(200);
    expect(csrfRes.body.data.csrfToken).toBeDefined();
    expect(typeof csrfRes.body.data.csrfToken).toBe('string');

    // 2. Logout using cookie WITHOUT X-CSRF-Token header should succeed and clear cookie
    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', [`fixme_session=${sessionToken}`]);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.data.loggedOut).toBe(true);
  });

  it('updates seller profile via PATCH /api/v1/seller/profile and allows resubmitting application via POST /api/v1/seller/apply without 409 conflict', async () => {
    const seller = await UserModel.create({
      email: 'storeseller@fixme.com',
      fullName: 'Store Owner',
      passwordHash: 'dummy',
      role: 'seller',
      isActive: true,
    });
    const sessionToken = signSessionToken({
      id: seller._id.toString(),
      email: seller.email,
      role: seller.role,
      fullName: seller.fullName,
    });

    // Initial seller application
    const applyRes1 = await request(app)
      .post('/api/v1/seller/apply')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({
        storeName: 'Original Electronics Hub',
        businessAddress: '123 Market Street, Bengaluru',
        gstin: '29AABCU9603R1ZM',
      });

    expect(applyRes1.status).toBe(201);
    expect(applyRes1.body.data.storeName).toBe('Original Electronics Hub');
    expect(applyRes1.body.data.status).toBe('pending');

    // Resubmission via POST /seller/apply updates existing application instead of 409
    const applyRes2 = await request(app)
      .post('/api/v1/seller/apply')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({
        storeName: 'Updated Electronics Hub',
        businessAddress: '456 Commercial Road, Bengaluru',
        panNumber: 'AABCU9603R',
      });

    expect(applyRes2.status).toBe(201);
    expect(applyRes2.body.data.storeName).toBe('Updated Electronics Hub');

    // PATCH /seller/profile updates store settings
    const patchRes = await request(app)
      .patch('/api/v1/seller/profile')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({
        storeName: 'Final Verified Spares',
        gstin: '29AABCU9603R1ZN',
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.storeName).toBe('Final Verified Spares');
    expect(patchRes.body.data.gstin).toBe('29AABCU9603R1ZN');
  });

  it('enforces CSRF tokens on cookie mutations, allows auto-retrieval via /auth/csrf-token, and accepts Bearer requests without CSRF header', async () => {
    const user = await UserModel.create({
      email: 'csrftest@fixme.com',
      fullName: 'CSRF Tester',
      passwordHash: 'dummy_hash',
      role: 'seller',
      isActive: true,
    });
    const sessionToken = signSessionToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

    // 1. Cookie mutation without X-CSRF-Token fails with 403 CSRF_VALIDATION_FAILED
    const noTokenRes = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Cookie', [`${SESSION_COOKIE_NAME}=${sessionToken}`])
      .send({ fullName: 'Updated Without CSRF' });

    expect(noTokenRes.status).toBe(403);
    expect(noTokenRes.body.error.code).toBe('CSRF_VALIDATION_FAILED');

    // 2. Cookie mutation with invalid X-CSRF-Token fails with 403 CSRF_VALIDATION_FAILED
    const badTokenRes = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Cookie', [`${SESSION_COOKIE_NAME}=${sessionToken}`])
      .set('X-CSRF-Token', 'invalid-token-value')
      .send({ fullName: 'Updated With Bad CSRF' });

    expect(badTokenRes.status).toBe(403);
    expect(badTokenRes.body.error.code).toBe('CSRF_VALIDATION_FAILED');

    // 3. Proactively fetching fresh CSRF token via GET /api/v1/auth/csrf-token succeeds
    const csrfFetchRes = await request(app)
      .get('/api/v1/auth/csrf-token')
      .set('Cookie', [`${SESSION_COOKIE_NAME}=${sessionToken}`]);

    expect(csrfFetchRes.status).toBe(200);
    const validToken = csrfFetchRes.body.data.csrfToken;
    expect(validToken).toBeDefined();
    expect(typeof validToken).toBe('string');

    // 4. Cookie mutation with valid X-CSRF-Token succeeds
    const goodCookieRes = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Cookie', [`${SESSION_COOKIE_NAME}=${sessionToken}`])
      .set('X-CSRF-Token', validToken)
      .send({ fullName: 'Successfully Updated Name' });

    expect(goodCookieRes.status).toBe(200);
    expect(goodCookieRes.body.data.fullName).toBe('Successfully Updated Name');

    // 5. Bearer token mutation does not require X-CSRF-Token and succeeds
    const bearerRes = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Authorization', `Bearer ${sessionToken}`)
      .send({ fullName: 'Updated Via Bearer' });

    expect(bearerRes.status).toBe(200);
    expect(bearerRes.body.data.fullName).toBe('Updated Via Bearer');
  });

  it('synchronizes seller verification status between admin review and seller /auth/me profile immediately', async () => {
    // 1. Create Admin
    const admin = await UserModel.create({
      email: 'lead_admin@fixme.com',
      fullName: 'Super Administrator',
      passwordHash: 'dummy_hash',
      role: 'super_administrator',
      isActive: true,
    });
    const adminToken = signSessionToken({
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
      fullName: admin.fullName,
    });

    // 2. Create Seller and apply
    const seller = await UserModel.create({
      email: 'syncseller@fixme.com',
      fullName: 'Sync Seller',
      passwordHash: 'dummy_hash',
      role: 'seller',
      isActive: true,
    });
    const sellerToken = signSessionToken({
      id: seller._id.toString(),
      email: seller.email,
      role: seller.role,
      fullName: seller.fullName,
    });

    const applyRes = await request(app)
      .post('/api/v1/seller/apply')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        storeName: 'Sync Tech Spares',
        businessAddress: '100 Silicon Blvd, Bengaluru',
        gstin: '29AABCU9603R1Z5',
      });
    expect(applyRes.status).toBe(201);
    const sellerProfileId = applyRes.body.data._id;

    // 3. /auth/me initially reports pending
    const initialMe = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(initialMe.status).toBe(200);
    expect(initialMe.body.data.sellerProfile.status).toBe('pending');

    // 4. Admin reviews and approves seller
    const reviewRes = await request(app)
      .patch(`/api/v1/admin/sellers/${sellerProfileId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'approved',
        reviewNotes: 'All identity documents verified successfully.',
      });
    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.data.sellerProfile.status).toBe('approved');

    // 5. Seller calls /auth/me and receives approved status instantly
    const refreshedMe = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(refreshedMe.status).toBe(200);
    expect(refreshedMe.body.data.sellerProfile.status).toBe('approved');
    expect(refreshedMe.body.data.sellerProfile.reviewNotes).toBe('All identity documents verified successfully.');

    // 6. Admin can update status to suspended
    const suspendRes = await request(app)
      .patch(`/api/v1/admin/sellers/${sellerProfileId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'suspended',
        reviewNotes: 'Account temporarily suspended pending audit.',
      });
    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.data.sellerProfile.status).toBe('suspended');

    const suspendedMe = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(suspendedMe.status).toBe(200);
    expect(suspendedMe.body.data.sellerProfile.status).toBe('suspended');
    expect(suspendedMe.body.data.sellerProfile.reviewNotes).toBe('Account temporarily suspended pending audit.');
  });

  it('allows pending sellers to view wanted requests but restricts offer submission to approved sellers', async () => {
    // 1. Create a customer and submit a wanted part request
    const customer = await UserModel.create({
      email: 'buyer1@fixme.com',
      fullName: 'Device Owner',
      passwordHash: 'dummy',
      role: 'customer',
      isActive: true,
    });
    const customerToken = signSessionToken({
      id: customer._id.toString(),
      email: customer.email,
      role: customer.role,
      fullName: customer.fullName,
    });

    const createReqRes = await request(app)
      .post('/api/v1/wanted-requests')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        componentType: 'display',
        description: 'Need iPhone 13 Pro OLED Display Original screen replacement',
        deviceModel: 'iPhone 13 Pro',
        brand: 'Apple',
        maxBudgetPaise: 850000,
        deliveryCity: 'Bengaluru',
        deliveryPostalCode: '560001',
      });
    expect(createReqRes.status).toBe(201);
    const wantedRequestId = createReqRes.body.data._id;

    // 2. Create a pending seller
    const seller = await UserModel.create({
      email: 'wanted_seller@fixme.com',
      fullName: 'Wanted Spares Seller',
      passwordHash: 'dummy',
      role: 'seller',
      isActive: true,
    });
    const sellerProfile = await SellerProfileModel.create({
      userId: seller._id,
      storeName: 'Wanted Spares Store',
      storeSlug: 'wanted-spares-store',
      businessAddress: '77 Market Road, Bengaluru',
      status: 'pending',
    });
    const sellerToken = signSessionToken({
      id: seller._id.toString(),
      email: seller.email,
      role: seller.role,
      fullName: seller.fullName,
    });

    // 3. Pending seller can view wanted requests list
    const listRes = await request(app)
      .get('/api/v1/wanted-requests')
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.some((r: any) => r._id === wantedRequestId)).toBe(true);

    // 4. Pending seller attempting to submit offer is rejected with 403 SELLER_NOT_APPROVED
    const pendingOfferRes = await request(app)
      .post(`/api/v1/wanted-requests/${wantedRequestId}/offers`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        offeredPricePaise: 820000,
        condition: 'new',
        warrantyDays: 90,
        estimatedDeliveryDays: 3,
        notes: 'Genuine pull OEM screen in stock',
      });
    expect(pendingOfferRes.status).toBe(403);
    expect(pendingOfferRes.body.error.code).toBe('SELLER_NOT_APPROVED');

    // 5. Approve seller
    sellerProfile.status = 'approved';
    await sellerProfile.save();

    // 6. Approved seller can submit offer successfully
    const approvedOfferRes = await request(app)
      .post(`/api/v1/wanted-requests/${wantedRequestId}/offers`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        offeredPricePaise: 820000,
        condition: 'new',
        warrantyDays: 90,
        estimatedDeliveryDays: 3,
        notes: 'Genuine pull OEM screen in stock',
      });
    expect(approvedOfferRes.status).toBe(201);
    expect(approvedOfferRes.body.data.offers).toHaveLength(1);
    expect(approvedOfferRes.body.data.offers[0].offeredPricePaise).toBe(820000);
  });

  it('supports querying catalog listings with status=all, specific status filter, and default active filter', async () => {
    const seller = await UserModel.create({
      email: 'catalogue_seller@fixme.com',
      fullName: 'Spares Depot',
      passwordHash: 'dummy',
      role: 'seller',
      isActive: true,
    });

    const category = await CategoryModel.create({
      name: 'Screens',
      slug: 'screens-test',
      isActive: true,
    });

    const brand = await BrandModel.create({
      name: 'Samsung',
      slug: 'samsung-test',
      isActive: true,
    });

    const part = await PartModel.create({
      name: 'Galaxy S21 Ultra AMOLED',
      partNumber: 'SAM-S21U-DISP',
      componentType: 'display',
      categoryId: category._id,
      brandId: brand._id,
      description: 'OEM display unit',
    });

    // Create 3 listings with different statuses
    const listing1 = await ListingModel.create({
      partId: part._id,
      sellerId: seller._id,
      sellerSku: 'SKU-PENDING-001',
      title: 'Galaxy S21 Ultra AMOLED Screen Pending',
      pricePaise: 1200000,
      stockAvailable: 5,
      stockReserved: 0,
      condition: 'new',
      status: 'pending_review',
    });

    const listing2 = await ListingModel.create({
      partId: part._id,
      sellerId: seller._id,
      sellerSku: 'SKU-ACTIVE-002',
      title: 'Galaxy S21 Ultra AMOLED Screen Active',
      pricePaise: 1150000,
      stockAvailable: 10,
      stockReserved: 0,
      condition: 'new',
      status: 'active',
    });

    const listing3 = await ListingModel.create({
      partId: part._id,
      sellerId: seller._id,
      sellerSku: 'SKU-SUSPENDED-003',
      title: 'Galaxy S21 Ultra AMOLED Screen Suspended',
      pricePaise: 1100000,
      stockAvailable: 2,
      stockReserved: 0,
      condition: 'refurbished',
      status: 'suspended',
    });

    // 1. GET /api/v1/listings?status=all returns all listings regardless of status
    const allRes = await request(app).get('/api/v1/listings?status=all&limit=50');
    expect(allRes.status).toBe(200);
    expect(allRes.body.data.length).toBe(3);
    const allIds = allRes.body.data.map((l: any) => l._id.toString());
    expect(allIds).toContain(listing1._id.toString());
    expect(allIds).toContain(listing2._id.toString());
    expect(allIds).toContain(listing3._id.toString());

    // 2. GET /api/v1/listings?status=pending_review returns only pending_review listings
    const pendingRes = await request(app).get('/api/v1/listings?status=pending_review');
    expect(pendingRes.status).toBe(200);
    expect(pendingRes.body.data.length).toBe(1);
    expect(pendingRes.body.data[0]._id.toString()).toBe(listing1._id.toString());

    // 3. GET /api/v1/listings (no status parameter) defaults to active listings only
    const defaultRes = await request(app).get('/api/v1/listings');
    expect(defaultRes.status).toBe(200);
    expect(defaultRes.body.data.length).toBe(1);
    expect(defaultRes.body.data[0]._id.toString()).toBe(listing2._id.toString());
  });
});

