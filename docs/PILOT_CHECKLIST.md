# Dripless Pilot Readiness Checklist

Use this as the gate before onboarding real customers.

## Infrastructure

- [ ] Separate staging database provisioned (not shared with production)
- [ ] Separate production database provisioned (managed PostgreSQL, `af-south-1` preferred for POPIA)
- [ ] Separate Redis for staging vs production
- [ ] Separate S3 buckets for staging vs production evidence
- [ ] TLS/HTTPS configured on all production domains
- [ ] Production DNS configured
- [ ] Paystack LIVE keys configured in production env only
- [ ] Paystack TEST keys used in staging env only

## Payments

- [ ] Paystack checkout tested end-to-end on staging
- [ ] Webhook signature verification tested (wrong key = 401)
- [ ] Duplicate webhook replayed → confirmed idempotent (no double-charge)
- [ ] Wrong amount webhook → confirmed rejected
- [ ] Wrong currency webhook → confirmed rejected
- [ ] Failed payment recovery flow tested
- [ ] Full refund tested on staging
- [ ] Partial refund tested on staging
- [ ] Chargeback/dispute webhook flow tested
- [ ] Wallet payment tested
- [ ] Payment reconciliation run against Paystack dashboard — 0 mismatches

## Maps and Location

- [ ] Mapbox or Google Maps API key configured in production
- [ ] Real address autocomplete tested in Kimberley/target area
- [ ] Service area polygon loaded for pilot zone
- [ ] Out-of-zone booking rejected with clear message
- [ ] Driver GPS updates working on real Android device
- [ ] ETA calculation returning reasonable values

## Notifications

- [ ] Firebase Cloud Messaging (FCM) service account configured
- [ ] Push notification delivered to a real Android device
- [ ] Transactional email (Resend) configured and tested
- [ ] Email verification email received and link works
- [ ] Booking confirmation email received
- [ ] If SMS required: Twilio/Africa's Talking tested

## Evidence Storage

- [ ] Production S3 bucket is private (no public access)
- [ ] Before-photo uploaded from a real phone on mobile data
- [ ] After-photo uploaded from a real phone on mobile data
- [ ] Upload on poor connection (slow 3G) tested
- [ ] Signed download URL works correctly
- [ ] EXIF metadata stripped on upload

## Security

- [ ] MFA required for all ops admin accounts (enforced at login)
- [ ] Ops MFA enrollment flow completed on real device
- [ ] Rate limiting tested (brute force login blocked)
- [ ] CORS blocks non-allowlisted origins
- [ ] All Paystack endpoints reject invalid signatures

## Monitoring

- [ ] `/health` returns 200 in production
- [ ] `/ready` returns 200 in production with DB and Redis healthy
- [ ] Sentry DSN configured — test error reported in Sentry
- [ ] Alert webhook configured — test alert delivered
- [ ] Dead job alerting verified (ALERT_WEBHOOK_URL receives dead_job events)

## Backups

- [ ] Database backup workflow run successfully
- [ ] Backup download and restore drill completed (see RESTORE_DRILL_LOG.md)
- [ ] Redis is non-primary (data loss on restart is acceptable)

## CI/CD

- [ ] All 8 CI checks green on main
- [ ] Release workflow builds and tags a production image
- [ ] Rollback workflow tested

## Pilot Operational Steps

- [ ] Pilot service zone loaded in database (`ServiceArea` record)
- [ ] Operating hours configured
- [ ] Wash packages and pricing loaded from seed
- [ ] At least 2 verified drivers onboarded with real documents
- [ ] Driver equipment/kit allocated

## Real Device Tests

- [ ] Customer signs up on physical Android/iOS phone
- [ ] Customer books a wash with real Paystack payment
- [ ] Driver receives job notification on phone
- [ ] Driver accepts job
- [ ] Driver navigates to customer location
- [ ] Driver takes before-photos
- [ ] Driver completes wash checklist
- [ ] Driver takes after-photos
- [ ] Driver enters completion PIN
- [ ] Customer receives completion notification
- [ ] Customer rates the service
- [ ] Cancellation before dispatch tested (full refund)
- [ ] Cancellation after dispatch tested (cancellation fee applied)
- [ ] Customer complaint submitted and ops notified
- [ ] Driver decline → auto-redispatch to next driver
- [ ] Assignment timeout → redispatch triggered
- [ ] Poor GPS signal handled gracefully

## Environmental Claims

- [ ] Water usage baseline validated (traditional wash = ~150L)
- [ ] Dripless water usage recorded during pilot wash
- [ ] `waterLitresUsed` field populated correctly
- [ ] Customer eco-points awarded correctly

## Legal

- [ ] Customer terms and conditions finalised and reviewed by legal
- [ ] Privacy/POPIA policy finalised
- [ ] Cancellation and refund policy finalised
- [ ] Driver agreement finalised

---

## Sign-off

Before expanding beyond the pilot:
- [ ] All pilot blockers resolved
- [ ] Pilot feedback reviewed
- [ ] Data quality verified (no corrupted records)
- [ ] Performance acceptable under pilot load
