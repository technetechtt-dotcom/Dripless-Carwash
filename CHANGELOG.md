# Changelog

All notable production changes are recorded here. Releases use immutable `vYYYY.MM.DD.N` tags.

## Unreleased

### Google Maps API

- Backend Google Places autocomplete uses Place Details for accurate lat/lng (Sandton-biased, ZA).
- Customer / Driver / Ops maps use Google Maps JS when `VITE_GOOGLE_MAPS_API_KEY` is set (Leaflet OSM fallback otherwise).
- Booking address fields use Places autocomplete via `/geo/autocomplete`.
- Navigation links open Google Maps directions.
- Docs: `docs/GOOGLE_MAPS.md`.

### Ozow payments (primary)

- Implemented full Ozow instant-EFT integration: `postpaymentrequest`, SHA512 HashCheck, signed notify webhook, amount/status handling.
- Customer checkout defaults to Ozow (wallet still available).
- Production config accepts `PAYMENTS_PROVIDER=ozow` with required Ozow secrets.
- Docs: `docs/OZOW.md`.

### Pilot-readiness execution

- Locked Sandton pilot config (`backend-api/src/config/pilot.ts`): zone polygon, 07:00–18:00 hours, packages, add-ons, cancellation fees, driver requirements.
- Seed + PlatformSetting now persist the locked pilot zone and policy keys.
- Added critical-path backend test: book → pay → assign → wash gate → complete → earning (+ unverified driver deny).
- Fixed CI breakers: Ops Finance types, Driver `phone: null`, dispatch assign endpoint/RBAC tests.
- Added `docs/CLOSED_PILOT_RUNBOOK.md`, refreshed `docs/PILOT.md`, added `docs/ENVIRONMENTS.md`.

### Platform hardening and pilot readiness

- Added separate `docker-compose.staging.yml` and `docker-compose.production.yml` with environment separation.
- Added `.env.staging.example` and `.env.production.example` with all required secrets documented.
- Enhanced `/health` endpoint with per-subsystem checks; returns 503 if Redis is down in production.
- Enhanced `/ready` endpoint with DB/Redis/job-stats; warns on dead job accumulation.
- Hardened Dockerfile: production-grade healthcheck, worker/api role separation, migration as separate step.
- Added `FinanceSection` to Ops dashboard: payments, refunds, disputes, and reconciliation tabs with CSV export.
- Added `/ops/reconcile` endpoint for on-demand payment reconciliation with audit logging.
- Added `financeApi` to shared API contract.
- Added `dispatch.test.ts`: dispatch race condition prevention, RBAC enforcement, pricing engine, and service-area tests.
- Added `docs/RESTORE.md`: full backup restoration runbook including PITR, Redis, and S3 recovery procedures.
- Added `docs/RESTORE_DRILL_LOG.md`: quarterly drill tracking.
- Added `docs/PILOT_CHECKLIST.md`: complete pre-pilot gate checklist.
- Updated CI workflow: added secret scanning (TruffleHog), dependency scanning (npm audit), migration drift detection.
- Pricing engine: vehicle-size multipliers (SUV +20%, bakkie +25%, truck +40%) and condition surcharges confirmed and tested.

### Previously (backend foundation)

- Hardened Paystack webhooks, refunds, settlement reconciliation, wallet accounting, payouts, and finance approvals.
- Added private evidence storage, signed transfers, image normalisation, retention, malware checks, and access auditing.
- Added real geocoding/routing, driver GPS freshness and spoof checks, atomic dispatch, SSE replay, and background workers.
- Completed customer account recovery, verification, vehicles, addresses, sessions, privacy requests, receipts, notifications, and support cases.
- Completed driver document, online-location, earnings, and payout-account workflows.
- Forced Ops MFA with TOTP recovery codes and WebAuthn passkeys.
- Added CodeQL, dependency review, SBOM, secret/container scans, protected deployments, backups, restore drills, and rollback automation.
