import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { UserModel } from '../src/models/User';
import { SellerProfileModel } from '../src/models/SellerProfile';
import { CategoryModel } from '../src/models/Category';
import { BrandModel } from '../src/models/Brand';
import { PartModel } from '../src/models/Part';
import { ListingModel } from '../src/models/Listing';
import { InventoryMovementModel } from '../src/models/InventoryMovement';
import { signSessionToken } from '../src/permissions/rbac';

describe('Seller Listings & Inventory Management Module', () => {
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
      PartModel.deleteMany({}),
      ListingModel.deleteMany({}),
      InventoryMovementModel.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('verifies canonical part search, listing creation, sku uniqueness, audited stock adjustments, IDOR protection, and inventory valuation', async () => {
    // 1. Create Sellers and Categories/Brands/Parts
    const [sellerUser1, sellerUser2] = await Promise.all([
      UserModel.create({
        email: 'spares1@fixme.com',
        fullName: 'Bangalore Spares Hub',
        passwordHash: 'hash123',
        role: 'seller',
      }),
      UserModel.create({
        email: 'spares2@fixme.com',
        fullName: 'Koramangala Parts Co',
        passwordHash: 'hash123',
        role: 'seller',
      }),
    ]);

    await Promise.all([
      SellerProfileModel.create({
        userId: sellerUser1._id,
        storeName: 'Bangalore Spares Hub',
        storeSlug: 'bangalore-spares-hub',
        businessAddress: '100ft Road, Indiranagar, Bangalore',
        status: 'approved',
      }),
      SellerProfileModel.create({
        userId: sellerUser2._id,
        storeName: 'Koramangala Parts Co',
        storeSlug: 'koramangala-parts-co',
        businessAddress: '5th Block, Koramangala, Bangalore',
        status: 'approved',
      }),
    ]);

    const seller1Token = signSessionToken({
      id: sellerUser1._id.toString(),
      email: sellerUser1.email,
      role: sellerUser1.role,
      fullName: sellerUser1.fullName,
    });

    const seller2Token = signSessionToken({
      id: sellerUser2._id.toString(),
      email: sellerUser2.email,
      role: sellerUser2.role,
      fullName: sellerUser2.fullName,
    });

    const category = await CategoryModel.create({
      name: 'Earbuds',
      slug: 'earbuds',
      sortOrder: 1,
      isActive: true,
    });

    const brand = await BrandModel.create({
      name: 'Sony',
      slug: 'sony',
      isActive: true,
    });

    const canonicalPart = await PartModel.create({
      name: 'WF-1000XM4 Replacement Battery',
      partNumber: 'Z55H-BATT-01',
      categoryId: category._id,
      brandId: brand._id,
      componentType: 'battery',
      description: 'Original OEM 3.85V lithium replacement coin battery for Sony WF-1000XM4 earbuds',
      isActive: true,
    });

    // 2. Canonical Part Search
    const searchRes = await request(app)
      .get('/api/v1/seller/canonical-parts?q=WF-1000XM4')
      .set('Authorization', `Bearer ${seller1Token}`);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.length).toBe(1);
    expect(searchRes.body.data[0].partNumber).toBe('Z55H-BATT-01');

    // 3. Create Listing with Valid Data & Verify Initial Stock Movement
    const createRes = await request(app)
      .post('/api/v1/seller/listings')
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({
        partId: canonicalPart._id.toString(),
        sellerSku: 'SNY-XM4-BATT-01',
        title: 'Sony WF-1000XM4 Authentic Replacement Battery Unit',
        condition: 'new',
        pricePaise: 129900, // ₹1,299.00
        initialStock: 15,
        warrantyDays: 90,
        lowStockThreshold: 4,
        shippingFeePaise: 5000,
        dispatchLeadTimeDays: 1,
        shippingOriginPostalCode: '560038',
        status: 'active',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.sellerSku).toBe('SNY-XM4-BATT-01');
    expect(createRes.body.data.stockAvailable).toBe(15);
    expect(createRes.body.data.pricePaise).toBe(129900);
    const listingId = createRes.body.data._id;

    // Verify initial stock movement in ledger
    const initialMovements = await InventoryMovementModel.find({ listingId });
    expect(initialMovements.length).toBe(1);
    expect(initialMovements[0].movementType).toBe('initial_receipt');
    expect(initialMovements[0].quantityDelta).toBe(15);
    expect(initialMovements[0].newAvailable).toBe(15);

    // 4. Duplicate Seller SKU on Same Seller Must Be Rejected (409 Conflict)
    const duplicateSkuRes = await request(app)
      .post('/api/v1/seller/listings')
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({
        partId: canonicalPart._id.toString(),
        sellerSku: 'SNY-XM4-BATT-01', // duplicate
        title: 'Duplicate SKU Attempt',
        condition: 'refurbished',
        pricePaise: 99900,
        initialStock: 5,
      });

    expect(duplicateSkuRes.status).toBe(409);
    expect(duplicateSkuRes.body.error?.code || duplicateSkuRes.body.code).toBe('DUPLICATE_SELLER_SKU');

    // 5. Another Seller CAN Use the Same SKU (SKU uniqueness is scoped per seller)
    const seller2Res = await request(app)
      .post('/api/v1/seller/listings')
      .set('Authorization', `Bearer ${seller2Token}`)
      .send({
        partId: canonicalPart._id.toString(),
        sellerSku: 'SNY-XM4-BATT-01', // same SKU, different seller
        title: 'Koramangala Stock Sony Battery',
        condition: 'refurbished',
        pricePaise: 109900,
        initialStock: 8,
        status: 'active',
      });

    expect(seller2Res.status).toBe(201);
    expect(seller2Res.body.data.sellerSku).toBe('SNY-XM4-BATT-01');

    // 6. Negative Stock & Price Validation Failure
    const invalidStockRes = await request(app)
      .post('/api/v1/seller/listings')
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({
        partId: canonicalPart._id.toString(),
        sellerSku: 'INVALID-STOCK-SKU',
        title: 'Negative Stock Test',
        condition: 'new',
        pricePaise: 129900,
        initialStock: -5,
      });

    expect(invalidStockRes.status).toBe(400);

    const invalidPriceRes = await request(app)
      .post('/api/v1/seller/listings')
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({
        partId: canonicalPart._id.toString(),
        sellerSku: 'INVALID-PRICE-SKU',
        title: 'Negative Price Test',
        condition: 'new',
        pricePaise: -500,
        initialStock: 10,
      });

    expect(invalidPriceRes.status).toBe(400);

    // 7. Stock Adjustment: Restock (+10 units) with Reason
    const restockRes = await request(app)
      .post(`/api/v1/seller/listings/${listingId}/stock-adjustments`)
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({
        quantityDelta: 10,
        movementType: 'restock',
        reason: 'Received supplier shipment batch #BLR-4421',
        reference: 'PO-BLR-4421',
      });

    expect(restockRes.status).toBe(200);
    expect(restockRes.body.data.listing.stockAvailable).toBe(25);
    expect(restockRes.body.data.movement.movementType).toBe('restock');
    expect(restockRes.body.data.movement.previousAvailable).toBe(15);
    expect(restockRes.body.data.movement.newAvailable).toBe(25);

    // 8. Stock Adjustment: Damaged deduction (-5 units)
    const damageRes = await request(app)
      .post(`/api/v1/seller/listings/${listingId}/stock-adjustments`)
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({
        quantityDelta: -5,
        movementType: 'damaged',
        reason: 'Water leak in shelf section B',
      });

    expect(damageRes.status).toBe(200);
    expect(damageRes.body.data.listing.stockAvailable).toBe(20);

    // 9. Negative Stock Guard: Trying to deduct 30 units when only 20 are available must fail
    const overDeductRes = await request(app)
      .post(`/api/v1/seller/listings/${listingId}/stock-adjustments`)
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({
        quantityDelta: -30,
        reason: 'Attempt excessive deduction',
      });

    expect(overDeductRes.status).toBe(400);
    expect(overDeductRes.body.error?.code || overDeductRes.body.code).toBe('NEGATIVE_STOCK_PREVENTED');

    // 10. Missing Adjustment Reason Must Fail
    const missingReasonRes = await request(app)
      .post(`/api/v1/seller/listings/${listingId}/stock-adjustments`)
      .set('Authorization', `Bearer ${seller1Token}`)
      .send({
        quantityDelta: 5,
        reason: '   ', // whitespace only
      });

    expect(missingReasonRes.status).toBe(400);

    // 11. IDOR Protection: Seller 2 Cannot Modify or Adjust Seller 1's Listing
    const idorAdjustRes = await request(app)
      .post(`/api/v1/seller/listings/${listingId}/stock-adjustments`)
      .set('Authorization', `Bearer ${seller2Token}`)
      .send({
        quantityDelta: 10,
        reason: 'Malicious adjustment by another seller',
      });

    expect(idorAdjustRes.status).toBe(403);
    expect(idorAdjustRes.body.error?.code || idorAdjustRes.body.code).toBe('OWNERSHIP_VIOLATION');

    const idorPatchRes = await request(app)
      .patch(`/api/v1/seller/listings/${listingId}`)
      .set('Authorization', `Bearer ${seller2Token}`)
      .send({
        pricePaise: 50000,
      });

    expect(idorPatchRes.status).toBe(403);

    // 12. Authoritative Inventory Summary Calculation
    const summaryRes = await request(app)
      .get('/api/v1/seller/inventory/summary')
      .set('Authorization', `Bearer ${seller1Token}`);

    expect(summaryRes.status).toBe(200);
    const summary = summaryRes.body.data;
    expect(summary.totalListings).toBe(1);
    expect(summary.activeListings).toBe(1);
    expect(summary.totalSellableStock).toBe(20);
    // 20 units * 129900 paise = 2,598,000 paise (₹25,980.00)
    expect(summary.totalInventoryValuePaise).toBe(20 * 129900);
    expect(summary.recentMovements.length).toBeGreaterThanOrEqual(3);

    // 13. Chronological Audited Movements
    const movementsRes = await request(app)
      .get('/api/v1/seller/stock-movements')
      .set('Authorization', `Bearer ${seller1Token}`);

    expect(movementsRes.status).toBe(200);
    expect(movementsRes.body.data.length).toBe(3); // initial_receipt, restock, damaged
  });

  it('guarantees inventory consistency and non-negative stock under concurrent deduction requests', async () => {
    const seller = await UserModel.create({
      email: 'concurrent@fixme.com',
      fullName: 'Concurrent Tech',
      passwordHash: 'hash',
      role: 'seller',
    });

    await SellerProfileModel.create({
      userId: seller._id,
      storeName: 'Concurrent Tech Store',
      storeSlug: 'concurrent-tech-store',
      businessAddress: 'Cyber City, Sector 24, Gurgaon 122002',
      status: 'approved',
    });

    const token = signSessionToken({
      id: seller._id.toString(),
      email: seller.email,
      role: seller.role,
      fullName: seller.fullName,
    });

    const category = await CategoryModel.create({
      name: 'Screens',
      slug: 'screens-concurrent',
      sortOrder: 1,
      isActive: true,
    });
    const brand = await BrandModel.create({
      name: 'OnePlus',
      slug: 'oneplus-concurrent',
      isActive: true,
    });
    const part = await PartModel.create({
      name: 'OnePlus 11 Display Module',
      partNumber: 'OP11-DISP-01',
      categoryId: category._id,
      brandId: brand._id,
      componentType: 'display',
      description: 'OEM display assembly',
      isActive: true,
    });

    const listing = await ListingModel.create({
      partId: part._id,
      sellerId: seller._id,
      sellerSku: 'OP11-DISP-STOCK',
      title: 'OnePlus 11 Display Unit',
      condition: 'new',
      pricePaise: 899900,
      stockAvailable: 10,
      status: 'active',
    });

    // 5 concurrent requests attempting to deduct 5 units each from 10 available units
    const concurrentRequests = Array.from({ length: 5 }, (_, i) =>
      request(app)
        .post(`/api/v1/seller/listings/${listing._id}/stock-adjustments`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          quantityDelta: -5,
          reason: `Concurrent deduction attempt ${i + 1}`,
        })
    );

    const responses = await Promise.all(concurrentRequests);

    const successful = responses.filter((r) => r.status === 200);
    const rejected = responses.filter((r) => r.status === 400);

    expect(successful.length).toBe(2); // 10 units / 5 units = exactly 2 deductions can succeed
    expect(rejected.length).toBe(3); // remaining 3 must be prevented

    for (const r of rejected) {
      expect(r.body.error?.code || r.body.code).toBe('NEGATIVE_STOCK_PREVENTED');
    }

    const finalListing = await ListingModel.findById(listing._id);
    expect(finalListing?.stockAvailable).toBe(0);
    expect(finalListing?.status).toBe('out_of_stock');
  });
});
