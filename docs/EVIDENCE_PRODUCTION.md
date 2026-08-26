# Evidence storage — production provisioning

MinIO CI (`evidence-s3`) proves the code path. Production still needs a real private bucket.

## Checklist

| Item | Staging | Production |
|------|---------|------------|
| Private S3-compatible bucket (Block Public Access) | ☐ | ☐ |
| Dedicated IAM / access keys (no shared root) | ☐ | ☐ |
| Server-side encryption (SSE-S3 or KMS) | ☐ | ☐ |
| Retention policy (`EVIDENCE_RETENTION_DAYS`) | ☐ | ☐ |
| Signed URL download only (no public ACLs) | ☐ | ☐ |
| Access logging / CloudTrail | ☐ | ☐ |
| Malware scan hook (`MALWARE_SCAN_URL`) | ☐ | ☐ |
| Lifecycle delete after retention | ☐ | ☐ |
| Cross-region / backup copy of bucket | ☐ | ☐ |
| Secrets in GitHub Environments (never in repo) | ☐ | ☐ |

## Required env

See `backend-api/.env.production.example` and `backend-api/.env.staging.example`:

```
EVIDENCE_STORAGE_PROVIDER=s3
S3_BUCKET=...
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_REGION=af-south-1
S3_ENDPOINT=   # blank for AWS; set for MinIO/R2/etc
S3_FORCE_PATH_STYLE=false
```

## Proof

1. Run `docs/EVIDENCE_S3_DRILL.md` against staging.
2. Upload BEFORE/AFTER from Driver (including offline queue retry).
3. Confirm object is not anonymously readable.
4. Confirm signed download works and expires.

Record results in `docs/CLOSED_PILOT_RUNBOOK.md`.
