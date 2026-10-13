# 09 — Deployment & Operations Runbook (FixMe.com)

## 1. Local Development Commands
```bash
# Install all workspace dependencies
npm install

# Build shared packages (@fixme/shared-types, @fixme/validation, @fixme/api-contracts) and all 3 apps
npm run build

# Start API server (5000), Customer Client (5173), and Admin/Seller Portal (5174)
npm run dev:server
npm run dev:client
npm run dev:admin
```

---

## 2. Containerized Production Deployment
```bash
cd infrastructure
docker compose up --build -d
```

### Services Exposed
- `http://localhost:5000/api/v1/health` — Shared Backend API Server
- `http://localhost:5173` — Customer Marketplace Web App
- `http://localhost:5174` — Admin & Seller Operations Portal

