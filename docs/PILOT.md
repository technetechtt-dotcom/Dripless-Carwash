# Closed Pilot — Locked Configuration

**Pilot area (locked):** Sandton — slug `sandton-pilot`  
**Source of truth:** `backend-api/src/config/pilot.ts` (seeded by `prisma/seed.ts`)

Do **not** expand the polygon or add a second city until the critical milestone passes.

## Service zone

| Field | Value |
|-------|--------|
| Name | Sandton pilot |
| Slug | `sandton-pilot` |
| Hours | **07:00–18:00** Africa/Johannesburg |
| Weather hold | Off by default |
| Polygon | See `PILOT_CONFIG.area.polygon` (Sandton CBD / northern suburbs) |

Bookings outside the polygon or outside operating hours are rejected by `assertInServiceArea`.

## Packages (ZAR cents)

| Package | Sedan | SUV | Bakkie | Truck | Duration |
|---------|------:|----:|-------:|------:|---------:|
| Express exterior | R15.99 | R18.99 | R20.99 | R24.99 | 35 min |
| Full valet | R24.99 | R28.99 | R30.99 | R35.99 | 55 min |

## Add-ons

| Add-on | Price | Duration |
|--------|------:|---------:|
| Mat cleaning | R3.50 | 10 min |
| Upholstery clean | R9.00 | 20 min |
| Interior detail add-on | R7.00 | 15 min |

## Surcharges

| Rule | Amount |
|------|-------:|
| Heavy dirt / mud (`HEAVY_DIRT`) | R5.00 |

## Cancellation (locked)

| Booking state | Refund | Fee |
|---------------|--------|----:|
| PENDING / CONFIRMED (before en route) | Full | R0 |
| EN_ROUTE / ARRIVED | Refund minus fee | R25.00 |
| IN_PROGRESS / COMPLETED | No refund | — |

## Driver requirements (non-negotiable for live dispatch)

- Status `ACTIVE`, verification `VERIFIED`
- Online with GPS fresher than **120 seconds**
- Approved, non-expired: SA ID, driver's licence, vehicle registration
- Allocated equipment without open fault
- Consumables stock > 0

## Payments

- **Sandbox / test Paystack only** until payment suite is green
- Live keys only in production env after signed webhook + refund + reconciliation proofs
- Currency: ZAR

## Critical milestone (must pass on staging)

```
Customer registers → books inside zone → pays (sandbox) →
driver dispatched → arrives → inspection → before photos →
checklist → after photos → completion PIN → COMPLETED →
driver earning recorded → receipt/invoice → Ops audit trail
```

See `docs/CLOSED_PILOT_RUNBOOK.md` for the day-of execution script.
