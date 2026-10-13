# 01 — Requirements Specification (FixMe.com)

## 1. Platform Overview
**FixMe.com** (*Find the Part. Fix the Device.*) is a multi-vendor electronics spare-parts marketplace designed for repair technicians, repair shops, refurbishers, and DIY consumers.

Unlike generic e-commerce sites, spare-parts commerce fails when buyers purchase parts that appear similar in a title but do not physically or electrically fit their exact device model or board revision. FixMe.com solves this through a **Canonical Device-to-Part Compatibility Engine** and **Multi-Vendor Listing Architecture**.

---

## 2. Core Functional Requirements

### 2.1 Canonical Catalogue & Compatibility
- **Categories & Brands**: Hierarchical hardware categories (`categories`) and manufacturer brands (`brands`).
- **Canonical Devices (`devices`)**: Exact device models identified by `modelNumber` (e.g., `A2633`, `SM-S908B`, `A2337`), `releaseYear`, and `IdentificationGuide`.
- **Canonical Parts (`parts`)**: Platform-owned spare part definitions with `oemPartNumber`, `partType`, technical `specifications`, and `installationDifficulty`.
- **Structured Compatibility (`compatibilityRecords`)**: Explicit linkage between `deviceId` and `partId` with `verificationStatus` (`exact_match`, `compatible_variant`, `incompatible`, `community_reported`), `evidenceNotes`, and `fitmentNotes`.
- **Never Guess Compatibility**: Compatibility checks must query `compatibilityRecords`, never free-text listing titles.

### 2.2 Multi-Vendor Listings & Asset Management
- **Seller Listings (`listings`)**: Verified sellers list inventory against a canonical `partId`, specifying `condition` (`oem_original`, `oem_pull`, `aftermarket_premium`, `aftermarket_standard`, `refurbished`), `warrantyDays`, `pricePaise` (integer paise), `stockAvailable`, and `stockReserved`.
- **Image & Document Storage (`assets`)**: Upload intent flow (`POST /assets/upload-intent` -> upload -> `POST /assets/:id/complete`). Image bytes are never stored in MongoDB or React `public/`.

### 2.3 Accounts, Roles & Permissions
- **7 Platform Roles**:
  1. `guest`
  2. `customer`
  3. `seller`
  4. `support_staff`
  5. `catalogue_manager`
  6. `administrator`
  7. `super_administrator`
- **Authentication**: Bcrypt password hashing, HTTP-only signed/JWT cookies, CSRF protection for cookie-authenticated mutations, and rate-limited login endpoints.
- **Moderation & Audit**: Seller KYC approval workflow (`pending_review` -> `approved` / `rejected` / `suspended`), listing approval workflow, and immutable `auditLogs` for sensitive actions.

### 2.4 Commerce, Atomic Stock & Payments
- **Integer Paise Precision**: All monetary values (`pricePaise`, `subtotalPaise`, `taxPaise`, `shippingPaise`, `grandTotalPaise`) are stored and calculated in integer paise (`₹1.00 = 100 paise`).
- **Server-Recalculated Cart (`carts`)**: The backend never trusts client-submitted prices or totals.
- **Atomic Stock Reservation**: Checkout atomically decrements `stockAvailable` and increments `stockReserved`, preventing overselling under concurrent requests.
- **Multi-Seller Order Splitting (`orders`)**: A single customer checkout creates one parent order with per-seller `suborders`, allowing independent fulfillment, shipment tracking (`shipments`), and seller settlements.
- **Idempotent Webhooks (`payments`)**: Signed payment webhooks are verified and processed idempotently.

### 2.5 Seller Operations, Wanted Parts & Trust
- **Inventory Movements (`inventoryMovements`)**: Every manual stock adjustment, reservation, commit, release, or return is logged.
- **Verified-Purchase Reviews (`reviews`)**: Customers can review parts/listings only after a delivered order.
- **Wanted-Part Requests (`wantedRequests`)**: Buyers can post requests for hard-to-find parts; verified sellers can submit binding offers.
- **Returns, Refunds & Disputes**: Structured return requests (`returns`), refund records (`refunds`), and dispute escalation (`disputes`).

