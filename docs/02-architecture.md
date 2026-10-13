# 02 — System Architecture (FixMe.com)

## 1. Monorepo Architecture

```text
fixme-marketplace/
├── apps/
│   ├── client/          # Customer web app (React + Vite + Tailwind, port 5173)
│   ├── admin/           # Combined Admin & Seller Portal (React + Vite + Tailwind, port 5174)
│   └── server/          # Shared REST API v1 Server (Node.js + Express + Mongoose, port 5000)
├── packages/
│   ├── shared-types/    # Domain enums, entity interfaces, and DTO types
│   ├── validation/      # Shared Zod schemas for request and env validation
│   └── api-contracts/   # API v1 route map and response envelope contracts
├── docs/                # Engineering & operational documentation (01–10)
└── infrastructure/      # Docker, Nginx, and deployment configurations
```

---

## 2. Single Shared API Principle
Both `apps/client` (Customer Website) and `apps/admin` (Admin + Seller Portal) communicate exclusively with `apps/server` over `/api/v1`.
- **Exact-Origin CORS**: Only `CLIENT_URL` and `ADMIN_URL` are permitted origins. Wildcard `*` is prohibited.
- **Request Tracing**: Every HTTP request is assigned an `X-Request-Id` UUID v4 header, included in structured logs and error responses.
- **Redacting Structured Logger**: Logs JSON entries with automatic redaction of passwords, tokens, cookies, and secrets.

---

## 3. Separation of Concerns in `apps/server`
- `controllers/`: HTTP request/response handling only.
- `services/`: Transactional business logic, atomic stock reservation, compatibility verification, and order splitting.
- `models/`: Mongoose schemas and indexes.
- `permissions/`: Role-based access control (`requireRole`) and resource ownership verification.
- `integrations/`: Pluggable adapters for object storage (`storage`), payment gateways (`payments`), shipping (`shipping`), and notifications (`notifications`).

