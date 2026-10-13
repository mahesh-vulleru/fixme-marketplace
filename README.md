# FixMe.com — Find the Part. Fix the Device.

A multi-vendor electronics spare-parts marketplace where customers find and buy individual verified components (single earbuds, charging cases, phone batteries, charging ports, selected motherboards), sellers manage listings/inventory/orders, and administrators control the platform.

## Architecture

```text
Customer Client (apps/client)      Admin + Seller Portal (apps/admin)
               \                                /
          One API Server (apps/server - Node.js, Express, TypeScript)
            /             |               |                \
        MongoDB     Object Storage     Payments      Background Jobs
```

## Monorepo Structure

```text
fixme-marketplace/
├── apps/
│   ├── client/          # Customer website (React, Vite, TypeScript, Tailwind CSS)
│   ├── admin/           # Admin + seller portal (React, Vite, TypeScript, Tailwind CSS)
│   └── server/          # ONE backend (Node.js, Express, TypeScript, Mongoose)
├── packages/
│   ├── shared-types/    # Shared TypeScript domain & entity types
│   ├── validation/      # Shared Zod validation schemas
│   └── api-contracts/   # Request and response API contracts
├── docs/                # Numbered design documents (01 to 10)
├── infrastructure/      # Docker and deployment configurations
├── package.json
├── tsconfig.base.json
└── README.md
```

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Build shared packages:**
   ```bash
   npm run build:packages
   ```
3. **Seed verified development catalogue:**
   ```bash
   npm run seed
   ```
4. **Run applications:**
   - API Server (`:5000`): `npm run dev:server`
   - Customer Website (`:5173`): `npm run dev:client`
   - Admin & Seller Portal (`:5174`): `npm run dev:admin`
