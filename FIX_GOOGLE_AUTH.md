# Fix: Google Authentication Failing (401 Error)

## Quick Fix - Create New Google OAuth Credentials

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Select your project (or create one if needed)
3. Go to **APIs & Services** → **Credentials**

### Step 2: Delete Old Credentials (Optional)
1. Find existing OAuth 2.0 Client ID  
2. Delete it (click the trash icon)

### Step 3: Create New OAuth 2.0 Client ID
1. Click **+ Create Credentials** → **OAuth 2.0 Client ID**
2. If prompted, select **Web application**
3. Name: `React Inventory System`
4. Add **Authorized JavaScript origins:**
   - `http://localhost:5173` (local dev)
   - `https://react-inventory-system.vercel.app` (production)
5. Add **Authorized redirect URIs:**
   - `http://localhost:5173/` (local dev)
   - `https://react-inventory-system.vercel.app/` (production)
   - `https://react-inventory-system.vercel.app/api/auth/google/callback` (backend)
6. Click **Create**

### Step 4: Copy Credentials
You'll see a popup with:
- **Client ID** (the long string ending in `.apps.googleusercontent.com`)
- **Client Secret** (the secret key)

Copy both!

### Step 5: Update Vercel Environment Variables
1. Go to: https://vercel.com/dashboard
2. Select your project
3. **Settings** → **Environment Variables**
4. Find and **DELETE**:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
5. **ADD** new variables:
   - `GOOGLE_CLIENT_ID` = Your new Client ID from Step 4
   - `GOOGLE_CLIENT_SECRET` = Your new Client Secret from Step 4
6. Apply to: **Production** and **Preview**
7. Click **Save**

### Step 6: Redeploy
1. Vercel dashboard → **Deployments**
2. Find latest → Click **...** → **Redeploy**
3. Wait for build to complete (2-5 minutes)

### Step 7: Test
1. Visit https://react-inventory-system.vercel.app
2. Try signing in
3. Should now work!

---

## If Still Failing

Try these in order:
1. Hard refresh browser: `Ctrl+Shift+R` or `Cmd+Shift+R`
2. Try incognito/private browsing
3. Check Vercel logs for errors:
   - Deployments → Latest → View logs
4. Verify email is in Supabase `verified_accounts` table
