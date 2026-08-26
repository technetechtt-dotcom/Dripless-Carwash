# Environment separation (staging vs production)

Never share these between staging and production:

| Resource | Staging | Production |
|----------|---------|------------|
| PostgreSQL | `STAGING_DATABASE_URL` | `DATABASE_URL` |
| Redis | `STAGING_REDIS_URL` | `REDIS_URL` |
| Object storage | `STAGING_S3_*` | `S3_*` |
| Paystack / Ozow | **test** keys only | **live** keys only after sandbox sign-off |
| Secrets | `STAGING_MFA_ENC_KEY`, etc. | Production keys (different values) |
| Domains | staging-*.dripless.co.za | customer/driver/ops.dripless.co.za |

Compose files:

- Local demo: `docker-compose.yml`
- Staging: `docker-compose.staging.yml` + `backend-api/.env.staging.example`
- Production: `docker-compose.production.yml` + `backend-api/.env.production.example`

Production boot refuses unsafe config via `assertProductionConfiguration()` (Redis required, S3 evidence, MFA for Ops, Paystack **or Ozow** provider, separate API/worker roles, no localhost CORS).

See also:

- `docs/EVIDENCE_PRODUCTION.md`
- `docs/OZOW_SANDBOX_CHECKLIST.md`
- `docs/NOTIFICATIONS_FIELD_TEST.md`
- `docs/ANDROID_FIELD_TEST.md`

## Monitoring

- Liveness: `GET /health`
- Readiness: `GET /ready` (DB + Redis + job stats)
- Errors: `SENTRY_DSN`
- Ops alerts: `ALERT_WEBHOOK_URL` (payment failures, dead jobs, reconciliation)

## Backups

See `docs/RESTORE.md` and `.github/workflows/database-backup.yml`.
