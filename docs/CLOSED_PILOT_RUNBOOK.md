# Closed Pilot Runbook

Use this when running the first controlled Sandton pilot. Do not add features during the run — only record blockers.

## 0. Pre-flight (same day)

- [ ] Staging DB / Redis / S3 / Paystack **test** keys are separate from production
- [ ] `GEOCODER_PROVIDER` + `ROUTING_PROVIDER` set (mapbox or google) with real keys on staging
- [ ] FCM service account configured; push tested on one Android device
- [ ] `EVIDENCE_STORAGE_PROVIDER=s3` on staging (not local)
- [ ] MFA enrolled for every Ops admin on staging
- [ ] `/health` and `/ready` return 200
- [ ] Latest `main` CI: backend-check + all three app-checks green
- [ ] Seed applied: `sandton-pilot` zone 07:00–18:00, packages/add-ons as in `docs/PILOT.md`
- [ ] 2–3 verified drivers onboarded with docs + kit + consumables
- [ ] Controlled customer accounts only (no public marketing)

## 1. Critical milestone (one full wash)

Record times and outcomes for **one** booking:

| Step | Result | Notes / time |
|------|--------|--------------|
| Customer register + email verify | ☐ | |
| Save vehicle (size class) + address inside zone | ☐ | |
| Book Express or Full valet | ☐ | |
| Paystack sandbox checkout succeeds | ☐ | |
| Webhook marks booking PAID once | ☐ | |
| Replay webhook → duplicate ignored | ☐ | |
| Ops sees booking; driver auto or manual assign | ☐ | |
| Driver accepts; EN_ROUTE | ☐ | |
| Live GPS visible in Ops | ☐ | |
| ARRIVED → before photos | ☐ | |
| Checklist + consumables note | ☐ | |
| After photos | ☐ | |
| Customer completion PIN → driver verifies | ☐ | |
| Status COMPLETED | ☐ | |
| Driver earning row created | ☐ | |
| Invoice/receipt available | ☐ | |
| Ops can see status history / finance trail | ☐ | |

**Pass criteria:** every row above is ☐ with no workaround.

## 2. Failure drills (same day)

| Drill | Pass? | Notes |
|-------|-------|-------|
| Decline job → redispatch | ☐ | |
| Accept timeout → redispatch | ☐ | |
| Driver offline → not assigned | ☐ | |
| Stale GPS (>120s) → not assignable | ☐ | |
| Cancel before en route → full refund | ☐ | |
| Cancel after dispatch → R25 fee | ☐ | |
| Failed payment → no PAID booking | ☐ | |
| Duplicate webhook → single success event | ☐ | |
| Out-of-zone address → rejected | ☐ | |
| Outside hours → rejected | ☐ | |
| Unverified driver → cannot receive job | ☐ | |
| Network loss during photo → retry/offline queue | ☐ | |
| Complaint opens incident | ☐ | |
| Restore staging backup smoke test | ☐ | |

## 3. Field metrics (per wash)

| Metric | Value |
|--------|-------|
| Customer wait / travel ETA accuracy | |
| Drive time (dispatch → arrive) | |
| Wash duration (arrive → complete) | |
| Water litres used (estimate vs actual) | |
| Consumable cost | |
| Customer rating / comments | |
| Driver comments | |
| Ops intervention required? | |

## 4. Go / no-go

**Go (expand carefully)** only if:

1. Critical milestone passed without code bypasses  
2. Payment failure drills passed on sandbox  
3. No P0 data-loss or double-charge bugs  
4. Restore drill logged in `docs/RESTORE_DRILL_LOG.md`

**No-go:** fix blockers on staging, re-run critical milestone, then reassess.

## 5. Explicit non-goals for this pilot

- No new cities or zones  
- No live Paystack until sandbox suite is signed off  
- No marketing launch  
- No broad feature work while blockers are open  
