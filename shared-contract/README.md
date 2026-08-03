# Shared Contract Runtime

Shared API client used by Customer, Driver, and Ops Admin.

## Modes

1. **Remote mode (default for real runs):** requires `VITE_API_BASE_URL` (or runtime base URL).
2. **Mock mode (UI-only demos):** explicitly set `VITE_USE_MOCK_API=true`.

Remote mode fails closed if no base URL is configured and mock is not enabled.

## Configure Remote Mode

- Env: `VITE_API_BASE_URL=http://localhost:4000`
- Runtime: `apiRuntimeConfig.setApiBaseUrl("https://api.example.com")`
- Or set `window.__DRIPLESS_API_BASE_URL__` before boot

## Auth + refresh

- Access tokens expire (backend default 15m); refresh is rotated via `POST /auth/refresh`
- Failed authenticated calls retry once after refresh rotation
- Session payload may include `emailVerified` and `mustChangePassword`

## Endpoint surface (remote)

Auth, bookings ownership/pricing, driver location/jobs, ops dashboard, specials, notifications, payments intent, evidence upload are provided by `backend-api`. See `backend-api/openapi.yaml`.
