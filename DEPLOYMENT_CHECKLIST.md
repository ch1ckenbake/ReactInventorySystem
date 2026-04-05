# DEPLOYMENT CHECKLIST

Use this checklist to ensure your deployment works correctly.

## ✅ Pre-Deployment Checklist (Local)

- [ ] You have pushed all code changes to GitHub
- [ ] Run `npm install` locally (optional, for testing)
- [ ] No errors in console when running `npm run dev` locally
- [ ] `.env` file exists with your development credentials
- [ ] `.env.production` exists for production configuration

## ✅ Vercel Environment Variables (CRITICAL!)

Go to https://vercel.com/dashboard → Your Project → Settings → Environment Variables

- [ ] `VITE_GOOGLE_CLIENT_ID` is set
- [ ] `GOOGLE_CLIENT_ID` is set  
- [ ] `GOOGLE_CLIENT_SECRET` is set
- [ ] `SUPABASE_URL` is set
- [ ] `SUPABASE_ANON_KEY` is set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set
- [ ] `VITE_BACKEND_URL` is set to https://react-inventory-system.vercel.app
- [ ] All variables apply to **Production** environment
- [ ] All variables apply to **Preview** environment

## ✅ Google OAuth Configuration  

Go to https://console.cloud.google.com/ → Your OAuth App → Authorized redirect URIs

- [ ] `https://react-inventory-system.vercel.app` is added
- [ ] `https://react-inventory-system.vercel.app/api/auth/google/callback` is added
- [ ] Settings have been saved

## ✅ Deployment Process

- [ ] Go to Vercel dashboard → Deployments
- [ ] Click **Redeploy** on your latest deployment
- [ ] Wait 5-10 minutes for build to complete
- [ ] Verify build succeeded (green checkmark)

## ✅ Post-Deployment Testing

### Test 1: API Health Check
```
Visit in browser: https://react-inventory-system.vercel.app/api/health
```
- [ ] Returns 200 status (not 404)
- [ ] Response shows `supabaseReady: true`
- [ ] Response shows `googleClientId: configured`

### Test 2: Login
- [ ] Visit https://react-inventory-system.vercel.app
- [ ] Click "Sign in with Google"
- [ ] Successfully sign in with your Google account
- [ ] See inventory dashboard with no "Failed to fetch" errors

### Test 3: Load Data  
- [ ] Inventory data loads from database
- [ ] Categories load
- [ ] Packaging types load
- [ ] History loads

## ✅ Browser Console Check
Open DevTools (F12 → Console)
- [ ] No red errors showing
- [ ] If any errors, note them for debugging

## ✅ Hard Refresh (if things look broken)
- [ ] Ctrl+Shift+R (Windows)
- [ ] Cmd+Shift+R (Mac)
- [ ] Try in incognito/private mode

## ⚠️ If Tests Fail

### For 404 Errors:
- [ ] Check all env vars are set in Vercel
- [ ] Verify spelling matches exactly
- [ ] Wait another 5 minutes
- [ ] Redeploy again

### For "Unexpected token 'T'" Error:
- [ ] API returning HTML error (missing env vars likely cause)
- [ ] Check /api/health first
- [ ] Restart Vercel build

### For Google Auth Error:
- [ ] Check Google Cloud Console authorized URIs
- [ ] Add https://react-inventory-system.vercel.app
- [ ] Wait 5 minutes for changes to propagate

## 📞 Need Help?

1. Check browser console (F12)
2. Check /api/health endpoint
3. Check Vercel Function Logs
4. Read DEPLOYMENT_FIXES.md
5. Read VERCEL_DEPLOYMENT_FIX.md

---

**Notes for this deployment:**
_________________________________________
_________________________________________
