# FixMe.com — Production Security & Data Integrity Review

**Audit Scope:** Express Backend (`apps/server`), MongoDB Models, RBAC Permissions, Frontends (`apps/client`, `apps/admin`, `apps/seller`).  
**Standard:** OWASP Top 10 API Security Risks & Marketplace Data Integrity Principles.

---

## 1. Security Architecture Summary

FixMe.com implements a multi-layer defense strategy:
1. **Authentication:** JWT signed with HMAC-SHA256 using a minimum 32-character secret (`SESSION_SECRET`), distributed via `HttpOnly`, `SameSite=lax` secure session cookies and Bearer tokens.
2. **Authorization (RBAC):** Server-side role enforcement on every route via `requireRole('customer' | 'seller' | 'administrator' | 'super_administrator')`.
3. **Session Invalidation:** `tokenVersion` counter stored on `UserModel`. Changing password or revoking access increments `tokenVersion`, instantly invalidating active JWTs.
4. **CSRF Mitigation:** Double-submit / Header verification using cryptographically secure HMAC tokens (`x-csrf-token`) on all state-changing HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`).
5. **Rate Limiting:** Express-rate-limit applied to `/auth/*` routes, preventing brute-force credential stuffing and password recovery flooding.

---

## 2. Threat Vector Evaluation

### A. Broken Object Level Authorization (IDOR) & Seller Isolation
- **Risk:** Seller A modifying Seller B's spare-part listing, viewing private order details, or altering inventory counts.
- **Audit Findings:** Verified in `sellerTrustService.ts`. All listing queries and mutations strictly scope queries by `sellerId: req.user.id`.
- **Evidence:** `tests/sellerListings.test.ts` step 11 tests an intentional IDOR attack where Seller 2 attempts to adjust Seller 1's listing; server rejects with `403 OWNERSHIP_VIOLATION`.

### B. Broken Function Level Authorization & Privilege Escalation
- **Risk:** Public user self-assigning `administrator` role during registration.
- **Audit Findings:** `AuthController.register` explicitly inspects `req.body.role` and rejects any role other than `customer` or `seller` with `400 ROLE_ASSIGNMENT_PROHIBITED`.
- **Evidence:** Tested in `tests/auth.test.ts`.

### C. Mass-Assignment & Schema Poisoning
- **Risk:** Users injecting unauthorized fields like `isActive: true`, `isEmailVerified: true`, `role: 'super_administrator'`.
- **Audit Findings:** All incoming request bodies are filtered through strict Zod schemas (`packages/validation`) before reaching controllers. Unknown or unauthorized fields are stripped.

### D. Media Storage & Private Asset Access Control
- **Risk:** Unauthorized access to sensitive KYC identity documents or dispute evidence photos.
- **Audit Findings:** Asset records distinguish `visibility: 'public'` (product photos) vs `visibility: 'private'` (KYC, dispute evidence). Private assets require authorized session and ownership/admin permission to generate download access intents.
- **Evidence:** Verified in `tests/security.test.ts`.

### E. Financial Arithmetic & Rounding Exploits
- **Risk:** Floating-point rounding discrepancies resulting in fractional currency loss during checkout, commission splitting, or tax calculation.
- **Audit Findings:** The entire commerce engine uses integer arithmetic in paise (`pricePaise`, `subtotalPaise`, `platformFeePaise`, `sellerPayoutPaise`). Floating-point prices are strictly rejected by validation schemas.

---

## 3. Findings & Remediation Summary

| Vulnerability / Risk | Severity | Status | Remediation Detail |
| :--- | :--- | :--- | :--- |
| **Compound Unique Index Collision on Nulls** | High | **FIXED** | Replaced sparse compound index with MongoDB partial filter expression on `sellerSku`. |
| **Misclassified 403 on Expired Session** | Medium | **FIXED** | `rbac.ts` updated to return 401 and clear session cookie when user record is missing. |
| **Whitespace Bypass in Stock Movement Reason** | Medium | **FIXED** | Zod schema reordered to trim whitespace before evaluating `.min(3)`. |
| **Development Brute-Force Lockout** | Low | **FIXED** | Bypassed 15-minute lock in non-production for configured bootstrap credentials. |
| **Production Key Rotation** | Informational | **OPEN** | Rotate sandbox payment keys (`PAYMENT_SECRET_KEY`) to production credentials prior to launch. |

