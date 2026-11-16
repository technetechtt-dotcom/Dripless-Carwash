# Database Backup and Restore Runbook

## Overview

Dripless uses managed PostgreSQL (Neon/RDS) with automated daily backups and point-in-time recovery. A scheduled GitHub Actions workflow (`database-backup.yml`) creates additional periodic dumps.

---

## Backup Configuration

### Managed Database (Recommended)
- Enable automated daily backups on your managed PostgreSQL provider
- Set minimum 14-day retention in production
- Enable point-in-time recovery (PITR) where supported
- Keep backup database separate from the application S3 bucket

### Scheduled Dump Workflow
The `database-backup.yml` workflow runs nightly and:
1. Creates a PostgreSQL custom-format dump (`pg_dump -Fc`)
2. Computes a SHA-256 manifest of the dump
3. Uploads to S3 with KMS server-side encryption
4. Retains the last 30 dumps (lifecycle rule on backup bucket)

Configure these secrets in GitHub:
- `BACKUP_DATABASE_URL` — production database URL
- `BACKUP_S3_BUCKET` — dedicated backup bucket (separate from evidence)
- `BACKUP_S3_KEY_ID` — S3 access key
- `BACKUP_S3_SECRET_KEY` — S3 secret key
- `BACKUP_KMS_KEY_ID` — KMS key ARN for server-side encryption

---

## Restore Procedure

### Step 1: Download the backup

```bash
# From S3 (using AWS CLI)
aws s3 cp s3://$BACKUP_S3_BUCKET/dripless-YYYY-MM-DD.backup ./dripless-restore.backup
aws s3 cp s3://$BACKUP_S3_BUCKET/dripless-YYYY-MM-DD.backup.sha256 ./dripless-restore.backup.sha256

# Verify checksum
sha256sum -c dripless-restore.backup.sha256
```

### Step 2: Provision a restore target

Create a fresh database (do not overwrite production):

```bash
# Example with psql — create an isolated restore database
psql $ADMIN_DATABASE_URL -c "CREATE DATABASE dripless_restore;"
export RESTORE_DATABASE_URL="postgresql://USER:PASS@HOST/dripless_restore?sslmode=require"
```

### Step 3: Restore the dump

```bash
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  -d "$RESTORE_DATABASE_URL" \
  dripless-restore.backup
```

### Step 4: Verify migration state

```bash
cd backend-api
DATABASE_URL="$RESTORE_DATABASE_URL" npx prisma migrate status
```

Expected output: all migrations applied, no pending migrations.

### Step 5: Run the test suite against the restore

```bash
cd backend-api
DATABASE_URL="$RESTORE_DATABASE_URL" \
  REDIS_URL="redis://localhost:6379" \
  NODE_ENV=test \
  npm run test
```

Expected: all tests pass. If tests fail, document which tests and why.

### Step 6: Document the drill result

Record the following in `docs/RESTORE_DRILL_LOG.md`:

```
Date: YYYY-MM-DD
Performed by: [name]
Backup taken from: [date of backup used]
Restore target: [database name/host]
Migration status: ✅ / ❌ [details]
Test result: ✅ / ❌ [details]
Time to restore: [minutes]
Issues found: [none / describe]
Actions taken: [none / describe]
```

### Step 7: Tear down the restore target

```bash
psql $ADMIN_DATABASE_URL -c "DROP DATABASE dripless_restore;"
```

---

## Point-in-Time Recovery (PITR)

For Neon or AWS RDS with PITR enabled:

```bash
# Neon: restore to a branch at a specific timestamp
neon branches create --name restore-drill --timestamp "2026-08-01T12:00:00Z"

# Verify by running test suite against the Neon restore branch URL
DATABASE_URL="$NEON_RESTORE_BRANCH_URL" npm --prefix backend-api run test
```

---

## Quarterly Drill Schedule

| Quarter | Scheduled | Completed | Performed By | Result |
|---------|-----------|-----------|--------------|--------|
| Q3 2026 | 2026-09-30 | — | — | — |
| Q4 2026 | 2026-12-31 | — | — | — |

---

## Redis Backup

Redis is used for distributed locks, rate limiting, and job deduplication. It is **not** the primary data store. On restart, the job queue and locks reset from PostgreSQL state.

If using Redis Cluster (production), enable AOF persistence and snapshots with your managed Redis provider. For job queue recovery after Redis loss, re-enqueue scheduled jobs:

```bash
cd backend-api
DATABASE_URL="$DATABASE_URL" REDIS_URL="$REDIS_URL" \
  node -e "import('./dist/jobs/register.js').then(m => m.ensureScheduledJobs())"
```

---

## Object Storage (Evidence/Documents)

S3 buckets are protected with versioning and object lock. Evidence is retained for `EVIDENCE_RETENTION_DAYS` (default 90 days) and driver documents for `DRIVER_DOCUMENT_RETENTION_DAYS` (default 365 days). These are enforced by the background retention job.

To test storage recovery: verify that signed URLs still resolve correctly after a bucket restore drill.
