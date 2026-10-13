# 05 — Frontend Pages & User Flows (FixMe.com)

## 1. Customer Application (`apps/client` — Port 5173)

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `HomePage` | Hero search, live API health badge, category/brand showcase, and featured devices & parts. |
| `/compatibility` | `CompatibilityFinderPage` | Interactive Device + Part compatibility verifier backed by `POST /api/v1/compatibility/check` and `GET /api/v1/devices/:id/parts`. |
| `/parts/:id` | `PartDetailPage` | Canonical part technical specs, verified compatible device list, and multi-seller listings table sorted by `pricePaise`. |
| `/cart` | `CartPage` | Server-recalculated shopping cart displaying item condition, stock availability, and integer-paise breakdown. |
| `/checkout` | `CheckoutPage` | Shipping address form, atomic stock reservation trigger, and payment confirmation. |
| `/orders` | `OrdersPage` | Customer order history with per-seller suborder tracking, return requests, and verified review submission. |
| `/wanted` | `WantedPartsPage` | Post and track wanted-part requests for rare components and review seller offers. |
| `/auth` | `AuthPage` | Customer & seller registration, login, and role session status. |

---

## 2. Admin & Seller Portal (`apps/admin` — Port 5174)

### Admin Workspace (`/admin/*` — `AdminLayout`)
- `/admin` — Marketplace governance overview & API health.
- `/admin/catalogue` — Create & manage Categories, Brands, Devices, Canonical Parts, and Structured Compatibility Records.
- `/admin/moderation` — Approve/reject Seller KYC applications and moderate `pending_review` seller listings.
- `/admin/users` — Role management, dispute resolution, and return/refund oversight.
- `/admin/audit-logs` — Immutable security and moderation audit trail viewer.

### Seller Workspace (`/seller/*` — `SellerLayout`)
- `/seller` — Seller performance overview & store status.
- `/seller/listings` — Create listings against canonical parts, upload product photos via `/assets/upload-intent`, and adjust stock (`PATCH /seller/inventory/:listingId`).
- `/seller/orders` — View seller-specific suborders and mark shipments with carrier + tracking number.
- `/seller/settlements` — View platform fee deductions and net seller payouts in INR.
- `/seller/wanted` — Browse buyer wanted-part requests and submit binding offers.

