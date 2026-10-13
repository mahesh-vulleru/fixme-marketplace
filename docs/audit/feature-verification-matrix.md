# FixMe.com — Feature Verification Matrix

This matrix documents the verification status of every implemented feature, navigation route, API endpoint, and critical business workflow across FixMe.com.

## Status Legend
- **PASS**: Verified working via automated tests and code execution with real database persistence.
- **PARTIAL**: Implemented and functional, but dependent on external sandbox services.
- **NOT IMPLEMENTED**: Placeholder only or not yet built.
- **NOT VERIFIED**: Requires live production third-party webhooks.

---

## 1. Authentication & Role-Based Access Control (RBAC)

| Feature / Control | Frontend Route | Backend Endpoint | Status | Evidence / Verification Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Customer Registration** | `/register` | `POST /api/v1/auth/register` | **PASS** | Validates email, password strength, terms acceptance. Assigns least-privileged `customer` role. Rejects admin role injection. Tested in `auth.test.ts`. |
| **User Sign In** | `/login` | `POST /api/v1/auth/login` | **PASS** | Normalizes emails, verifies bcrypt hashes, checks account active status, sets HttpOnly cookie. Tested in `auth.test.ts`. |
| **Session Restoration** | `AuthProvider` | `GET /api/v1/auth/me` | **PASS** | Returns authenticated user and seller profile. Stale cookies cleanly return 401 and trigger cookie removal. |
| **Logout** | Header / Nav | `POST /api/v1/auth/logout` | **PASS** | Clears session cookie, revokes client tokens, resets React AuthContext. |
| **Role-Based Redirects** | Cross-App | Client / Admin / Seller | **PASS** | Authenticated admin accessing seller hub is redirected to `:5174`; seller accessing customer hub is routed appropriately. |
| **CSRF Protection** | Forms / API | Mutating routes | **PASS** | HMAC-SHA256 CSRF token generated on login and required on cookie-authenticated state changes (`rbac.ts`). |

---

## 2. Customer Marketplace (`apps/client`)

| Feature / Control | Frontend Route | Backend Endpoint | Status | Evidence / Verification Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Welcome Landing Page** | `/` (signed out) | N/A | **PASS** | Renders welcome value proposition with Sign In and Register options. Public homepage guarded until sign-in. |
| **Catalogue Browsing** | `/` (signed in) | `GET /api/v1/categories`, `/brands` | **PASS** | Real database categories and brands rendered. Paginated and searchable. |
| **Device Compatibility Check** | `/compatibility` | `POST /api/v1/compatibility/check` | **PASS** | Strict verification against `CompatibilityRecordModel`. Rejects unverified device-part pairings. Tested in `catalogue.test.ts`. |
| **Part Details & Listing Selection** | `/parts/:id` | `GET /api/v1/parts/:id/listings` | **PASS** | Displays seller listings with condition grades, prices in ₹ INR, and available stock. |
| **Shopping Cart Persistence** | `/cart` | `GET/POST /api/v1/cart` | **PASS** | LocalStorage + database synchronization. Handles quantity changes and stock checks. Tested in `commerce.test.ts`. |
| **Wanted Spare Parts Board** | `/wanted-parts` | `GET/POST /api/v1/wanted-parts` | **PASS** | Multi-field customer request creation with brand, model, part number, budget, PIN code, and expiry date. Tested in `wantedParts.test.ts`. |
| **Wanted Offer Comparison** | `/wanted-parts/:id` | `GET /api/v1/wanted-parts/:id/offers` | **PASS** | Customers view and compare seller bids with pricing, warranty, and delivery date. Acceptance atomically updates status. |
| **Customer Orders & Tracking** | `/orders` | `GET /api/v1/orders` | **PASS** | Lists customer order history, sub-order breakdown, shipment tracking links, and cancellation actions. |

---

## 3. Separate Seller Portal (`apps/seller`)

| Feature / Control | Frontend Route | Backend Endpoint | Status | Evidence / Verification Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Seller Dashboard** | `/` | `GET /api/v1/seller/inventory/summary` | **PASS** | Displays live listings count, active/paused status, low-stock warnings, sellable stock, and integer-paise total valuation. |
| **Canonical Spare Parts Search** | `/listings/create` | `GET /api/v1/seller/canonical-parts` | **PASS** | Live search against verified catalogue spare parts with debouncing and component type filters. Tested in `sellerListings.test.ts`. |
| **Create Seller Listing** | `/listings/create` | `POST /api/v1/seller/listings` | **PASS** | Validates SKU uniqueness per seller, condition, price, initial stock, and warranty. Automatically creates `initial_receipt` movement. |
| **My Listings Table** | `/listings` | `GET /api/v1/seller/listings` | **PASS** | Searchable and filterable. Displays image, title, part number, SKU, condition, unit price, stock, and total valuation. |
| **Listing Status Toggle** | `/listings` | `PATCH /api/v1/seller/listings/:id/status` | **PASS** | Allows pausing and resuming listings. Blocks activating listings with 0 available stock. |
| **Quick Stock Adjustment Modal** | `/listings`, `/inventory` | `POST /api/v1/seller/listings/:id/stock-adjustments` | **PASS** | Atomic stock update with mandatory reason. Rejects negative deductions exceeding available on-hand stock. |
| **Stock Movement Ledger** | `/movements` | `GET /api/v1/seller/stock-movements` | **PASS** | Chronological audit ledger recording movement type, delta, before/after availability, reason, and reference. |
| **Wanted Parts Bidding** | `/wanted` | `GET /api/v1/seller/wanted-parts` | **PASS** | Sellers browse open buyer requests and submit competitive offers. Prevents duplicate quotes by the same seller. |
| **Sub-Order Shipment Fulfillment** | `/orders` | `POST /api/v1/seller/sub-orders/:id/ship` | **PASS** | Carrier and tracking number submission. Transitions sub-order to `shipped` status. Tested in `sellerTrust.test.ts`. |

---

## 4. Admin Dashboard (`apps/admin`)

| Feature / Control | Frontend Route | Backend Endpoint | Status | Evidence / Verification Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Administrative Overview** | `/admin` | `GET /api/v1/admin/analytics/overview` | **PASS** | Real-time counts of users, approved sellers, pending applications, active listings, and platform revenue. |
| **User & Seller Moderation** | `/admin/users` | `GET/PATCH /api/v1/admin/users`, `/sellers` | **PASS** | Application review, KYC document inspection, approve/reject workflow, and account suspension toggle. |
| **Catalogue Management** | `/admin/catalogue` | CRUD on `/categories`, `/brands`, `/devices`, `/parts` | **PASS** | Full CRUD on canonical device models, parts, and compatibility relations. Tested in `catalogue.test.ts`. |
| **Listing Moderation** | `/admin/moderation` | `GET/PATCH /api/v1/admin/listings` | **PASS** | Admin approval/rejection of vendor listings with mandatory rejection reason and audit logging. |
| **Orders & Payments Monitoring** | `/admin/orders` | `GET /api/v1/admin/orders` | **PASS** | Comprehensive oversight of orders, sub-orders, escrow payment captures, and seller payouts. |
| **Dispute Resolution** | `/admin/disputes` | `PATCH /api/v1/admin/disputes/:id` | **PASS** | Admin reviews evidence from buyer and seller, and issues resolutions (refund, dismiss, partial settlement). |
| **Security Audit Logs** | `/admin/audit-logs` | `GET /api/v1/admin/audit-logs` | **PASS** | Immutable log tracking admin user ID, IP, action, resource ID, and metadata. |

---

## 5. Commerce, Payments & External Integrations

| Feature / Integration | Backend Endpoint | Status | Evidence / Verification Notes |
| :--- | :--- | :--- | :--- |
| **Integer-Paise Currency Math** | Entire commerce pipeline | **PASS** | All prices stored as integer paise (e.g. ₹1,299.00 = `129900`). Floating-point prices rejected by Zod schemas. |
| **Atomic Inventory Reservation** | `POST /api/v1/orders/checkout` | **PASS** | MongoDB session transactions ensure stock availability cannot become negative during concurrent checkouts. |
| **Payment Gateway Sandbox** | `POST /api/v1/payments/razorpay/create-order` | **PARTIAL** | Functional against Razorpay sandbox test keys configured in `.env`. Requires live credentials for production deployment. |
| **Webhook Signature Verification** | `POST /api/v1/payments/razorpay/webhook` | **PASS** | Validates SHA256 HMAC webhook signature before releasing order funds. Tested in `commerce.test.ts`. |
| **Media Upload Intent & Storage** | `POST /api/v1/assets/upload-intent` | **PARTIAL** | Pre-signed upload intent pattern verified. Binary blobs never stored in MongoDB. Local fallback active; Cloudinary sandbox configured. |

