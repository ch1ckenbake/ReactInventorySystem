# Backend (Deprecated)

This directory contains the original Express.js and SQLite backend code.

## Status: ⚠️ DEPRECATED

This code is kept for reference only. The project has been migrated from:
- **Old**: Express server (server.ts) with SQLite database
- **New**: Vercel serverless functions (`/api`) with PostgreSQL

## Files

- `server.ts` - Original Express server (no longer used)
- `db.ts` - Original SQLite database setup (migrated to `/lib/db.ts`)
- `googleDrive.ts` - Google Drive integration (needs migration to `/api/sync/`)
- `dbRestore.ts` - Database restore logic (needs migration to serverless)
- `dbSchema.ts` - Schema definitions (converted to PostgreSQL in `/lib/db.ts`)
- `schema.sql` - SQL schema (converted to `lib/db.ts`)
- `*.prod.*` - Production builds (obsolete)
- `restore.test.ts` - Test file (obsolete)

## Migration Path

The new serverless API structure is in `/api`:
- Each endpoint is a separate function
- Database operations use Vercel Postgres (`lib/db.ts`)
- Google Drive sync needs to be refactored for serverless

## Removing This Directory

If you want to clean up after confirming everything works:
```bash
rm -rf backend/  # or delete via file explorer
```

**Recommendation**: Keep for now in case you need to reference the original logic.

---
**See**:
- `/api` - New serverless functions
- `/lib/db.ts` - New PostgreSQL setup
- `MIGRATION_GUIDE.md` - Migration details
