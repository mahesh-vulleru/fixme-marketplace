# 06 — Authentication, RBAC & Moderation (FixMe.com)

## 1. Seven-Role Access Matrix

| Role | Capabilities |
|------|--------------|
| `guest` | Browse catalogue, devices, parts, listings, and run compatibility checks. |
| `customer` | Manage cart, addresses, checkout, orders, returns, reviews, wanted-part requests, and apply to become a seller. |
| `seller` | Manage own store profile, create/edit listings, adjust stock (`inventoryMovements`), ship seller suborders, and offer on wanted-part requests. |
| `support_staff` | View customer orders, assist with return requests, and mediate buyer-seller disputes. |
| `catalogue_manager` | Create/update categories, brands, canonical devices, canonical parts, structured `compatibilityRecords`, and moderate listings. |
| `administrator` | Approve/reject/suspend seller KYC applications, moderate listings, resolve disputes, and view `auditLogs`. |
| `super_administrator` | Full platform governance and staff role assignment. |

---

## 2. Session & CSRF Architecture
- **Password Storage**: Bcrypt (`cost = 10`), `select: false` on Mongoose schema so `passwordHash` is never serialized.
- **Account Lockout**: 5 consecutive failed login attempts lock the account for 15 minutes (`429 ACCOUNT_TEMPORARILY_LOCKED`).
- **Dual Transport + CSRF Defense**:
  - Browser sessions use an `httpOnly`, `sameSite: lax` cookie (`fixme_session`).
  - Whenever a mutating request (`POST`, `PUT`, `PATCH`, `DELETE`) is authenticated via the `fixme_session` cookie, the `authenticate` middleware strictly verifies the HMAC-SHA256 `X-CSRF-Token` header using `crypto.timingSafeEqual`.
- **Immutable Audit Trail (`auditLogs`)**: Every seller application submission, seller KYC review, and listing moderation transition writes an immutable document to `auditLogs`.

