# IMMEDIATE FIXES FOR "FAILED TO FETCH" ERROR

## What's Wrong
Your app is showing "Failed to fetch" because:
- ❌ Environment variables not set in Vercel
- ❌ API routes can't access Supabase credentials
- ❌ Frontend doesn't know the backend URL

## Quick Fix (5 minutes)

### Step 1: Go to Vercel Dashboard
1. Open https://vercel.com/dashboard
2. Click your project "react-inventory-system"
3. Click **Settings**

### Step 2: Add Environment Variables
Click **Environment Variables** and add these 7 variables:

```
VITE_GOOGLE_CLIENT_ID = 736394863441-c3f897fvnnr3bd3n10t4dggu33eh17sk.apps.googleusercontent.com
GOOGLE_CLIENT_ID = 736394863441-c3f897fvnnr3bd3n10t4dggu33eh17sk.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET = 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a
SUPABASE_URL = https://ikzajcuqqjnvowmbawgr.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlremFqY3VxcWpudm93bWJhd2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NTAzMzcsImV4cCI6MjA5MDUyNjMzN30.6OfD5s71ZF2BlBT_UWEpzDAsO3R9ROXvAjJq_LHhgm0
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlremFqY3VxcWpudm93bWJhd2dyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk1MDMzNywiZXhwIjoyMDkwNTI2MzM3fQ.CrdYmIm_HceDhADzImfPJxmmcl6dIRWxc0leRAtb4UY
NODE_ENV = production
VITE_BACKEND_URL = https://react-inventory-system.vercel.app
```

### Step 3: Select Environment
- ✅ Check: **Production**
- ✅ Check: **Preview**
- Leave Development unchecked (unless you want to preview before deploy)

### Step 4: Save and Redeploy
1. Click **Save**
2. Go to **Deployments**
3. Find your latest deployment
4. Click the menu (...) → **Redeploy**

### Step 5: Wait & Test
- Wait 5-10 minutes for build to complete
- Hard refresh: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
- Visit https://react-inventory-system.vercel.app
- Open DevTools (F12) and check Console for errors

## Testing

### Test API Health
Open this in your browser:
```
https://react-inventory-system.vercel.app/api/health
```

You should see:
```json
{
  "status": "ok",
  "diagnostics": {
    "supabaseReady": true,
    "supabaseUrl": "configured",
    "googleClientId": "configured"
  }
}
```

If you see 404, the environment variables weren't applied yet. Wait a few more minutes and try again.

### Test Sign In
1. Visit https://react-inventory-system.vercel.app
2. Click "Sign in with Google"
3. You should see your email after signing in
4. Dashboard should load without "Failed to fetch" errors

## Still Getting Errors?

### For 404 Errors:
- Wait 10 more minutes (environment vars take time)
- Hard refresh browser: Ctrl+Shift+R
- Try in incognito mode
- Check Vercel Logs: Deployments → Build Logs

### For "Unexpected token 'T'" Error:
- This means API is returning error HTML instead of JSON
- Check /api/health endpoint first
- Make sure ALL 7 environment variables are set
- Verify no typos in the values

### For Google Sign In Error:
- Go to Google Cloud Console
- Add https://react-inventory-system.vercel.app to authorized redirect URIs
- Wait 5 minutes for changes to take effect

## If All Else Fails

Run this to validate your local setup:
```bash
cd ReactOfflineInventorySystem
npx tsx validate-setup.ts
```

Or see detailed guide: `VERCEL_DEPLOYMENT_FIX.md`
