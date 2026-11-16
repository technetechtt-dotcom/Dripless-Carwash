# Restore drill log

CI job `backup-restore-drill` dumps a freshly migrated Postgres database and restores it into `dripless_restore_drill`, then runs `prisma migrate status`.

Production/staging restore drills (real encrypted backups) use `.github/workflows/restore-drill.yml` with environment `restore-drill` and confirmation `RESTORE_NON_PRODUCTION`. See `docs/RESTORE.md`.

| Date (UTC) | Environment | Backup object / method | Result | Operator |
|------------|-------------|------------------------|--------|----------|
| (CI) | GitHub Actions | pg_dump → pg_restore of migrated schema | Recorded by CI run | automation |
