# Dripless Release Engineering

**Current phase:** Release engineering and field validation — not major new product features.

## Feature freeze (recommended)

Do **not** spend the next sprint on:

- AI dispatch
- Marketplace expansion
- Unrelated service categories
- Complex loyalty mechanics
- New payment providers
- Social features

## Release target

One reliable loop, repeated under real conditions:

**Customer books → pays → Ops sees it → Driver accepts → GPS works → wash is proven → Customer completes → Driver gets paid → Ops reconciles.**

---

## P0 — before real-money pilot

| Check | Automated | Command |
|-------|-----------|---------|
| GitHub Actions green on `5732f4d+` | CI | `gh run list --branch main` |
| Full staged wash (API, no dev intervention) | Yes | `npx playwright test e2e/staged-wash.spec.ts` |
| Receipt/invoice after completion | Yes | `backend-api/src/release-engineering.test.ts` |
| Driver earning after completion | Yes | same |
| Ops finance + audit after completion | Yes | `e2e/ops-actions.spec.ts` |
| Cancellation/refund | Yes | `e2e/staged-wash.spec.ts` + release-engineering test |
| Ozow sandbox on Customer device | Manual | `node tools/pilot/ozow-sandbox-device.mjs` |
| Android locked-screen Driver GPS | Manual | `node tools/pilot/android-gps-locked.mjs` |
| FCM push delivery | Manual | `node tools/pilot/fcm-push-check.mjs` |
| Staging evidence upload (S3) | Semi-auto | `node tools/pilot/staging-evidence-upload.mjs` |

Run all automatable P0/P1 checks:

```bash
npm run check:pilot
```

Strict mode (fail if field env missing):

```bash
PILOT_STRICT=1 npm run check:pilot
```

---

## P1 — before public launch

| Area | Coverage |
|------|----------|
| Customer browser acceptance | `e2e/customer-acceptance.spec.ts`, `e2e/form-validation.spec.ts`, `e2e/page-matrix.spec.ts` |
| Driver browser/device | `e2e/driver-acceptance.spec.ts`, `tools/pilot/android-gps-locked.mjs` |
| Ops RBAC + actions | `e2e/ops-rbac.spec.ts`, `e2e/ops-actions.spec.ts` |
| Form validation errors | `e2e/form-validation.spec.ts` |
| Weak mobile data / network loss | `e2e/resilience-ui.spec.ts` |
| Duplicate webhooks | `backend-api/src/release-engineering.test.ts` |
| Stale Driver GPS | `backend-api/src/release-engineering.test.ts` |
| Load smoke | `node tools/pilot/load-smoke.mjs` |
| Penetration baseline | `node tools/pilot/pentest-baseline.mjs` |

Still manual or staging-required: Redis outage, DB outage, app killed/reopened, GPS permission revoked, evidence upload retry under flaky network.

---

## P2 — before regional scale

Tracked as product/engineering backlog (not in current sprint):

- Targeted Ops realtime reducers
- Operational SLA dashboards
- Fleet/customer organisation accounts
- Subscription billing
- Multi-zone dispatch
- Dynamic driver capacity
- Service inventory forecasting
- Driver scheduling/shifts
- Sophisticated pricing engine
- Fleet ESG reporting
- Multi-city support
- Central monitoring/SLOs
- Production disaster-recovery drills

---

## Verdict

Dripless is **pilot-capable** in code. Commercial readiness depends on passing P0 field validation (Ozow, GPS, FCM, staging evidence) and repeating the full wash loop on physical devices without developer intervention.
