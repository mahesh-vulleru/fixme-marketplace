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
});

