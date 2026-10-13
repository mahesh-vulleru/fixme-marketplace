# FixMe.com — Remaining Operational Risks & Production Rollout Roadmap

This document outlines unresolved external dependencies, operational assumptions, and recommended steps prior to live public launch.

---

## 1. Unresolved Dependencies & External Integrations

### A. Payment Gateway Production Cutover
- **Current State:** Configured with `PAYMENT_PROVIDER=razorpay_sandbox` and mock test credentials (`rzp_test_sandbox_secret_key`).
- **Remaining Risk:** Live customer card transactions, UPI QR generation, and automated bank settlements require activating a verified Razorpay Merchant Account and supplying production API credentials.
- **Action Required:** Update `.env` with live `PAYMENT_KEY_ID`, `PAYMENT_SECRET_KEY`, and configure live webhook endpoint `/api/v1/payments/razorpay/webhook` in the Razorpay dashboard.

### B. Media Asset Storage (Cloudinary / S3)
- **Current State:** Pre-signed upload intent pattern configured with local fallback and demo Cloudinary cloud name (`demo_cloud`).
- **Remaining Risk:** Large multi-vendor catalogs and dispute evidence uploads will exhaust local storage on single-server deployments.
- **Action Required:** Provision a production Cloudinary bucket or AWS S3 bucket with strict IAM access policies and configure environment keys.

### C. Transactional Email Delivery (Resend / SendGrid)
- **Current State:** Development mock key (`re_test_sandbox_email_key`).
- **Remaining Risk:** Password reset emails and order confirmation notifications are logged to stdout rather than dispatched via SMTP/REST.
- **Action Required:** Verify domain DNS records (SPF, DKIM, DMARC) with email provider and input live API token into `EMAIL_PROVIDER_API_KEY`.

---

## 2. Infrastructure & Production Operational Safeguards

### A. MongoDB Replica Set for Distributed Transactions
- **Current State:** Running against standalone MongoDB instance `mongodb://127.0.0.1:27017/fixme`.
- **Remaining Risk:** MongoDB multi-document transactions (e.g. checkout atomic cart clearing and stock deduction) require an active replica set (`rs0`).
- **Action Required:** Initialize replica set on MongoDB instance (`rs.initiate()`) prior to production deployment.

### B. Reverse Proxy & SSL Termination
- **Current State:** Node.js Express server running directly on HTTP port 5000.
- **Action Required:** Deploy behind NGINX, Cloudflare, or AWS ALB with HTTPS/TLS 1.3 encryption, HTTP/2, and secure cookie domain binding (`secure: true`, `sameSite: 'strict'`).

---

## 3. Recommended Production Rollout Phasing

1. **Phase 1 (Staging Verification):** Connect production-like MongoDB replica set and test live Razorpay webhooks using test payments.
2. **Phase 2 (Pilot Seller Onboarding):** Invite a controlled cohort of 5–10 electronics parts vendors to populate the verified catalogue, upload genuine SKU inventories, and verify fulfillment workflows.
3. **Phase 3 (Public Beta):** Open customer registration, initiate real device repair orders, and monitor dispute rates and payout reconciliations.

