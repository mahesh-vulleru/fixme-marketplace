import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { UserModel } from '../src/models/User';
import { OrderModel } from '../src/models/Order';
import { signSessionToken } from '../src/permissions/rbac';

describe('Phase 6 — Production Security Suite: IDOR, Privilege Escalation, CORS & Abuse Prevention', () => {
  const app = createApp();

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fixme_test';
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }
  });

  beforeEach(async () => {
    await Promise.all([UserModel.deleteMany({}), OrderModel.deleteMany({})]);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('blocks Insecure Direct Object Reference (IDOR) when customer B tries to read or return customer A’s order', async () => {
    const [customerA, customerB, seller] = await Promise.all([
      UserModel.create({
        email: 'a@fixme.com',
        fullName: 'Customer A',
        passwordHash: 'hash',
        role: 'customer',
      }),
      UserModel.create({
        email: 'b@fixme.com',
        fullName: 'Customer B',
        passwordHash: 'hash',
        role: 'customer',
      }),
      UserModel.create({
        email: 's@fixme.com',
        fullName: 'Seller',
        passwordHash: 'hash',
        role: 'seller',
      }),
    ]);

    const tokenB = signSessionToken({
      id: customerB._id.toString(),
      email: customerB.email,
      role: customerB.role,
      fullName: customerB.fullName,
    });

    const orderA = await OrderModel.create({
      orderNumber: 'FXM-IDOR-001',
      customerId: customerA._id,
      subOrders: [
        {
          sellerId: seller._id,
          items: [
            {
              listingId: new mongoose.Types.ObjectId(),
              partId: new mongoose.Types.ObjectId(),
              title: 'Private Order Item',
              condition: 'new',
              quantity: 1,
              unitPricePaise: 100000,
              lineTotalPaise: 100000,
            },
          ],
          subtotalPaise: 100000,
          platformFeePaise: 8000,
          sellerSettlementPaise: 92000,
          fulfillmentStatus: 'paid',
          payoutStatus: 'pending',
        },
      ],
      shippingAddress: {
        fullName: 'Customer A',
        phone: '9876543210',
        line1: 'Private Address',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'IN',
      },
      subtotalPaise: 100000,
      shippingPaise: 0,
      taxPaise: 18000,
      totalPaise: 118000,
      currency: 'INR',
      status: 'paid',
      reservationExpiresAt: new Date(Date.now() + 900000),
    });

    // Customer B attempts to view Customer A's order
    const getRes = await request(app)
      .get(`/api/v1/orders/${orderA._id.toString()}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(getRes.status).toBe(403);
    expect(getRes.body.error.code).toBe('OWNERSHIP_VIOLATION');

    // Customer B attempts to file a return on Customer A's order
    const retRes = await request(app)
      .post(`/api/v1/orders/${orderA._id.toString()}/returns`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        subOrderId: orderA.subOrders[0]._id.toString(),
        reason: 'Unauthorized IDOR return attempt',
      });

    expect(retRes.status).toBe(403);
    expect(retRes.body.error.code).toBe('OWNERSHIP_VIOLATION');
  });

  it('rejects executable file uploads and unauthorized CORS origins', async () => {
    // 1. Reject executable MIME type on upload-intent
    const exeRes = await request(app)
      .post('/api/v1/assets/upload-intent')
      .send({
        assetType: 'product_photo',
        mimeType: 'application/x-msdownload',
        sizeBytes: 1024,
      });

    expect(exeRes.status).toBe(400);
    expect(exeRes.body.error.code).toBe('VALIDATION_ERROR');

    // 2. Reject unauthorized CORS origin
    const corsRes = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'https://malicious-attacker.example.com');

    expect(corsRes.status).toBe(500);
  });

  it('enforces private access control on KYC and dispute evidence assets while keeping product photos public', async () => {
    const [owner, stranger, admin] = await Promise.all([
      UserModel.create({ email: 'owner@fixme.com', fullName: 'Doc Owner', passwordHash: 'hash', role: 'seller' }),
      UserModel.create({ email: 'stranger@fixme.com', fullName: 'Stranger', passwordHash: 'hash', role: 'customer' }),
      UserModel.create({ email: 'secadmin@fixme.com', fullName: 'Sec Admin', passwordHash: 'hash', role: 'administrator' }),
    ]);

    const ownerToken = signSessionToken({ id: owner._id.toString(), email: owner.email, role: owner.role, fullName: owner.fullName });
    const strangerToken = signSessionToken({ id: stranger._id.toString(), email: stranger.email, role: stranger.role, fullName: stranger.fullName });
    const adminToken = signSessionToken({ id: admin._id.toString(), email: admin.email, role: admin.role, fullName: admin.fullName });

    // Owner creates a private seller_document upload intent
    const intentRes = await request(app)
      .post('/api/v1/assets/upload-intent')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        assetType: 'seller_document',
        mimeType: 'image/png',
        sizeBytes: 40960,
      });

    expect(intentRes.status).toBe(201);
    expect(intentRes.body.data.asset.isPublic).toBe(false);
    expect(intentRes.body.data.asset.deliveryUrl).toBeUndefined();

    const assetId = intentRes.body.data.asset._id;

    // Complete the asset upload
    await request(app)
      .post(`/api/v1/assets/${assetId}/complete`)
      .set('Authorization', `Bearer ${ownerToken}`);

    // Stranger cannot access private KYC document (403 PRIVATE_ASSET_FORBIDDEN)
    const strangerAccessRes = await request(app)
      .get(`/api/v1/assets/${assetId}/access`)
      .set('Authorization', `Bearer ${strangerToken}`);

    expect(strangerAccessRes.status).toBe(403);
    expect(strangerAccessRes.body.error.code).toBe('PRIVATE_ASSET_FORBIDDEN');

    // Owner and Admin CAN obtain signed access URL
    const ownerAccessRes = await request(app)
      .get(`/api/v1/assets/${assetId}/access`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(ownerAccessRes.status).toBe(200);
    expect(ownerAccessRes.body.data.signedAccessUrl).toContain('sig=');

    const adminAccessRes = await request(app)
      .get(`/api/v1/assets/${assetId}/access`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminAccessRes.status).toBe(200);

    // Verify Seller Dashboard origin (http://localhost:5175) is allowed by CORS
    const sellerCorsRes = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'http://localhost:5175');
    expect(sellerCorsRes.status).toBe(200);
    expect(sellerCorsRes.headers['access-control-allow-origin']).toBe('http://localhost:5175');

    // Verify unapproved seller cannot create a listing via /api/v1/seller/listings
    const unapprovedCreateRes = await request(app)
      .post('/api/v1/seller/listings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        partId: new mongoose.Types.ObjectId().toString(),
        title: 'Unapproved Seller Listing Attempt',
        condition: 'new',
        pricePaise: 150000,
        stockAvailable: 5,
      });
    expect(unapprovedCreateRes.status).toBe(403);
    expect(unapprovedCreateRes.body.error.code).toBe('SELLER_NOT_APPROVED');
  });
});

