# 04 — REST API v1 Design (FixMe.com)

## 1. Standard Response Envelopes

All endpoints under `/api/v1` return a consistent JSON envelope with an `X-Request-Id` header.

### Success Envelope
```json
{
  "success": true,
  "data": { ... },
  "requestId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
}
```

### Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{ "path": "pricePaise", "message": "Expected integer, received float" }]
  },
  "requestId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
}
```

---

## 2. Core Endpoint Reference

### Health & Diagnostics
- `GET /api/v1/health` — Returns service health, environment, and MongoDB connection state.

### Catalogue & Structured Compatibility
- `GET /api/v1/categories` — List active hardware categories.
- `POST /api/v1/categories` — Create category (`catalogue_manager`, `administrator`, `super_administrator`).
- `GET /api/v1/brands` — List brands.
- `POST /api/v1/brands` — Create brand.
- `GET /api/v1/devices` — Search/filter canonical devices by `brandId`, `categoryId`, `q`/`search`.
- `GET /api/v1/devices/:id` — Get canonical device details.
- `GET /api/v1/devices/:id/parts` — Get all verified compatible canonical parts and active seller listings for a device.
- `POST /api/v1/devices` — Create canonical device.
- `GET /api/v1/parts` — Search/filter canonical spare parts (`componentType`, `brandId`, `categoryId`, `q`).
- `GET /api/v1/parts/:id` — Get canonical part details, compatible devices, and active multi-seller listings.
- `POST /api/v1/parts` — Create canonical part.
- `POST /api/v1/compatibility/records` — Create or update structured `CompatibilityRecord` linking `deviceId` and `partId`.
- `POST /api/v1/compatibility/check` — Verify exact compatibility between `deviceId` and `partId` using `compatibilityRecords`.
- `GET /api/v1/listings` — List active seller listings (`partId`, `condition`, `sellerId`).
- `POST /api/v1/listings` — Create seller listing with integer `pricePaise`.

### Asset Upload Flow
- `POST /api/v1/assets/upload-intent` — Validate MIME type and file size (max 10MB), create `pending` asset record, and return signed `uploadUrl` and `storageKey`.
- `POST /api/v1/assets/:id/complete` — Mark uploaded asset as `ready`.

