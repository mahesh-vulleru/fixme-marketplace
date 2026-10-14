# FixMe.com — Root-Cause Analysis & Defect Remediation Log

This document records the confirmed defects identified during the audit, the reproducible evidence, root causes, minimal fixes applied, regression tests added, and remaining risks.

---

### Issue 1: MongoDB Duplicate Key Error on Seeded Listings with Null SKU

- **Issue ID:** DEF-001
- **Severity:** High
- **Affected Feature:** Database seeding (`npm run seed`), listing upserts, and multiple listings without custom SKUs by the same seller.
- **Steps to Reproduce:**
  1. Add compound index `{ sellerId: 1, sellerSku: 1 }` with `{ unique: true, sparse: true }`.
  2. Create more than one listing for the same seller with `sellerSku: null` or omitted.
  3. Execute `npm run seed --workspace=@fixme/server`.
- **Expected Behavior:** Multiple listings without a custom seller SKU should be permitted under the same seller without violating uniqueness.
- **Actual Behavior:** MongoDB threw error: `E11000 duplicate key error collection: fixme.listings index: sellerId_1_sellerSku_1 dup key: { sellerId: ObjectId('...'), sellerSku: null }`.
- **Evidence:** Captured during `seed.ts` execution where seeding halted after the first listing.
- **Root Cause:** In MongoDB compound indexes, the `sparse` option only excludes a document if *all* indexed fields are absent. Because `sellerId` is always present, the index recorded `{ sellerId, sellerSku: null }` as a distinct key, causing subsequent listings with `null` SKU to collide.
- **Minimal Safe Fix:** Changed index specification in `Listing.ts` to use a MongoDB partial filter expression:
  ```ts
  ListingSchema.index(
    { sellerId: 1, sellerSku: 1 },
    { unique: true, partialFilterExpression: { sellerSku: { $type: 'string' } } }
  );
  ```
  Added explicit SKUs to sample seed listings in `seedData.ts`.
- **Regression Test:** Verified in `tests/sellerListings.test.ts` (multiple listings with same seller but distinct or omitted SKUs).
- **Verification Result:** PASS. Seeding runs with exit code 0.
- **Remaining Risk:** None. The index applies strictly to string values of `sellerSku`.

---

### Issue 2: 403 Forbidden Response on Stale Session Cookie

- **Issue ID:** DEF-002
- **Severity:** High
- **Affected Feature:** Session restoration (`GET /api/v1/auth/me`), browser session lifecycle across database resets.
- **Steps to Reproduce:**
  1. Sign in to obtain a valid JWT session cookie.
  2. Reset the development database or delete the user record.
  3. Refresh the browser at `http://localhost:5175` or `http://localhost:5173`.
- **Expected Behavior:** Server returns HTTP 401 Unauthorized, clears the stale cookie, and frontend transitions cleanly to signed-out state.
- **Actual Behavior:** Server returned HTTP 403 Forbidden with `ACCOUNT_SUSPENDED`. The browser retained the invalid cookie, causing repeated 403 errors on every subsequent request.
- **Evidence:** Browser console reported repeated `:5000/api/v1/auth/me:1 Failed to load resource: the server responded with a status of 403 (Forbidden)`.
- **Root Cause:** In `rbac.ts`, the authentication middleware evaluated:
  ```ts
  const userDoc = await UserModel.findById(decoded.id);
  if (!userDoc || !userDoc.isActive) {
    throw new AppError(403, 'ACCOUNT_SUSPENDED', 'User account is inactive or suspended');
  }
  ```
  When `userDoc` was null (user deleted or recreated with a new ObjectId), it conflated "user not found" with "user is suspended".
- **Minimal Safe Fix:** Differentiated the two conditions in `rbac.ts`:
  ```ts
  const userDoc = await UserModel.findById(decoded.id);
  if (!userDoc) {
    _res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    throw new AppError(401, 'INVALID_SESSION_TOKEN', 'Session user not found');
  }
  if (!userDoc.isActive) {
    throw new AppError(403, 'ACCOUNT_SUSPENDED', 'User account is inactive or suspended');
  }
  ```
- **Regression Test:** Verified in `tests/auth.test.ts`.
- **Verification Result:** PASS. Browser clears stale cookie and gracefully redirects to login.
- **Remaining Risk:** None.

---

### Issue 3: Stock Movement Validation Failure on Whitespace Reasons

- **Issue ID:** DEF-003
- **Severity:** Medium
- **Affected Feature:** Quick stock adjustment and Inventory ledger entry (`POST /api/v1/seller/listings/:id/stock-adjustments`).
- **Steps to Reproduce:**
  1. Submit stock adjustment with a reason containing only whitespace (`"   "`).
- **Expected Behavior:** Zod validation rejects the request with HTTP 400 Validation Error.
- **Actual Behavior:** Request bypassed Zod schema and triggered unhandled Mongoose `ValidationError: Path reason is required`, resulting in HTTP 500.
- **Evidence:** Server log showed `Unhandled Server Error ... InventoryMovement validation failed: reason: Path reason is required.`
- **Root Cause:** In `CreateStockAdjustmentSchema`, the field was declared as:
  ```ts
  reason: z.string().min(3).trim()
  ```
  Zod executes validation in declaration order. It evaluated `.min(3)` before `.trim()`, allowing three whitespace characters to pass, which then became empty string after trimming before database insertion.
- **Minimal Safe Fix:**
  1. Reordered Zod schema to trim before checking length:
     ```ts
     reason: z.string().trim().min(3, 'A clear reason is required for stock movements').max(300)
     ```
  2. Added defensive guard in `SellerTrustService.adjustSellerInventory`:
     ```ts
     if (!params.reason || !params.reason.trim()) {
       throw new AppError(400, 'REASON_REQUIRED', 'A clear reason is required for stock movements');
     }
     ```
- **Regression Test:** `tests/sellerListings.test.ts` step 10 asserts HTTP 400 for whitespace-only reasons.
- **Verification Result:** PASS.
- **Remaining Risk:** None.

---

### Issue 4: Stock Adjustment Movement Type Default Divergence

- **Issue ID:** DEF-004
- **Severity:** Medium
- **Affected Feature:** Legacy `PATCH /seller/inventory/:listingId` vs new `POST /seller/listings/:listingId/stock-adjustments`.
- **Steps to Reproduce:**
  1. Call `PATCH /api/v1/seller/inventory/:listingId` with `{ stockAvailable: 12, reason: 'Restocked' }` without explicit `movementType`.
- **Expected Behavior:** Records an `InventoryMovement` with `movementType: 'manual_adjustment'`.
- **Actual Behavior:** Dynamically assigned `movementType: 'restock'` when delta was positive, causing regression in existing `sellerTrust.test.ts` suite.
- **Evidence:** Vitest failure: `AssertionError: expected 'restock' to be 'manual_adjustment'`.
- **Root Cause:** Overly aggressive automatic inference in `sellerTrustService.ts`.
- **Minimal Safe Fix:** Updated `adjustSellerInventory` to default to `params.movementType || 'manual_adjustment'`. When callers explicitly pass `movementType: 'restock'`, it records `'restock'`; legacy callers defaulting to manual adjustment remain preserved.
- **Regression Test:** `tests/sellerTrust.test.ts` line 142 passes with 0 regressions.
- **Verification Result:** PASS.
- **Remaining Risk:** None.

---

### Issue 5: Non-Atomic Concurrency Window in Seller Inventory Adjustments

- **Issue ID:** DEF-005
- **Severity:** High
- **Affected Feature:** Rapid concurrent stock adjustments and simultaneous negative stock deductions.
- **Steps to Reproduce:**
  1. Have an item with 10 units in stock.
  2. Send 5 simultaneous requests calling `POST /seller/listings/:id/stock-adjustments` with `quantityDelta: -5`.
- **Expected Behavior:** Exactly 2 requests succeed (10 - 5 - 5 = 0), and 3 requests fail with HTTP 400 `NEGATIVE_STOCK_PREVENTED`. The database stock remains non-negative (0).
- **Actual Behavior (Prior Implementation):** Using `findById` followed by application-level calculation and `listing.save()` created a race condition where multiple concurrent requests could read the same `previousAvailable` before any write committed, potentially deducting beyond available units.
- **Evidence:** Identified during concurrent load audit of `adjustSellerInventory`.
- **Root Cause:** Application-level read-modify-write pattern instead of an atomic MongoDB conditional update.
- **Minimal Safe Fix:** Updated `SellerTrustService.adjustSellerInventory` to execute an atomic `ListingModel.findOneAndUpdate` with filter `{ _id, sellerId, stockAvailable: { $gte: Math.abs(delta) } }` and `$inc: { stockAvailable: delta }` for `quantityDelta` adjustments.
- **Regression Test:** `tests/sellerListings.test.ts` second test ("guarantees inventory consistency and non-negative stock under concurrent deduction requests").
- **Verification Result:** PASS (5 concurrent requests: exactly 2 succeeded, 3 rejected, final stock = 0).
- **Remaining Risk:** None. Enforced directly at the MongoDB database engine layer.

---

### Issue 6: Cross-Port Localhost Cookie Sharing Causing Auto-Redirect Trap & Unauthorized Subroute Fetch Errors

- **Issue ID:** DEF-006
- **Severity:** High
- **Affected Feature:** Multi-portal access (`apps/admin` port 5174, `apps/seller` port 5175, `apps/client` port 5173).
- **Steps to Reproduce:**
  1. Log into `http://localhost:5173` as a customer.
  2. In the same browser, navigate to `http://localhost:5174/login` or `http://localhost:5175/login`.
- **Expected Behavior:** User can view the login page, switch accounts, or sign into their staff/seller account.
- **Actual Behavior:** 
  1. The login pages' `useEffect` immediately invoked `window.location.href = crossUrl`, kicking the user back to `:5173`.
  2. If a subroute was directly opened (e.g. `:5175/listings`), child components fired requests (`/listings/mine`) carrying the customer cookie, resulting in `403 FORBIDDEN_ROLE: Role 'customer' does not have permission`.
- **Evidence:** Browser console reported repeated `403 (Forbidden)` and user reported `Role 'customer' does not have permission` on seller and admin screens.
- **Root Cause:** All frontends share the `fixme_session` cookie on `localhost`. Frontends unconditionally auto-redirected non-matching roles away from `LoginPage`, trapping users from signing into their legitimate roles, while layouts mounted `<Outlet />` before role verification finished.
- **Minimal Safe Fix:**
  1. In `apps/admin/src/pages/LoginPage.tsx` and `apps/seller/src/pages/LoginPage.tsx`, removed unconditional auto-redirect for mismatched roles; rendered an interactive "Switch Account / Sign Out Current Session" prompt while permitting sign-in.
  2. In `apps/admin/src/layouts/AdminLayout.tsx` and `apps/seller/src/layouts/SellerLayout.tsx`, replaced blind `window.location.href` redirects with an explicit Access Barrier screen without rendering `<Outlet />`, preventing unauthorized nested API calls.
- **Regression Test:** Monorepo typecheck, build, and automated authentication test suite verified.
- **Verification Result:** PASS.

---

### Issue 7: In-Memory CSRF Token Cache Causing Stale / Missing X-CSRF-Token Headers on Page Refresh & Logout Block

- **Issue ID:** DEF-007
- **Severity:** High
- **Affected Feature:** State-changing mutations (POST/PUT/PATCH/DELETE) and session termination (`POST /api/v1/auth/logout`).
- **Steps to Reproduce:**
  1. Refresh the browser page or open a new browser tab with an active session cookie.
  2. Immediately perform a mutation or attempt to log out before `refreshSession()` completed.
- **Expected Behavior:** Mutation includes valid CSRF header; logout succeeds unconditionally.
- **Actual Behavior:** Mutation and logout requests returned `403 CSRF_VALIDATION_FAILED: Missing or invalid X-CSRF-Token header for cookie-authenticated mutation`.
- **Evidence:** Browser console reported failed `POST /api/v1/auth/logout` with 403 Forbidden.
- **Root Cause:**
  1. Frontends held `csrfTokenCache` strictly in-memory in `apiClient.ts`. On page reload, the cache was null until `refreshSession()` settled.
  2. Backend `rbac.ts` enforced CSRF validation on all state-changing methods including `POST /auth/logout`, preventing users from clearing an invalid or out-of-sync session.
- **Minimal Safe Fix:**
  1. Exempted `POST /auth/logout` from CSRF token verification in `rbac.ts`.
  2. Added dedicated `GET /api/v1/auth/csrf-token` endpoint for session recovery.
  3. Updated `apiClient.ts` across `apps/client`, `apps/admin`, and `apps/seller` to persist and retrieve the CSRF token from `sessionStorage` (`fixme_csrf_token`).
- **Regression Test:** Verified in `tests/auth.test.ts` ("fetches CSRF token via GET /api/v1/auth/csrf-token and permits cookie logout without CSRF header").
- **Verification Result:** PASS.

---

### Issue 8: Seller KYC Application 409 Conflict on Existing Profile & Admin Moderation Model Mismatch

- **Issue ID:** DEF-008
- **Severity:** Medium
- **Affected Feature:** Seller KYC application re-submission, store profile updates, and admin KYC moderation queue.
- **Steps to Reproduce:**
  1. Register as a seller or submit initial KYC application via `POST /api/v1/seller/apply`.
  2. Update or re-submit business details.
  3. Open `http://localhost:5174/admin/moderation`.
- **Expected Behavior:** Profile updates smoothly; admin moderation displays store details and approval buttons.
- **Actual Behavior:** 
  1. Submitting again threw `409 SELLER_PROFILE_EXISTS`.
  2. Admin moderation displayed undefined values due to property mismatch (`s.approvalStatus` vs `s.status`, `s.legalBusinessName` vs `s.storeName`).
- **Minimal Safe Fix:**
  1. Updated `AuthService.applyForSeller` to update existing application details when present instead of throwing 409.
  2. Added `PATCH /api/v1/seller/profile` endpoint and service method for store settings updates.
  3. Corrected `AdminModerationPage.tsx` to read `s.status`, `s.userId?.fullName`, `s.userId?.email`, `s.businessAddress`, and added status filtering and listing moderation improvements.
  4. Enhanced `SellerProfilePage.tsx` and `SellerVerificationPage.tsx` with live KYC badges and interactive profile updates.
- **Regression Test:** Verified in `tests/auth.test.ts` ("updates seller profile via PATCH /api/v1/seller/profile and allows resubmitting application via POST /api/v1/seller/apply without 409 conflict").
- **Verification Result:** PASS.

