# Evidence upload — private object storage

## Automated (CI)

Job `evidence-s3` boots ephemeral **MinIO**, creates a private bucket, and runs:

```bash
cd backend-api
EVIDENCE_STORAGE_PROVIDER=s3 \
S3_BUCKET=dripless-evidence \
S3_ACCESS_KEY=... S3_SECRET_KEY=... \
S3_ENDPOINT=http://127.0.0.1:9000 \
S3_FORCE_PATH_STYLE=true \
npm test -- src/evidence/s3-integration.test.ts
```

Without credentials the suite is skipped (exit 0). Unit validation still runs in `storage.test.ts`.

Production bucket provisioning: `docs/EVIDENCE_PRODUCTION.md`.

## Manual staging drill

1. Set staging `EVIDENCE_STORAGE_PROVIDER=s3` with a **private** bucket (Block Public Access on).
2. Complete a wash with before/after photos from a real phone on mobile data.
3. Confirm objects land under `evidence/...` and are not anonymously readable.
4. Ops/customer download via signed URL only; confirm URL expires.
5. Replay upload on poor network; confirm checksum/complete flow.

Record results in `docs/CLOSED_PILOT_RUNBOOK.md` § Evidence.
