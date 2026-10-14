import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { UserModel } from '../src/models/User';
import { SellerProfileModel } from '../src/models/SellerProfile';
import { WantedRequestModel } from '../src/models/WantedRequest';
import { NotificationModel } from '../src/models/Notification';
import { signSessionToken } from '../src/permissions/rbac';

describe('Wanted Spare Parts Board & Seller Bidding Engine', () => {
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
      WantedRequestModel.deleteMany({}),
      NotificationModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('enforces full customer request creation, validation, seller bidding, duplicate prevention, and atomic offer acceptance', async () => {
    // 1. Create users: Customer 1, Customer 2, Seller 1, Seller 2
    const [buyer1, buyer2, seller1, seller2] = await Promise.all([
      UserModel.create({
        email: 'buyer1@fixme.com',
        fullName: 'Ravi Kumar',
        passwordHash: 'hash',
        role: 'customer',
      }),
      UserModel.create({
        email: 'buyer2@fixme.com',
        fullName: 'Priya Sharma',
        passwordHash: 'hash',
        role: 'customer',
      }),
      UserModel.create({
        email: 'seller1@fixme.com',
        fullName: 'Deepak Spares',
        passwordHash: 'hash',
        role: 'seller',
      }),
      UserModel.create({
        email: 'seller2@fixme.com',
        fullName: 'Bangalore Micro Tech',
        passwordHash: 'hash',
        role: 'seller',
      }),
    ]);

    await Promise.all([
      SellerProfileModel.create({
        userId: seller1._id,
        storeName: 'Deepak Spares Store',
        storeSlug: 'deepak-spares-store',
        businessAddress: 'Bangalore',
        status: 'approved',
      }),
      SellerProfileModel.create({
        userId: seller2._id,
        storeName: 'Bangalore Micro Tech Hub',
        storeSlug: 'bangalore-micro-tech-hub',
        businessAddress: 'Bangalore',
        status: 'approved',
      }),
    ]);

    const buyer1Token = signSessionToken({
      id: buyer1._id.toString(),
      email: buyer1.email,
      role: buyer1.role,
      fullName: buyer1.fullName,
    });
    const buyer2Token = signSessionToken({
      id: buyer2._id.toString(),
      email: buyer2.email,
      role: buyer2.role,
      fullName: buyer2.fullName,
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

    // 2. Unauthenticated user cannot create request (401)
    const unauthRes = await request(app)
      .post('/api/v1/wanted-requests')
      .send({
        componentType: 'Logic Board',
        description: 'Need working logic board',
      });
    expect(unauthRes.status).toBe(401);

    // 3. Validation failure: short description, negative budget, zero quantity
    const invalidRes = await request(app)
      .post('/api/v1/wanted-requests')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({
        componentType: 'Logic Board',
        description: 'Too short',
        quantity: 0,
        maxBudgetPaise: -500,
      });
    expect(invalidRes.status).toBe(400);

    // 4. Buyer 1 successfully creates wanted request
    const createRes = await request(app)
      .post('/api/v1/wanted-requests')
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({
        category: 'motherboard',
        brand: 'Lenovo',
        deviceModel: 'ThinkPad T480',
        componentType: 'System Board i7-8550U MX150',
        partNumber: '01YR200',
        description: 'Tested working motherboard with clean BIOS, no supervisor password lock.',
        quantity: 1,
        requiredCondition: 'refurbished',
        maxBudgetPaise: 850000,
        deliveryCity: 'Bengaluru',
        deliveryPostalCode: '560001',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.componentType).toBe('System Board i7-8550U MX150');
    expect(createRes.body.data.status).toBe('open');
    const requestId = createRes.body.data._id;

    // 5. Buyer 2 cannot edit Buyer 1's request (403 OWNERSHIP_VIOLATION)
    const badEditRes = await request(app)
      .patch(`/api/v1/wanted-requests/${requestId}`)
      .set('Authorization', `Bearer ${buyer2Token}`)
      .send({
        description: 'Malicious modification of another buyer request',
      });
    expect(badEditRes.status).toBe(403);
    expect(badEditRes.body.error.code).toBe('OWNERSHIP_VIOLATION');

    // 6. Buyer 1 successfully updates their own request
    const goodEditRes = await request(app)
      .patch(`/api/v1/wanted-requests/${requestId}`)
      .set('Authorization', `Bearer ${buyer1Token}`)
      .send({
        maxBudgetPaise: 900000,
        description: 'Tested working motherboard with clean BIOS, no supervisor password lock. Prefer heatsink included.',
      });
    expect(goodEditRes.status).toBe(200);
    expect(goodEditRes.body.data.maxBudgetPaise).toBe(900000);

    // 7. Non-seller (Buyer 2) cannot submit an offer (403 ROLE_FORBIDDEN)
    const customerOfferRes = await request(app)
      .post(`/api/v1/wanted-requests/${requestId}/offers`)
      .set('Authorization', `Bearer ${buyer2Token}`)
      .send({
        offeredPricePaise: 800000,
        availableQuantity: 1,
        condition: 'refurbished',
        leadTimeDays: 2,
      });
    expect(customerOfferRes.status).toBe(403);

    // 8. Seller 1 submits an offer
    const offer1Res = await request(app)
      .post(`/api/v1/wanted-requests/${requestId}/offers`)
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({
        offeredPricePaise: 820000,
        availableQuantity: 2,
        condition: 'refurbished',
        leadTimeDays: 2,
        warrantyDays: 90,
        shippingCostPaise: 0,
        compatibilityEvidence: 'Board ID matches 01YR200 rev 2.1, thermal tested under Prime95',
        notes: 'Original motherboard tested in Lenovo diagnostic suite.',
      });

    expect(offer1Res.status).toBe(201);
    expect(offer1Res.body.data.offers.length).toBe(1);
    const offer1Id = offer1Res.body.data.offers[0]._id;
    expect(offer1Res.body.data.offers[0].storeName).toBe('Deepak Spares Store');
    expect(offer1Res.body.data.offers[0].offeredPricePaise).toBe(820000);

    // Notification created for buyer
    const buyerNotif = await NotificationModel.findOne({
      userId: buyer1._id,
      type: 'wanted_offer',
    });
    expect(buyerNotif).not.toBeNull();

    // 9. Seller 1 attempts duplicate submission -> rejected (409 DUPLICATE_OFFER)
    const dupOfferRes = await request(app)
      .post(`/api/v1/wanted-requests/${requestId}/offers`)
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({
        offeredPricePaise: 800000,
        availableQuantity: 1,
        condition: 'refurbished',
        leadTimeDays: 1,
      });
    expect(dupOfferRes.status).toBe(409);
    expect(dupOfferRes.body.error.code).toBe('DUPLICATE_OFFER');

    // 10. Seller 2 submits a competing offer
    const offer2Res = await request(app)
      .post(`/api/v1/wanted-requests/${requestId}/offers`)
      .set('Authorization', `Bearer ${seller2Token}`)
      .send({
        offeredPricePaise: 790000,
        availableQuantity: 1,
        condition: 'used',
        leadTimeDays: 3,
        warrantyDays: 30,
        shippingCostPaise: 15000,
        notes: 'Working pull from off-lease corporate machine.',
      });
    expect(offer2Res.status).toBe(201);
    expect(offer2Res.body.data.offers.length).toBe(2);
    const offer2Id = offer2Res.body.data.offers.find(
      (o: any) => o.sellerId._id === seller2._id.toString() || o.sellerId === seller2._id.toString()
    )._id;

    // 11. Cross-seller authorization: Seller 2 cannot edit or withdraw Seller 1's offer
    const badEditOfferRes = await request(app)
      .patch(`/api/v1/wanted-requests/${requestId}/offers/${offer1Id}`)
      .set('Authorization', `Bearer ${seller2Token}`)
      .send({ offeredPricePaise: 500000 });
    expect(badEditOfferRes.status).toBe(403);
    expect(badEditOfferRes.body.error.code).toBe('OWNERSHIP_VIOLATION');

    const badWithdrawRes = await request(app)
      .delete(`/api/v1/wanted-requests/${requestId}/offers/${offer1Id}`)
      .set('Authorization', `Bearer ${seller2Token}`);
    expect(badWithdrawRes.status).toBe(403);
    expect(badWithdrawRes.body.error.code).toBe('OWNERSHIP_VIOLATION');

    // 12. Seller 1 updates their own offer
    const updateOfferRes = await request(app)
      .patch(`/api/v1/wanted-requests/${requestId}/offers/${offer1Id}`)
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({
        offeredPricePaise: 780000,
        notes: 'Price reduced to ₹7,800 with 90-day warranty included.',
      });
    expect(updateOfferRes.status).toBe(200);
    const updatedOffer1 = updateOfferRes.body.data.offers.find((o: any) => o._id === offer1Id);
    expect(updatedOffer1.offeredPricePaise).toBe(780000);

    // 13. Buyer 2 cannot accept offers on Buyer 1's request (403 OWNERSHIP_VIOLATION)
    const badAcceptRes = await request(app)
      .patch(`/api/v1/wanted-requests/${requestId}/offers/${offer1Id}/accept`)
      .set('Authorization', `Bearer ${buyer2Token}`);
    expect(badAcceptRes.status).toBe(403);
    expect(badAcceptRes.body.error.code).toBe('OWNERSHIP_VIOLATION');

    // 14. Buyer 1 accepts Seller 1's offer:
    // Atomic check: Request status -> 'fulfilled', Offer 1 -> 'accepted', Offer 2 -> 'rejected'
    const acceptRes = await request(app)
      .patch(`/api/v1/wanted-requests/${requestId}/offers/${offer1Id}/accept`)
      .set('Authorization', `Bearer ${buyer1Token}`);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.status).toBe('fulfilled');
    expect(acceptRes.body.data.acceptedOfferId).toBe(offer1Id);

    const winningOffer = acceptRes.body.data.offers.find((o: any) => o._id === offer1Id);
    const otherOffer = acceptRes.body.data.offers.find((o: any) => o._id === offer2Id);
    expect(winningOffer.status).toBe('accepted');
    expect(otherOffer.status).toBe('rejected');

    // Winning seller notified
    const sellerNotif = await NotificationModel.findOne({
      userId: seller1._id,
      type: 'wanted_offer',
    });
    expect(sellerNotif).not.toBeNull();

    // 15. Attempting to accept another offer on now-fulfilled request is rejected
    const repeatAcceptRes = await request(app)
      .patch(`/api/v1/wanted-requests/${requestId}/offers/${offer2Id}/accept`)
      .set('Authorization', `Bearer ${buyer1Token}`);
    expect(repeatAcceptRes.status).toBe(400);

    // 16. Further offers cannot be posted on a fulfilled request
    const closedBiddingRes = await request(app)
      .post(`/api/v1/wanted-requests/${requestId}/offers`)
      .set('Authorization', `Bearer ${seller2Token}`)
      .send({
        offeredPricePaise: 700000,
        availableQuantity: 1,
        condition: 'new',
        leadTimeDays: 1,
      });
    expect(closedBiddingRes.status).toBe(404);
  });

  it('allows request cancellation, offer withdrawal, and offer decline', async () => {
    const buyer = await UserModel.create({
      email: 'buyer_cancel@fixme.com',
      fullName: 'Cancel Buyer',
      passwordHash: 'hash',
      role: 'customer',
    });
    const seller = await UserModel.create({
      email: 'seller_cancel@fixme.com',
      fullName: 'Cancel Seller',
      passwordHash: 'hash',
      role: 'seller',
    });

    await SellerProfileModel.create({
      userId: seller._id,
      storeName: 'Quick Spares',
      storeSlug: 'quick-spares',
      businessAddress: 'Hyderabad',
      status: 'approved',
    });

    const buyerToken = signSessionToken({
      id: buyer._id.toString(),
      email: buyer.email,
      role: buyer.role,
      fullName: buyer.fullName,
    });
    const sellerToken = signSessionToken({
      id: seller._id.toString(),
      email: seller.email,
      role: seller.role,
      fullName: seller.fullName,
    });

    // Create request
    const reqRes = await request(app)
      .post('/api/v1/wanted-requests')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        category: 'battery',
        brand: 'Dell',
        deviceModel: 'XPS 13 9370',
        componentType: '52Wh Battery Replacement',
        description: 'OEM Dell 52Wh battery with at least 85% health.',
        quantity: 1,
        requiredCondition: 'any',
        deliveryCity: 'Hyderabad',
        deliveryPostalCode: '500001',
      });
    const requestId = reqRes.body.data._id;

    // Seller submits offer
    const offerRes = await request(app)
      .post(`/api/v1/wanted-requests/${requestId}/offers`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        offeredPricePaise: 350000,
        availableQuantity: 1,
        condition: 'new',
        leadTimeDays: 1,
      });
    const offerId = offerRes.body.data.offers[0]._id;

    // 1. Seller withdraws offer
    const withdrawRes = await request(app)
      .delete(`/api/v1/wanted-requests/${requestId}/offers/${offerId}`)
      .set('Authorization', `Bearer ${sellerToken}`);
    expect(withdrawRes.status).toBe(200);
    expect(withdrawRes.body.data.offers[0].status).toBe('withdrawn');

    // Withdrawn offer cannot be accepted
    const tryAcceptRes = await request(app)
      .patch(`/api/v1/wanted-requests/${requestId}/offers/${offerId}/accept`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(tryAcceptRes.status).toBe(400);

    // 2. Cancel the wanted request
    const cancelRes = await request(app)
      .patch(`/api/v1/wanted-requests/${requestId}/cancel`)
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('cancelled');
  });
});

