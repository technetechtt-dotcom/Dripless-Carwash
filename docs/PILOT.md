# Pilot readiness

Pilot area: Sandton (`sandton-pilot` service zone).

## Before first real wash

- [ ] Staging and production databases are separate
- [ ] Paystack live keys only in production
- [ ] Mapbox or Google geocoding keys configured
- [ ] FCM server key configured for push
- [ ] Object storage configured for evidence
- [ ] MFA enabled for every ops admin
- [ ] Database restore drill completed
- [ ] `/health` and `/ready` monitored
- [ ] Cancellation/refund policy reviewed with support

## Test script

1. Customer registers, verifies email, saves a vehicle and address.
2. Book a wash inside the zone; pay with stub/Paystack.
3. Driver receives job, accepts, uploads before/after photos, completes PIN.
4. Decline and timeout redispatches.
5. Cancel before en route (full refund) and after dispatch (fee).
6. Failed payment retries and Ops payment-failure KPI increments.
7. Driver goes offline; job is not assigned to them.
8. Poor GPS: location still accepted, spoof flag if jump is extreme.
9. Ops handles an incident and a complaint.
10. Restore a backup into staging.

Collect customer and driver feedback, then fix blockers before expanding the zone.
