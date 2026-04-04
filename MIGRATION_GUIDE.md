# Migration Guide: Desktop App → Web Deployment

## What Changed

### ❌ Removed
- **Windows launcher files** (.vbs, .bat scripts)
- **Installer scripts** (PowerShell build-installer scripts)
- **pkg/binary compilation** (no more .exe builds)
- **SQLite database** (replaced with PostgreSQL)
- **Offline-first sync logic** (moved to serverless functions)
- **Electron dependencies** (was never used, now confirmed removed)

### ✅ Added
- **Vercel serverless API** (`/api/...` endpoints)
- **PostgreSQL database** (persistent cloud storage)
- **`vercel.json`** configuration for Vercel deployment
- **`lib/db.ts`** for database initialization and connection
- **Environment variables** (.env.example added)

### 🔄 Changed
- **API endpoint URLs**: `http://localhost:3001/*` → `/api/*` (relative paths)
- **Database layer**: SQLite → Vercel Postgres
- **Backend**: Traditional Express server → Vercel serverless functions
- **Deployment**: Local installer .exe → Cloud deployment on Vercel

## Migration Checklist

- [x] Remove all Windows/desktop app specific files
- [x] Remove unnecessary npm scripts
- [x] Remove SQLite/Express dependencies
- [x] Add `@vercel/postgres` dependency
- [x] Create `/api` directory with serverless functions
- [x] Create `lib/db.ts` for PostgreSQL setup
- [x] Update all API fetch URLs in frontend (App.tsx, services)
- [x] Create `vercel.json` configuration
- [x] Create `.env.example` with required variables
- [x] Update README with Vercel deployment instructions

## Next Steps for Deployment

1. **Set up Vercel Postgres**
   - Create free Postgres instance at vercel.com/postgres
   - Copy connection strings to environment variables

2. **Configure Google OAuth**
   - Create OAuth credentials in Google Cloud Console
   - Set redirect URI to your Vercel app URL
   - Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to Vercel

3. **Deploy to Vercel**
   - Push code to GitHub
   - Import project in Vercel
   - Add environment variables
   - Deploy!

4. **Test endpoints locally** (optional)
   - Install Postgres locally
   - Copy `.env.example` to `.env.local`
   - Run `npm install` and `npm run dev`

## What Still Works
- ✅ All inventory CRUD operations
- ✅ Category, variety, packaging management
- ✅ Google Drive backup/sync
- ✅ Dashboard and analytics
- ✅ Audit history
- ✅ Authentication flow

## What's Different
- ❌ No offline functionality (requires internet)
- ❌ No automatic backups to Google Drive (manual button only)
- ❌ No .exe launcher (access via browser URL)
- ✅ Data persists on server (not local SQLite)
- ✅ Multiple users can access same instance
- ✅ Free deployment on Vercel

## Reverting Changes
If you want to keep the old desktop app structure, checkout from git:
```bash
git checkout <previous-commit-hash>
```

---
**Status**: ✅ Ready for Vercel deployment
**Database**: Requires Vercel Postgres setup
**API**: All endpoints restructured for serverless
