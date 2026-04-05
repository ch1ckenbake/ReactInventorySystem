# Vercel Deployment Fix Guide

## Problem Summary
Your React Inventory System is getting 404 errors on API calls. This is because:
1. Environment variables are not set in Vercel dashboard
2. Vercel needs explicit configuration for serverless functions
3. The frontend needs to know the correct API base URL for production

## Solution: 5-Step Fix

### Step 1: Set Environment Variables in Vercel Dashboard

Go to https://vercel.com/dashboard and:

1. Click your project: `react-inventory-system`
2. Go to **Settings** → **Environment Variables**
3. Add these variables:

| Key | Value |
|-----|-------|
| `GOOGLE_CLIENT_ID` | `736394863441-c3f897fvnnr3bd3n10t4dggu33eh17sk.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `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a` |
| `SUPABASE_URL` | `https://ikzajcuqqjnvowmbawgr.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlremFqY3VxcWpudm93bWJhd2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NTAzMzcsImV4cCI6MjA5MDUyNjMzN30.6OfD5s71ZF2BlBT_UWEpzDAsO3R9ROXvAjJq_LHhgm0` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlremFqY3VxcWpudm93bWJhd2dyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk1MDMzNywiZXhwIjoyMDkwNTI2MzM3fQ.CrdYmIm_HceDhADzImfPJxmmcl6dIRWxc0leRAtb4UY` |
| `NODE_ENV` | `production` |
| `VITE_BACKEND_URL` | `https://react-inventory-system.vercel.app` |

4. Apply to: **Production** and **Preview** environments
5. Click **Save**

### Step 2: Update Google OAuth Redirect URI

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your OAuth app
3. Add `https://react-inventory-system.vercel.app` to **Authorized Redirect URIs**
4. Add `https://react-inventory-system.vercel.app/api/auth/google/callback`
5. Save

### Step 3: Deploy to Vercel

```bash
# Make sure you're in the project directory
cd ReactOfflineInventorySystem

# Redeploy to apply new environment variables
git push origin main
```

Or manually redeploy from Vercel dashboard:
1. Go to your project in Vercel
2. Click **Deployments**
3. Find the latest deployment
4. Click **Redeploy**

### Step 4: Test the API Endpoints

Once deployed, test these endpoints:

**Health Check:**
```
GET https://react-inventory-system.vercel.app/api/health
```

Expected response:
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

**Inventory Endpoint:**
```
GET https://react-inventory-system.vercel.app/api/inventory
```

### Step 5: Test in Browser

1. Visit https://react-inventory-system.vercel.app
2. Click "Sign in with Google"
3. After login, you should see the inventory dashboard
4. Check the browser console (F12 → Console) for any errors

## Common Issues and Fixes

### Issue: Still Getting 404 Errors

**Cause:** Environment variables not applied yet

**Fix:** 
1. Wait 5-10 minutes for Vercel to rebuild and redeploy
2. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
3. Check Vercel build logs for errors

### Issue: "Unexpected token 'T'" Error

**Cause:** API returning HTML error page instead of JSON

**Fix:**
1. Check `/api/health` endpoint first to diagnose issue
2. Verify all environment variables are set
3. Clear browser cache and cookies
4. Try in incognito mode

### Issue: Google Sign In Shows Error

**Cause:** Redirect URI not configured in Google Cloud

**Fix:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Add your Vercel URL to OAuth authorized URIs
3. Wait a few minutes for changes to propagate
4. Try signing in again

### Issue: "Database not configured" Error

**Cause:** Supabase environment variables not set

**Fix:**
1. Go to Vercel Settings → Environment Variables
2. Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set
3. Redeploy the project
4. Wait for build to complete

## Debug Mode

To enable more detailed logging:

1. Add `DEBUG=*` to Vercel environment variables
2. Check Vercel Function Logs:
   - Go to project in Vercel
   - Click **Logs** → **Functions**
   - Watch functions get called and see error details

## Need Help?

1. Check Vercel dashboard → Deployments → Build logs
2. Check Vercel dashboard → Logs → Functions
3. Check browser console (F12 → Console)
4. Check Network tab (F12 → Network) to see API responses

## Local Development

For local testing without Vercel:

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`
The API proxy runs at `http://localhost:3000` (configured in vite.config.ts)
