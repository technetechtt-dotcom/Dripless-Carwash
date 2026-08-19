# CI/CD and branch protection

## Required on `main`

- Status check: `backend-check`
- Status checks: `app-checks` for Customer, Driver, and Ops
- Status checks: `codeql`, `security-audit`, `container-scan`, and `repository-scan`
- At least one fresh approving review from someone other than the last pusher
- Resolved review conversations
- No force-push or branch deletion
- Enforcement for administrators

The `main` branch protection rule is configured through the GitHub API. Keep the exact required check names aligned with `.github/workflows` when renaming jobs.

## Supply-chain security

- Dependabot checks every npm project and GitHub Actions weekly.
- Dependency Review blocks new high/critical vulnerable dependencies on pull requests.
- CodeQL runs the extended JavaScript/TypeScript query suite.
- Trivy scans repository secrets/misconfiguration and the backend container for high/critical findings.
- CI exports a CycloneDX SBOM as a workflow artifact.
- Third-party actions are pinned to immutable commit SHAs.
- Unit coverage gates run in every app and the backend; thresholds are encoded in the Vitest configs and fail CI on regression.

## Releases

Tag production deploys as `vYYYY.MM.DD`. Write notes from merged pull requests. Roll back by redeploying the previous immutable image tag and, if a migration is unsafe, restoring from backup using `docs/RESTORE.md`.

Production deployment must use a protected GitHub Environment with required reviewers. The API and worker deploy from the same image digest as staging, with `PROCESS_ROLE=api` and `PROCESS_ROLE=worker` respectively.

`release.yml` builds immutable frontend artifacts and a signed, attested backend image. Pushes to `main` target `staging`; `vYYYY.MM.DD.N` tags target the reviewer-protected `production` environment. Both environments require a scoped `DEPLOY_WEBHOOK_URL` secret. `rollback.yml` redeploys only a previously attested image digest through the same gate.

`database-backup.yml` requires isolated `production-backup` environment secrets for `DATABASE_URL`, `BACKUP_S3_URI`, `BACKUP_KMS_KEY_ID`, and AWS credentials. `restore-drill.yml` can only target a database URL visibly named `restore` or `drill` and requires the explicit `RESTORE_NON_PRODUCTION` confirmation.

## Mobile

Android/iOS signed builds remain a store-release pipeline step; see `MOBILE_APP_STORE_RELEASE.md`. Signing certificates and provisioning profiles belong in protected GitHub Environments and must never be committed.
