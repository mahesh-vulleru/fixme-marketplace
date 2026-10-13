# 10 — Testing Plan & Verification Matrix (FixMe.com)

## 1. Automated Test Suites (`apps/server/tests/`)

1. **`tests/health.test.ts` (Phase 1 — Foundation)**:
   - Validates `ServerEnvSchema` and fails startup clearly when required variables are missing.
   - Verifies `GET /api/v1/health` and `X-Request-Id` tracing header.
   - Verifies structured 404 error responses.
2. **`tests/catalogue.test.ts` (Phase 2 — Catalogue, Compatibility & Assets)**:
   - Seeds verified categories, brands, canonical devices, canonical parts, compatibility records, and listings.
   - Verifies `POST /api/v1/compatibility/check` and `GET /api/v1/devices/:id/parts` strictly use `compatibilityRecords`.
   - Verifies integer `pricePaise` enforcement (rejecting floating-point prices).
   - Verifies `POST /api/v1/assets/upload-intent` and `POST /api/v1/assets/:id/complete`.
3. **`tests/auth.test.ts` (Phase 3 — Accounts, RBAC, CSRF & Moderation)**:
   - Verifies customer registration, bcrypt login, `httpOnly` session cookie, and CSRF token enforcement.
   - Verifies 7-role RBAC, seller KYC approval workflow, listing moderation, and immutable `AuditLog` entries.
4. **`tests/commerce.test.ts` (Phase 4 — Commerce & Webhooks)**:
   - Verifies server-recalculated cart in integer paise.
   - Verifies multi-seller parent order + suborders splitting.
   - Verifies atomic stock reservation under concurrent last-unit checkout race conditions.
   - Verifies signed & idempotent payment webhooks (`POST /api/v1/webhooks/payments/:provider`).
   - Verifies reservation expiry job releasing overdue reserved stock.
5. **`tests/sellerTrust.test.ts` (Phase 5 — Seller Operations & Trust)**:
   - Verifies seller inventory adjustment (`PATCH /api/v1/seller/inventory/:listingId`) and `InventoryMovement` ledger.
   - Verifies suborder shipping (`POST /api/v1/orders/:id/ship`), shipment tracking, and seller payouts (`GET /api/v1/seller/payouts`).
   - Verifies verified-purchase review enforcement (`POST /api/v1/reviews`).
   - Verifies wanted-part requests, seller offers, and dispute resolution.
6. **`tests/security.test.ts` (Phase 6 — Production Security Hardening)**:
   - Verifies IDOR protection on customer orders and seller resources.
   - Verifies privilege escalation rejection across all protected routes.
   - Verifies exact-origin CORS enforcement and upload abuse rejection.

