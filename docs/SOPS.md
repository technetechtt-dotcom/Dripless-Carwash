# Standard operating procedures

## Driver onboarding

1. Driver signs up and uploads SA ID, licence, proof of address, vehicle papers, insurance.
2. Ops reviews documents (`POST /ops/drivers/:id/documents/:docId/review`).
3. Rejection includes a reason; driver re-submits.
4. Verified drivers may go online and start a shift.

## Quality control

Washes require BEFORE and AFTER evidence plus a completion PIN outside demo mode. Rewash requests are recorded on the wash checklist.

## Complaints

Customers file a complaint with a category. Ops owns the incident, escalates high severity, and may refund under the cancellation policy.

## Refunds

- Free cancel before en route
- R25 fee after dispatch
- No refund in progress/completed except approved quality complaints
- Partial refunds are first-class (`POST /payments/:id/refunds`)

## Suspensions

Ops can set customer or driver `status=SUSPENDED`. Suspended customers cannot book. Suspended drivers cannot be dispatched.

## Consumables

Inventory items have thresholds. Driver kit quantities below threshold should be replenished before the next shift.

## Support SLAs

| Severity | Ack | Resolve |
|---|---|---|
| high | 15 min | 4 hours |
| medium | 1 hour | 1 business day |
| low | 4 hours | 3 business days |

## Service-area launch

1. Draw the polygon in `ServiceArea`.
2. Load wash packages and add-ons.
3. Enrol verified operators.
4. Connect Paystack live/test as appropriate.
5. Run the pilot checklist in `docs/PILOT.md`.
