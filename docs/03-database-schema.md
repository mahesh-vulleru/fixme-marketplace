# 03 — Database Schema & Indexing Design (FixMe.com)

## 1. Core Collections Overview

| Collection | Purpose | Key Indexes |
|------------|---------|-------------|
| `categories` | Hierarchical hardware taxonomy | `{ slug: 1 }` (unique), `{ parentId: 1, sortOrder: 1 }` |
| `brands` | Device & component manufacturers | `{ slug: 1 }` (unique) |
| `devices` | Canonical repairable devices | `{ slug: 1 }` (unique), `{ brandId: 1, modelNumber: 1 }` (unique), text index on `name`, `modelNumber` |
| `parts` | Canonical spare part definitions | `{ slug: 1 }` (unique), `{ oemPartNumber: 1 }`, `{ categoryId: 1, partType: 1 }` |
| `compatibilityRecords` | Structured Device <-> Part links | `{ deviceId: 1, partId: 1 }` (unique), `{ partId: 1, verificationStatus: 1 }` |
| `listings` | Seller-specific inventory & price (`pricePaise`) | `{ partId: 1, status: 1, pricePaise: 1 }`, `{ sellerId: 1, sku: 1 }` (unique) |
| `assets` | Object storage keys & metadata | `{ storageKey: 1 }` (unique), `{ ownerId: 1, status: 1 }` |
| `users` | Customer, Seller, Staff & Admin accounts | `{ email: 1 }` (unique), `{ role: 1, isActive: 1 }` |
| `sellerProfiles` | Seller KYC, GSTIN, approval status | `{ userId: 1 }` (unique), `{ storeSlug: 1 }` (unique), `{ approvalStatus: 1 }` |
| `addresses` | Customer shipping/billing addresses | `{ userId: 1, isDefault: -1 }` |
| `auditLogs` | Immutable security & admin audit trail | `{ actorId: 1, createdAt: -1 }`, `{ entityType: 1, entityId: 1 }` |
| `carts` | Server-recalculated shopping carts | `{ userId: 1 }` (unique) |
| `orders` | Parent orders with per-seller `suborders` | `{ orderNumber: 1 }` (unique), `{ customerId: 1, createdAt: -1 }`, `{ "suborders.sellerId": 1 }` |
| `payments` | Payment intents & idempotent webhooks | `{ orderId: 1 }`, `{ providerPaymentId: 1 }` |
| `shipments` | Per-suborder carrier tracking | `{ orderId: 1, suborderId: 1 }` (unique) |
| `inventoryMovements` | Immutable stock ledger | `{ listingId: 1, createdAt: -1 }`, `{ sellerId: 1, createdAt: -1 }` |
| `returns` | Customer return requests | `{ orderId: 1, suborderId: 1 }`, `{ sellerId: 1, status: 1 }` |
| `refunds` | Paise-exact refund records | `{ returnId: 1 }`, `{ orderId: 1 }` |
| `reviews` | Verified-purchase product reviews | `{ orderId: 1, listingId: 1, customerId: 1 }` (unique) |
| `wantedRequests` | Buyer requests for rare spare parts | `{ status: 1, createdAt: -1 }`, `{ customerId: 1 }` |
| `disputes` | Escalated buyer-seller disputes | `{ orderId: 1 }`, `{ status: 1 }` |
| `notifications` | In-app user notifications | `{ userId: 1, isRead: 1, createdAt: -1 }` |

---

## 2. Non-Negotiable Data Rules
1. **Integer Paise**: All monetary fields (`pricePaise`, `subtotalPaise`, `taxPaise`, `shippingPaise`, `grandTotalPaise`, `amountPaise`) are integers (`Number.isInteger`).
2. **Canonical Part vs. Seller Listing**: `parts` never hold price or stock; `listings` always reference a `partId` and `sellerId`.
3. **Asset Metadata Only**: `assets` store `storageKey`, `mimeType`, `sizeBytes`, and `publicUrl`, never raw binary buffers.

