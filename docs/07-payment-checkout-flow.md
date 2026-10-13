# 07 — Payment, Atomic Stock Reservation & Checkout Flow (FixMe.com)

## 1. End-to-End Checkout Sequence

```text
Customer Cart (GET /api/v1/cart)
      ↓
Server Recalculates Line Items & Paise Totals from DB
      ↓
POST /api/v1/checkout
      ↓
Atomic Stock Reservation (stockAvailable -= qty, stockReserved += qty)
      ↓
Parent Order Created + Suborders Split by SellerId
      ↓
Payment Intent Created (Pending Payment, 15-min Expiry)
      ↓
Signed Webhook POST /api/v1/webhooks/payments/:provider
      ↓
HMAC-SHA256 Signature Verified + Idempotency Checked (eventId)
      ↓
Payment Captured -> Order & Suborders Marked 'paid' -> Stock Committed
```

---

## 2. Concurrency & Race-Condition Safety
- **Atomic Conditional Update**: During `POST /api/v1/checkout`, each listing is reserved using an atomic MongoDB filter `{ _id: listingId, status: 'active', stockAvailable: { $gte: quantity } }`.
- **Two Buyers, Last Unit**: If two buyers simultaneously attempt to checkout the last unit (`stockAvailable = 1`), MongoDB atomically grants the reservation to exactly one buyer (`201 Created`) and rejects the second (`409 INSUFFICIENT_STOCK`).
- **Batch Rollback**: If a multi-item cart fails stock reservation on the 2nd item, the 1st item's reservation is immediately rolled back.
- **Reservation Expiry Job**: If payment is not captured within 15 minutes (`reservationExpiresAt < now`), `expireOverdueReservations` releases `stockReserved` back into `stockAvailable` and logs an `inventoryMovements` `release` entry.

