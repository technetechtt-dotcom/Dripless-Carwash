# CI/CD and branch protection

## Required on `main`

- Status check: `backend-check`
- Status check: `app-checks` (Customer, Driver, Ops)
- At least one approving review
- No force-push
- Linear history optional

Configure in GitHub: Settings → Branches → Add rule for `main`.

## Releases

Tag production deploys: `vYYYY.MM.DD`. Write notes from merged PRs. Rollback by redeploying the previous image tag and, if a migration is unsafe, restoring from backup (`docs/RESTORE.md`).

## Mobile

Android/iOS signed builds remain a store-release pipeline step (see `MOBILE_APP_STORE_RELEASE.md`). Wire Fastlane after signing certificates are in GitHub Environments.
