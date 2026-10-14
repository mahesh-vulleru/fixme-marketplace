import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { UserModel } from '../src/models/User';
import { SellerProfileModel } from '../src/models/SellerProfile';
import { CategoryModel } from '../src/models/Category';
import { BrandModel } from '../src/models/Brand';
import { DeviceModel } from '../src/models/Device';
import { PartModel } from '../src/models/Part';
import { ListingModel } from '../src/models/Listing';
import { OrderModel } from '../src/models/Order';
import { ShipmentModel } from '../src/models/Shipment';
import { InventoryMovementModel } from '../src/models/InventoryMovement';
import { ReviewModel } from '../src/models/Review';
import { WantedRequestModel } from '../src/models/WantedRequest';
import { DisputeModel } from '../src/models/Dispute';
import { NotificationModel } from '../src/models/Notification';
import { signSessionToken } from '../src/permissions/rbac';

describe('Phase 5 — Seller Operations, Inventory Ledger, Shipments, Payouts, Verified Reviews, Wanted Parts & Disputes', () => {
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
      CategoryModel.deleteMany({}),
      BrandModel.deleteMany({}),
      DeviceModel.deleteMany({}),
      PartModel.deleteMany({}),
      ListingModel.deleteMany({}),
      OrderModel.deleteMany({}),
      ShipmentModel.deleteMany({}),
      InventoryMovementModel.deleteMany({}),
      ReviewModel.deleteMany({}),
      WantedRequestModel.deleteMany({}),
      DisputeModel.deleteMany({}),
      NotificationModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('adjusts seller inventory with InventoryMovement ledger, prevents cross-seller IDOR, ships suborders, and computes payouts', async () => {
    const [buyer, seller1, seller2] = await Promise.all([
      UserModel.create({
        email: 'buyer@fixme.com',
        fullName: 'Buyer',
        passwordHash: 'hash',
        role: 'customer',
      }),
      UserModel.create({
        email: 'seller1@fixme.com',
        fullName: 'Seller One',
        passwordHash: 'hash',
        role: 'seller',
      }),
      UserModel.create({
        email: 'seller2@fixme.com',
        fullName: 'Seller Two',
        passwordHash: 'hash',
        role: 'seller',
      }),
    ]);

    await SellerProfileModel.create({
      userId: seller1._id,
      storeName: 'Seller One Spares',
      storeSlug: 'seller-one-spares',
      businessAddress: 'Bengaluru',
      status: 'approved',
    });

    const buyerToken = signSessionToken({
      id: buyer._id.toString(),
      email: buyer.email,
      role: buyer.role,
      fullName: buyer.fullName,
    });
    const seller1Token = signSessionToken({
      id: seller1._id.toString(),
      email: seller1.email,
      role: seller1.role,
      fullName: seller1.fullName,
    });
    const seller2Token = signSessionToken({
      id: seller2._id.toString(),
      email: seller2.email,
      role: seller2.role,
      fullName: seller2.fullName,
    });

    const cat = await CategoryModel.create({ name: 'Audio', slug: 'audio' });
    const brand = await BrandModel.create({ name: 'Sony', slug: 'sony' });
    const part = await PartModel.create({
      categoryId: cat._id,
      brandId: brand._id,
      partNumber: 'WF1000XM4-R-BUD',
      name: 'Sony WF-1000XM4 Right Earbud Replacement',
      componentType: 'right_earbud',
      description: 'Original right earbud',
    });

    const listing = await ListingModel.create({
      partId: part._id,
      sellerId: seller1._id,
      title: 'Sony WF-1000XM4 Right Earbud — New Battery Installed',
      condition: 'refurbished',
      pricePaise: 450000,
      stockAvailable: 5,
      status: 'active',
    });

    // 1. Seller 2 cannot adjust Seller 1's inventory (IDOR protection)
    const idorRes = await request(app)
      .patch(`/api/v1/seller/inventory/${listing._id.toString()}`)
      .set('Authorization', `Bearer ${seller2Token}`)
      .send({ stockAvailable: 99, reason: 'Unauthorized attempt' });

    expect(idorRes.status).toBe(403);
    expect(idorRes.body.error.code).toBe('OWNERSHIP_VIOLATION');

    // 2. Seller 1 adjusts their own inventory and records InventoryMovement
    const invRes = await request(app)
      .patch(`/api/v1/seller/inventory/${listing._id.toString()}`)
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({ stockAvailable: 12, reason: 'Restocked 7 tested units' });

    expect(invRes.status).toBe(200);
    expect(invRes.body.data.listing.stockAvailable).toBe(12);
    expect(invRes.body.data.movement.quantityDelta).toBe(7);
    expect(invRes.body.data.movement.movementType).toBe('manual_adjustment');

    // 3. Create a paid order and test suborder shipping & payout eligibility
    const order = await OrderModel.create({
      orderNumber: 'FXM-SHIP-001',
      customerId: buyer._id,
      subOrders: [
        {
          sellerId: seller1._id,
          items: [
            {
              listingId: listing._id,
              partId: part._id,
              title: listing.title,
              condition: listing.condition,
              quantity: 1,
              unitPricePaise: 450000,
              lineTotalPaise: 450000,
            },
          ],
          subtotalPaise: 450000,
          platformFeePaise: 36000,
          sellerSettlementPaise: 414000,
          fulfillmentStatus: 'paid',
          payoutStatus: 'pending',
        },
      ],
      shippingAddress: {
        fullName: 'Buyer',
        phone: '9876543210',
        line1: '10 MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'IN',
      },
      subtotalPaise: 450000,
      shippingPaise: 0,
      taxPaise: 81000,
      totalPaise: 531000,
      currency: 'INR',
      status: 'paid',
      reservationExpiresAt: new Date(Date.now() + 900000),
    });

    const subOrderId = order.subOrders[0]._id.toString();

    const shipRes = await request(app)
      .post(`/api/v1/orders/${order._id.toString()}/ship`)
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({
        subOrderId,
        carrier: 'BlueDart Express',
        trackingNumber: 'BD9988776655IN',
      });

    expect(shipRes.status).toBe(200);
    expect(shipRes.body.data.shipment.trackingNumber).toBe('BD9988776655IN');
    expect(shipRes.body.data.order.status).toBe('shipped');

    // Buyer can view shipment tracking
    const trackRes = await request(app)
      .get(`/api/v1/orders/${order._id.toString()}/shipment`)
      .set('Authorization', `Bearer ${buyerToken}`);

    expect(trackRes.status).toBe(200);
    expect(trackRes.body.data[0].carrier).toBe('BlueDart Express');

    // Seller payout summary reflects eligible settlement in paise
    const payoutRes = await request(app)
      .get('/api/v1/seller/payouts')
      .set('Authorization', `Bearer ${seller1Token}`);

    expect(payoutRes.status).toBe(200);
    expect(payoutRes.body.data.totalGrossSalesPaise).toBe(450000);
    expect(payoutRes.body.data.totalPlatformFeesPaise).toBe(36000);
    expect(payoutRes.body.data.eligibleSettlementPaise).toBe(414000);
  });

  it('enforces verified-purchase reviews, wanted-part offers, and dispute resolution', async () => {
    const [buyer, nonBuyer, seller, admin] = await Promise.all([
      UserModel.create({
        email: 'buyer@fixme.com',
        fullName: 'Real Buyer',
        passwordHash: 'hash',
        role: 'customer',
      }),
      UserModel.create({
        email: 'random@fixme.com',
        fullName: 'Non Buyer',
        passwordHash: 'hash',
        role: 'customer',
      }),
      UserModel.create({
        email: 'seller@fixme.com',
        fullName: 'Verified Seller',
        passwordHash: 'hash',
        role: 'seller',
      }),
      UserModel.create({
        email: 'admin@fixme.com',
        fullName: 'Admin',
        passwordHash: 'hash',
        role: 'administrator',
      }),
    ]);

    await SellerProfileModel.create({
      userId: seller._id,
      storeName: 'Precision Spares',
      storeSlug: 'precision-spares',
      businessAddress: 'Chennai',
      status: 'approved',
    });

    const buyerToken = signSessionToken({
      id: buyer._id.toString(),
      email: buyer.email,
      role: buyer.role,
      fullName: buyer.fullName,
    });
    const nonBuyerToken = signSessionToken({
      id: nonBuyer._id.toString(),
      email: nonBuyer.email,
      role: nonBuyer.role,
      fullName: nonBuyer.fullName,
    });
    const sellerToken = signSessionToken({
      id: seller._id.toString(),
      email: seller.email,
      role: seller.role,
      fullName: seller.fullName,
    });
    const adminToken = signSessionToken({
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
      fullName: admin.fullName,
    });

    const cat = await CategoryModel.create({ name: 'Phones', slug: 'phones' });
    const brand = await BrandModel.create({ name: 'Apple', slug: 'apple' });
    const device = await DeviceModel.create({
      brandId: brand._id,
      categoryId: cat._id,
      modelName: 'iPhone 13 Pro',
      modelNumber: 'A2638',
    });
    const part = await PartModel.create({
      categoryId: cat._id,
      brandId: brand._id,
      partNumber: 'IP13P-CAM-TELE',
      name: 'iPhone 13 Pro Triple Rear Camera Module',
      componentType: 'camera_module',
      description: 'OEM rear camera module',
    });
    const listing = await ListingModel.create({
      partId: part._id,
      sellerId: seller._id,
      title: 'iPhone 13 Pro Original Pull Rear Camera',
      condition: 'used',
      pricePaise: 899900,
      stockAvailable: 3,
      status: 'active',
    });

    const order = await OrderModel.create({
      orderNumber: 'FXM-REV-001',
      customerId: buyer._id,
      subOrders: [
        {
          sellerId: seller._id,
          items: [
            {
              listingId: listing._id,
              partId: part._id,
              title: listing.title,
              condition: listing.condition,
              quantity: 1,
              unitPricePaise: 899900,
              lineTotalPaise: 899900,
            },
          ],
          subtotalPaise: 899900,
          platformFeePaise: 71992,
          sellerSettlementPaise: 827908,
          fulfillmentStatus: 'delivered',
          payoutStatus: 'eligible',
        },
      ],
      shippingAddress: {
        fullName: 'Real Buyer',
        phone: '9876543210',
        line1: 'Anna Salai',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600002',
        country: 'IN',
      },
      subtotalPaise: 899900,
      shippingPaise: 0,
      taxPaise: 161982,
      totalPaise: 1061882,
      currency: 'INR',
      status: 'delivered',
      reservationExpiresAt: new Date(Date.now() + 900000),
    });

    // 1. Non-buyer cannot submit a review (403 UNVERIFIED_PURCHASE)
    const fakeRevRes = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${nonBuyerToken}`)
      .send({
        orderId: order._id.toString(),
        listingId: listing._id.toString(),
        rating: 1,
        comment: 'Fake competitor review attempt',
      });

    expect(fakeRevRes.status).toBe(403);
    expect(fakeRevRes.body.error.code).toBe('UNVERIFIED_PURCHASE');

    // 2. Verified buyer submits review and updates seller ratingAverage
    const okRevRes = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        orderId: order._id.toString(),
        listingId: listing._id.toString(),
        rating: 5,
        comment: 'Optical stabilization and 3x telephoto focus worked flawlessly!',
      });

    expect(okRevRes.status).toBe(201);
    expect(okRevRes.body.data.isVerifiedPurchase).toBe(true);

    const updatedSellerProfile = await SellerProfileModel.findOne({ userId: seller._id });
    expect(updatedSellerProfile?.ratingAverage).toBe(5);
    expect(updatedSellerProfile?.ratingCount).toBe(1);

    // 3. Wanted-Part Request & Seller Offer
    const wantedRes = await request(app)
      .post('/api/v1/wanted-requests')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        deviceId: device._id.toString(),
        componentType: 'camera_module',
        description: 'Looking for tested iPhone 13 Pro LiDAR + Telephoto assembly',
        maxBudgetPaise: 950000,
      });

    expect(wantedRes.status).toBe(201);
    const wantedId = wantedRes.body.data._id;

    const offerRes = await request(app)
      .post(`/api/v1/wanted-requests/${wantedId}/offers`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        listingId: listing._id.toString(),
        offeredPricePaise: 875000,
        notes: 'In stock and ready for same-day dispatch.',
      });

    expect(offerRes.status).toBe(201);
    expect(offerRes.body.data.offers.length).toBe(1);
    expect(offerRes.body.data.offers[0].offeredPricePaise).toBe(875000);

    // 4. Dispute creation & Admin resolution
    const disputeRes = await request(app)
      .post('/api/v1/disputes')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        orderId: order._id.toString(),
        subOrderId: order.subOrders[0]._id.toString(),
        reason: 'Requested warranty replacement check on flex cable',
      });

    expect(disputeRes.status).toBe(201);
    const disputeId = disputeRes.body.data._id;

    const resolveRes = await request(app)
      .patch(`/api/v1/admin/disputes/${disputeId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'resolved_buyer',
        resolutionNotes: 'Approved warranty replacement unit for buyer.',
      });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.status).toBe('resolved_buyer');
  });
});

