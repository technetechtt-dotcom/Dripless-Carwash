# Evidence upload — private object storage

## Automated (CI / local)

`backend-api/src/evidence/s3-integration.test.ts` runs only when:

```bash
EVIDENCE_STORAGE_PROVIDER=s3
S3_BUCKET=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
# optional: S3_ENDPOINT, S3_REGION, S3_FORCE_PATH_STYLE
```

```bash
cd backend-api
npm test -- src/evidence/s3-integration.test.ts
```

Without credentials the suite is skipped (exit 0). Unit validation still runs in `storage.test.ts`.

## Manual staging drill

1. Set staging `EVIDENCE_STORAGE_PROVIDER=s3` with a **private** bucket (Block Public Access on).
2. Complete a wash with before/after photos from a real phone on mobile data.
3. Confirm objects land under `evidence/...` and are not anonymously readable.
4. Ops/customer download via signed URL only; confirm URL expires.
5. Replay upload on poor network; confirm checksum/complete flow.

Record results in `docs/CLOSED_PILOT_RUNBOOK.md` § Evidence.
