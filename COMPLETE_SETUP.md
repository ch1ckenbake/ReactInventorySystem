# Complete Setup Guide: Login + Supabase + Vercel

## What's Been Implemented

Your inventory system now has:

✅ **Google OAuth Login** - Mandatory login before accessing the site  
✅ **Supabase Database** - Cloud PostgreSQL database  
✅ **Vercel Ready** - Optimized for Vercel deployment  
✅ **Environment Security** - All sensitive keys stored in environment variables  

## Architecture Overview

```
User Browser
    ↓
    Login Page (LoginPage.tsx)
    ↓ (Google OAuth)
    Google OAuth Server
    ↓
    App Dashboard (Protected)
    ↓
    API Routes (/api/*)
    ↓
    Vercel Functions / Supabase Client (server-supabase.ts)
    ↓
    Supabase PostgreSQL Database
```

## Files Created/Modified

### New Files

| File | Purpose |
|------|---------|
| `src/components/LoginPage.tsx` | Google OAuth login interface |
| `src/hooks/useAuth.ts` | Authentication state hook |
| `src/hooks/` | Auth hook directory |
| `backend/supabase.ts` | Supabase client initialization |
| `backend/server-supabase.ts` | REST API using Supabase |
| `SUPABASE_SETUP.md` | Supabase deployment guide |
| `VERCEL_AUTH_SETUP.md` | Google OAuth setup guide |
| `AUTH_IMPLEMENTATION.md` | Auth feature documentation |

### Modified Files

| File | Changes |
|------|---------|
| `src/App.tsx` | Added auth gate - redirects unauthenticated users to LoginPage |
| `package.json` | Added @supabase/supabase-js, updated backend script |
| `.env.example` | Updated with Supabase and Google OAuth variables |
| `vercel.json` | Added Supabase environment variables |

## Quick Start: Local Development

### 1. Install Dependencies

```bash
cd ReactOfflineInventorySystem
npm install
```

### 2. Set Up Local Environment

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your credentials:
# - Get Google OAuth credentials from Google Cloud Console
# - Get Supabase credentials from supabase.com
```

### 3. Run Locally

Terminal 1 (Frontend):
```bash
npm run dev
```

Terminal 2 (Backend):
```bash
npm run backend:local
```

### 4. Test the Flow

1. Visit `http://localhost:3000`
2. Click "Sign in with Google"
3. Authorize the app
4. You should see the inventory dashboard
5. Try creating data - it syncs to Supabase!

## Deployment: Vercel + Supabase

### Quick Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Login and deploy
vercel login
vercel
```

When prompted for environment variables, add:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Detailed Deployment Guides

- **Google OAuth Setup**: See [VERCEL_AUTH_SETUP.md](./VERCEL_AUTH_SETUP.md)
- **Supabase Setup**: See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

## How It Works

### 1. User Visits App

```
Browser → http://localhost:3000
          ↓
          Check useAuth() hook
          ↓
          Has valid token? → YES → Show Dashboard
                          → NO  → Show LoginPage
```

### 2. User Logs In

```
Click "Sign in with Google"
          ↓
Redirect to Google OAuth
          ↓
User grants permission
          ↓
Google redirects to /api/auth/google/callback with auth code
          ↓
Backend exchanges code for access token
          ↓
Token returned to frontend
          ↓
Token stored in localStorage
          ↓
App reloads, user sees dashboard
```

### 3. User Uses App

```
All API calls include Authorization header with token
          ↓
Backend validates token
          ↓
API routes query Supabase database
          ↓
Supabase returns data
          ↓
Frontend displays data
```

## Environment Variables Needed

### Local Development (.env.local)

```bash
# Google OAuth (get from https://console.cloud.google.com/)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

# Supabase (get from https://supabase.com/)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Vercel Production

Same variables added in Vercel dashboard → Settings → Environment Variables

## Database Schema

Your Supabase database includes these tables:

- **categories** - Product categories (Rice, Wheat, etc.)
- **varieties** - Product varieties (Jasmine rice, Basmati rice, etc.)
- **packaging_types** - Packaging options (Sack, Bag, etc.)
- **inventory** - Inventory items
- **variety_packaging_prices** - Variety-specific pricing (price per packaging type per variety)
- **history** - Audit log of all changes

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for complete schema SQL.

## Key Features

### 1. Protected Access

✅ Only authenticated users can access the inventory system  
✅ Session persists across browser refreshes  
✅ Logout clears authentication token  

### 2. Cloud Database

✅ Data syncs to Supabase (cloud PostgreSQL)  
✅ No local SQLite database needed  
✅ Access from multiple devices  
✅ Automatic backups via Supabase  

### 3. Production Ready

✅ Deployed on Vercel (CDN, auto-scaling)  
✅ Secure environment variables  
✅ CORS configured  
✅ Error handling and logging  

## Troubleshooting

### Login Page Shows But Login Fails

1. Check Google OAuth credentials are set in `.env.local`
2. Verify redirect URI in Google Cloud Console includes your domain
3. Check browser console for errors: Press F12 → Console tab

### Can't See Data After Login

1. Verify Supabase credentials in `.env.local`
2. Check Supabase database tables exist (see SUPABASE_SETUP.md)
3. Check Vercel logs for API errors

### "Cannot find module" Error

```bash
npm install
npm run build
```

### Test Users for Google OAuth

If Google shows "unverified app" warning:

1. This is normal during development
2. Add your email as a test user:
   - Google Cloud Console → OAuth Consent Screen → Test Users
   - Add your email
3. Try login again

### Verified Accounts (Backend-managed)

The app uses a Supabase table `verified_accounts` as the authoritative allowlist. If a user is redirected back to the login page with an "Access denied" warning, the account is not present in the `verified_accounts` table.

- Add with SQL or Supabase UI:
  - `INSERT INTO verified_accounts (email) VALUES ('your-user@example.com')`
- Remove with SQL or Supabase UI:
  - `DELETE FROM verified_accounts WHERE email = 'your-user@example.com'`

## Security Notes

🔒 **Google Client Secret** - Never share or commit to Git  
🔒 **Supabase Service Role Key** - Never share or commit to Git  
🔒 **OAuth tokens** - Stored in localStorage, scope-limited  
🔒 **HTTPS only** - Vercel automatically uses HTTPS  
🔒 **Row Level Security** - Can enable in Supabase for multi-tenant setup  

## Next Steps

### Immediate (Before Production)

1. ✅ Set up Google OAuth credentials
2. ✅ Create Supabase project and database
3. ✅ Add environment variables locally
4. ✅ Test login flow locally
5. ✅ Deploy to Vercel

### After Deployment

1. Test login on production URL
2. Create test inventory items
3. Verify data persists after page reload
4. Share URL with team members
5. Monitor logs for errors

### Optional Enhancements

- [ ] Add Apple/GitHub login (Supabase Auth)
- [ ] Enable Row Level Security (Supabase)
- [ ] Add custom domain to Vercel
- [ ] Set up monitoring/alerts
- [ ] Migrate existing SQLite data (if any)

## Support Resources

- **Supabase Documentation**: https://supabase.com/docs
- **Vercel Documentation**: https://vercel.com/docs
- **Google OAuth**: https://developers.google.com/identity
- **TypeScript**: https://www.typescriptlang.org/docs/

## File Locations Cheat Sheet

| What | Where |
|------|-------|
| Login component | `src/components/LoginPage.tsx` |
| Auth hook | `src/hooks/useAuth.ts` |
| Main app | `src/App.tsx` |
| Supabase config | `backend/supabase.ts` |
| API server | `backend/server-supabase.ts` |
| Env vars | `.env.local` and Vercel dashboard |
| Google setup | `VERCEL_AUTH_SETUP.md` |
| Supabase setup | `SUPABASE_SETUP.md` |

---

**Ready to deploy? Start with the Supabase and Google OAuth setup guides!** 🚀
