# Database backup and restore

## Managed Postgres (Neon / RDS)

1. Confirm automated daily backups and point-in-time recovery are enabled.
2. Keep at least 14 days of backup retention for production.
3. Quarterly, restore a backup into a throwaway database and run `npx prisma migrate status` plus `npm --prefix backend-api run test`.

## Restore procedure

```bash
# Example: restore a dump into a new database, then point a staging API at it.
pg_restore --clean --if-exists --no-owner -d "$RESTORE_DATABASE_URL" dripless.backup
cd backend-api
DATABASE_URL="$RESTORE_DATABASE_URL" npx prisma migrate status
DATABASE_URL="$RESTORE_DATABASE_URL" npm run test
```

Document the restore time, who performed it, and any data gaps. After a production incident restore, rotate credentials and invalidate sessions (`POST /auth/logout-all` per user or revoke all `Session` rows).
