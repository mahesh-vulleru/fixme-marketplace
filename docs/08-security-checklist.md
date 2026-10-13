# 08 — Security Checklist & Threat Mitigations (FixMe.com)

## 1. Verified Security Controls

| Control Area | Implementation | Verified By |
|--------------|----------------|-------------|
| **Startup Secret Validation** | `ServerEnvSchema` (Zod) validates `MONGODB_URI`, `SESSION_SECRET`, `CLIENT_URL`, `ADMIN_URL`, `PAYMENT_WEBHOOK_SECRET` before server starts. | `tests/health.test.ts` |
| **Exact-Origin CORS** | Allowlist restricted strictly to `CLIENT_URL` and `ADMIN_URL` (`credentials: true`). Wildcard `*` is never used. | `tests/security.test.ts` |
| **Password & Session Security** | Bcrypt (`cost = 10`), `passwordHash` excluded (`select: false`), 5-attempt lockout, HTTP-only cookie (`fixme_session`). | `tests/auth.test.ts` |
| **CSRF Protection** | Cookie-authenticated mutations (`POST`, `PUT`, `PATCH`, `DELETE`) require timing-safe HMAC `X-CSRF-Token` verification. | `tests/auth.test.ts`, `tests/security.test.ts` |
| **7-Role RBAC & IDOR Defense** | `requireRole` + strict ownership checks on orders, returns, disputes, and seller inventory (`OWNERSHIP_VIOLATION`). | `tests/sellerTrust.test.ts`, `tests/security.test.ts` |
| **Upload Abuse Defense** | Strict MIME allowlist (`image/jpeg`, `image/png`, `image/webp`), 10MB cap, randomized `storageKey`, no binary bytes in MongoDB. | `tests/catalogue.test.ts`, `tests/security.test.ts` |
| **Atomic Stock Concurrency** | Conditional `findOneAndUpdate` with `stockAvailable: { $gte: quantity }` prevents overselling under concurrent checkouts. | `tests/commerce.test.ts` |
| **Webhook Signature & Idempotency** | HMAC-SHA256 verification via `PAYMENT_WEBHOOK_SECRET` + `processedEventIds` array prevents replay double-commits. | `tests/commerce.test.ts` |
| **Redacting Structured Logger** | Automatic redaction of `password`, `token`, `secret`, `cookie`, and `authorization` fields in JSON logs. | `middleware/logger.ts` |

