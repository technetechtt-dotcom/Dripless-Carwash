# Dripless-Carwash

This workspace contains one platform with three apps and one shared backend:

- `Dripless Customer`
- `Dripless Driver`
- `Dripless Ops Admin`
- `backend-api`

All three apps communicate through `backend-api`.

## Quick start

1. Install all dependencies:

```bash
npm run install:all
```

2. Start the full system (backend + all three apps):

```bash
npm run dev:all
```

3. Verify all services are reachable:

```bash
npm run health
```

4. Run a backend communication smoke test:

```bash
npm run smoke:api
```

5. Stop all stack services:

```bash
npm run stop:all
```

## Individual services

- Backend: `npm --prefix "backend-api" run dev`
- Customer: `npm --prefix "Dripless Customer" run dev`
- Driver: `npm --prefix "Dripless Driver" run dev`
- Ops Admin: `npm --prefix "Dripless Ops Admin" run dev`

## Default local endpoints

- Backend API: `http://localhost:4000`
- Customer app: `http://localhost:5173`
- Driver app: `http://localhost:5174`
- Ops admin app: `http://localhost:5175`
