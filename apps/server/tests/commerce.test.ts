import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { UserModel } from '../src/models/User';
import { CategoryModel } from '../src/models/Category';
import { BrandModel } from '../src/models/Brand';
import { PartModel } from '../src/models/Part';
import { ListingModel } from '../src/models/Listing';
import { CartModel } from '../src/models/Cart';
import { OrderModel } from '../src/models/Order';
import { PaymentModel } from '../src/models/Payment';
import { InventoryMovementModel } from '../src/models/InventoryMovement';
import { ReturnRequestModel } from '../src/models/ReturnRequest';
import { RefundModel } from '../src/models/Refund';
import { signSessionToken } from '../src/permissions/rbac';
import { PaymentGateway } from '../src/integrations/payments/paymentGateway';
import { CommerceService } from '../src/services/commerceService';

describe('Phase 4 — Commerce: Server-Recalculated Cart, Atomic Stock, Multi-Seller Orders & Idempotent Webhooks', () => {
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
      CategoryModel.deleteMany({}),
      BrandModel.deleteMany({}),
      PartModel.deleteMany({}),
      ListingModel.deleteMany({}),
      CartModel.deleteMany({}),
      OrderModel.deleteMany({}),
      PaymentModel.deleteMany({}),
      InventoryMovementModel.deleteMany({}),
      ReturnRequestModel.deleteMany({}),
      RefundModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('recalculates multi-seller cart in integer paise, splits subOrders, and processes idempotent payment webhooks', async () => {
    const [buyer, sellerA, sellerB, admin] = await Promise.all([
      UserModel.create({
        email: 'buyer@fixme.com',
        fullName: 'Buyer One',
        passwordHash: 'hash',
        role: 'customer',
      }),
      UserModel.create({
        email: 'sellerA@fixme.com',
        fullName: 'Seller A',
        passwordHash: 'hash',
        role: 'seller',
      }),
      UserModel.create({
        email: 'sellerB@fixme.com',
        fullName: 'Seller B',
        passwordHash: 'hash',
        role: 'seller',
      }),
      UserModel.create({
        email: 'admin@fixme.com',
        fullName: 'Admin One',
        passwordHash: 'hash',
        role: 'administrator',
      }),
    ]);

    const buyerToken = signSessionToken({
      id: buyer._id.toString(),
      email: buyer.email,
      role: buyer.role,
      fullName: buyer.fullName,
    });
    const adminToken = signSessionToken({
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
      fullName: admin.fullName,
    });

    const cat = await CategoryModel.create({ name: 'Audio', slug: 'audio' });
    const brand = await BrandModel.create({ name: 'Apple', slug: 'apple' });
    const part = await PartModel.create({
      categoryId: cat._id,
      brandId: brand._id,
      partNumber: 'APP2-CASE-01',
      name: 'AirPods Pro 2 Charging Case',
      componentType: 'charging_case',
      description: 'Replacement charging case',
    });

    const [listingA, listingB] = await Promise.all([
      ListingModel.create({
        partId: part._id,
        sellerId: sellerA._id,
        title: 'AirPods Pro 2 Case — Seller A',
        condition: 'new',
        pricePaise: 500000, // ₹5,000.00
        stockAvailable: 5,
        status: 'active',
      }),
      ListingModel.create({
        partId: part._id,
        sellerId: sellerB._id,
        title: 'AirPods Pro 2 Case — Seller B',
        condition: 'refurbished',
        pricePaise: 300000, // ₹3,000.00
        stockAvailable: 3,
        status: 'active',
      }),
    ]);

    // Add both listings to buyer's cart
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ listingId: listingA._id.toString(), quantity: 1 });

    const cartRes = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ listingId: listingB._id.toString(), quantity: 2 });

    expect(cartRes.status).toBe(200);
    // Subtotal = 500000 + (300000 * 2) = 1100000 paise (₹11,000.00)
    expect(cartRes.body.data.subtotalPaise).toBe(1100000);
    expect(cartRes.body.data.shippingPaise).toBe(0); // Free shipping above ₹2,000
    expect(cartRes.body.data.taxPaise).toBe(198000); // 18% GST = 198000 paise
    expect(cartRes.body.data.totalPaise).toBe(1298000);

    // Checkout creates 1 parent Order with 2 seller subOrders and reserves stock
    const checkoutRes = await request(app)
      .post('/api/v1/checkout')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        shippingAddress: {
          fullName: 'Buyer One',
          phone: '9876543210',
          line1: '100 100ft Road, Indiranagar',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560038',
          country: 'IN',
        },
      });

    expect(checkoutRes.status).toBe(201);
    const { order, paymentIntent } = checkoutRes.body.data;
    expect(order.subOrders.length).toBe(2);
    expect(order.totalPaise).toBe(1298000);

    // Verify stock is reserved in DB
    const updatedA = await ListingModel.findById(listingA._id);
    expect(updatedA?.stockAvailable).toBe(4);
    expect(updatedA?.stockReserved).toBe(1);

    // 1. Reject webhook with invalid signature
    const webhookPayload = {
      eventId: 'evt_capture_001',
      eventType: 'payment.captured' as const,
      providerOrderId: paymentIntent.providerOrderId,
      providerPaymentId: 'pay_rzp_9991',
      amountPaise: order.totalPaise,
    };

    const badSigRes = await request(app)
      .post('/api/v1/webhooks/payments/razorpay_sandbox')
      .set('X-Webhook-Signature', 'invalid_signature')
      .send(webhookPayload);

    expect(badSigRes.status).toBe(401);

    // 2. Valid signed webhook captures payment and commits reserved stock
    const validSig = PaymentGateway.signWebhookPayload(JSON.stringify(webhookPayload));
    const okHookRes = await request(app)
      .post('/api/v1/webhooks/payments/razorpay_sandbox')
      .set('X-Webhook-Signature', validSig)
      .send(webhookPayload);

    expect(okHookRes.status).toBe(200);
    expect(okHookRes.body.data.idempotentReplay).toBe(false);
    expect(okHookRes.body.data.order.status).toBe('paid');

    const committedA = await ListingModel.findById(listingA._id);
    expect(committedA?.stockAvailable).toBe(4);
    expect(committedA?.stockReserved).toBe(0);

    // 3. Duplicate webhook delivery is idempotent and does NOT double-decrement stockReserved
    const replayHookRes = await request(app)
      .post('/api/v1/webhooks/payments/razorpay_sandbox')
      .set('X-Webhook-Signature', validSig)
      .send(webhookPayload);

    expect(replayHookRes.status).toBe(200);
    expect(replayHookRes.body.data.idempotentReplay).toBe(true);

    const afterReplayA = await ListingModel.findById(listingA._id);
    expect(afterReplayA?.stockReserved).toBe(0);

    // 4. Request return and process integer-paise refund
    const subOrderId = order.subOrders[0]._id;
    const returnRes = await request(app)
      .post(`/api/v1/orders/${order._id}/returns`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        subOrderId,
        reason: 'Connector flex cable had bent pin on arrival',
      });

    expect(returnRes.status).toBe(201);
    const returnId = returnRes.body.data._id;

    const refundRes = await request(app)
      .patch(`/api/v1/returns/${returnId}/process`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        approve: true,
        resolutionNotes: 'Verified bent pin from unboxing photo; full suborder refund issued.',
      });

    expect(refundRes.status).toBe(200);
    expect(refundRes.body.data.returnRequest.status).toBe('refunded');
    expect(refundRes.body.data.refund.amountPaise).toBe(order.subOrders[0].subtotalPaise);
  });

  it('prevents overselling when two buyers concurrently checkout the last unit in stock and releases expired reservations', async () => {
    const [buyer1, buyer2, seller] = await Promise.all([
      UserModel.create({
        email: 'b1@fixme.com',
        fullName: 'Buyer 1',
        passwordHash: 'hash',
        role: 'customer',
      }),
      UserModel.create({
        email: 'b2@fixme.com',
        fullName: 'Buyer 2',
        passwordHash: 'hash',
        role: 'customer',
      }),
      UserModel.create({
        email: 'seller@fixme.com',
        fullName: 'Seller',
        passwordHash: 'hash',
        role: 'seller',
      }),
    ]);

    const token1 = signSessionToken({
      id: buyer1._id.toString(),
      email: buyer1.email,
      role: buyer1.role,
      fullName: buyer1.fullName,
    });
    const token2 = signSessionToken({
      id: buyer2._id.toString(),
      email: buyer2.email,
      role: buyer2.role,
      fullName: buyer2.fullName,
    });

    const cat = await CategoryModel.create({ name: 'Boards', slug: 'boards' });
    const brand = await BrandModel.create({ name: 'Samsung', slug: 'samsung' });
    const part = await PartModel.create({
      categoryId: cat._id,
      brandId: brand._id,
      partNumber: 'S22U-SUB-PCB',
      name: 'S22 Ultra USB-C Charging Sub-Board',
      componentType: 'charging_port',
      description: 'Original charging port sub-board',
    });

    // Only 1 unit in stock!
    const lastUnitListing = await ListingModel.create({
      partId: part._id,
      sellerId: seller._id,
      title: 'Last Unit S22 Ultra Sub-Board',
      condition: 'new',
      pricePaise: 189900,
      stockAvailable: 1,
      status: 'active',
    });

    // Both buyers add the last unit to their carts
    await Promise.all([
      request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${token1}`)
        .send({ listingId: lastUnitListing._id.toString(), quantity: 1 }),
      request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${token2}`)
        .send({ listingId: lastUnitListing._id.toString(), quantity: 1 }),
    ]);

    const addressPayload = {
      shippingAddress: {
        fullName: 'Concurrent Buyer',
        phone: '9876543210',
        line1: '22 Residency Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560025',
        country: 'IN',
      },
    };

    // Fire both checkouts concurrently
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${token1}`)
        .send(addressPayload),
      request(app)
        .post('/api/v1/checkout')
        .set('Authorization', `Bearer ${token2}`)
        .send(addressPayload),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([201, 409]);

    const afterRaceListing = await ListingModel.findById(lastUnitListing._id);
    expect(afterRaceListing?.stockAvailable).toBe(0);
    expect(afterRaceListing?.stockReserved).toBe(1);

    // Simulate reservation expiry and verify stock is released back to stockAvailable = 1
    await OrderModel.updateMany({}, { $set: { reservationExpiresAt: new Date(Date.now() - 60000) } });
    const expiredCount = await CommerceService.expireOverdueReservations(new Date());
    expect(expiredCount).toBe(1);

    const releasedListing = await ListingModel.findById(lastUnitListing._id);
    expect(releasedListing?.stockAvailable).toBe(1);
    expect(releasedListing?.stockReserved).toBe(0);
  });
});

