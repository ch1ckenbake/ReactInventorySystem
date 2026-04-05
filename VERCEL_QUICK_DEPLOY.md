# 🚀 Quick Deployment Checklist

## Before Deploying to Vercel

- [ ] Build locally passes: `npm run build` ✓
- [ ] Install dependencies: `npm install`
- [ ] Test locally: `npm run dev`
- [ ] Git repository created and committed: `git add . && git commit -m "Ready for Vercel"`
- [ ] Repository pushed to GitHub

## Environment Variables Setup

1. Go to: https://vercel.com/new
2. Import your GitHub repository
3. Add Environment Variables (in Project Settings → Environment Variables):

```
GOOGLE_CLIENT_ID=736394863441-c3f897fvnnr3bd3n10t4dggu33eh17sk.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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a
SUPABASE_URL=https://ikzajcuqqjnvowmbawgr.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlremFqY3VxcWpudm93bWJhd2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NTAzMzcsImV4cCI6MjA5MDUyNjMzN30.6OfD5s71ZF2BlBT_UWEpzDAsO3R9ROXvAjJq_LHhgm0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlremFqY3VxcWpudm93bWJhd2dyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk1MDMzNywiZXhwIjoyMDkwNTI2MzM3fQ.CrdYmIm_HceDhADzImfPJxmmcl6dIRWxc0leRAtb4UY
```

## Google OAuth Setup

1. Go to: https://console.cloud.google.com/
2. Find your OAuth 2.0 Client ID
3. Add Authorized Redirect URI:
   ```
   https://your-vercel-domain.vercel.app/api/auth/google/callback
   ```
   (Replace `your-vercel-domain` with your actual Vercel domain)

## Deployment Steps

1. In Vercel Dashboard, click "Deploy"
2. Wait for build to complete (~1-2 minutes)
3. Once deployed, note your domain (e.g., `your-app.vercel.app`)
4. Update Google OAuth redirect URI with your actual domain
5. Test the app!

## Verify Deployment

- [ ] Frontend loads: `https://your-app.vercel.app/`
- [ ] Health check passes: `https://your-app.vercel.app/api/health`
- [ ] Can access inventory: `https://your-app.vercel.app/api/inventory`
- [ ] Google login button works
- [ ] Database operations work

## Troubleshooting

### Blank Page?
```bash
# Check Vercel logs
vercel logs
```

### API 404 Errors?
- Verify `/api/[...path].ts` exists
- Check that `.env` variables are set in Vercel
- Frontend is calling `/api/*` routes

### Database Connection Fails?
- Verify SUPABASE_URL and keys are in Vercel env vars
- Check Supabase network restrictions
- Verify Supabase project is active

### Google OAuth Fails?
- Update Google Cloud Console with correct redirect URI
- Ensure GOOGLE_CLIENT_ID is in Vercel env vars
- Wait a few minutes after updating Google settings

## After Deployment

1. Test all CRUD operations (Create, Read, Update, Delete)
2. Test Google authentication
3. Monitor Vercel logs for errors
4. Set up Vercel Analytics if desired
5. Enable Vercel Preview Deployments for pull requests

## File Structure Summary

```
ReactOfflineInventorySystem/
├── api/
│   └── [...path].ts         ← Serverless backend
├── backend/
│   ├── supabase.ts
│   ├── googleDrive.ts
│   └── ...
├── src/
│   ├── components/
│   ├── services/
│   └── App.tsx              ← Frontend
├── dist/                     ← Built frontend (generated)
├── vercel.json              ← Vercel config ✓
├── vite.config.ts           ← Frontend build config ✓
├── .env                      ← Local env vars
└── .vercelignore            ← Files to skip in deployment

```

## Success!

Once deployed, your app will have:
- ✅ Frontend served from Vercel edge
- ✅ Backend running as serverless functions
- ✅ Database connection to Supabase
- ✅ Google OAuth authentication
- ✅ Automatic SSL/HTTPS
- ✅ Global CDN distribution

Enjoy your fully serverless React inventory system! 🎉
