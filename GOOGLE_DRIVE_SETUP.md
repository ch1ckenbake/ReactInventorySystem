# Google Drive Auto-Backup Setup Guide

Your offline inventory system is now fully functional with **Google Drive auto-backup** capability. Here's how to enable it:

## [OK] What's Been Implemented

- **Offline-First System**: App works completely offline, stores data locally
- **Google Drive Sync**: Auto-saves database to your Google Drive when online
- **Optional Login**: Google login is optional - system works without it
- **Auto-Sync**: Every 5 minutes when online, or sync manually
- **Settings Panel**: Easy controls in the Settings modal

## [SETUP] Setup Steps (5 minutes)

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Create Project"** at the top
3. Enter project name: `Inventory System`
4. Click **Create** and wait for it to be ready

### Step 2: Enable Google Drive API
1. In the left sidebar, click **APIs & Services**
2. Click **+ Enable APIs and Services**
3. Search for **"Google Drive API"**
4. Click on it and press **Enable**

### Step 3: Create OAuth Credentials
1. Go back to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth 2.0 Client ID**
3. You may be asked to configure the OAuth consent screen first:
   - Click **Configure Consent Screen**
   - Select **Internal** (or **External** if preferred)
   - Fill in basic app info (app name, user email)
   - Save and continue
4. For Application Type, select **Web application**
5. Under **Authorized redirect URIs**, add:
   - `http://localhost:3001/auth/google/callback`
   - `http://localhost:5173`
6. Click **Create**

### Step 4: Copy Your Credentials
1. You'll see your **Client ID** and **Client Secret**
2. Open the `.env` file in your project folder (you'll see it listed)
3. Replace the placeholders:
   ```
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
   ```
4. Save the file

## [RUNNING] Using the System

### Launching the App
- Double-click **Inventory System.lnk** (Windows shortcut)
- Or run: `npm run dev` in terminal

### Connecting Google Drive
1. Click the **[SETTINGS] Settings** button in the top-right
2. Under "Google Drive Backup", click **Connect Google**
3. Follow the Google login prompts
4. After login, you'll see your Google account info

### Auto-Sync
- Once logged in, **Auto-sync** is enabled by default
- Every 5 minutes when online, your database auto-saves to Drive
- Indicator shows: [OK] Connected or [OFFLINE] No internet

### Manual Sync
- Click **Sync Now** button to sync immediately (must be logged in)
- Shows last sync time after each sync

### Offline Mode
- All changes are saved locally even when offline
- When you come back online, automatic sync kicks in
- Settings panel shows online/offline status

## [BACKUP] What Gets Backed Up

- Your entire inventory database: `inventory-system-backup.db`
- Uploaded to your Google Drive root folder
- Only accessible to you

## [SECURITY] Security & Privacy

- Your credentials are stored in `.env` (keep it private!)
- Only your Google account can access the backups
- Database file is unencrypted (you can add encryption if needed)
- No data is sent anywhere except Google Drive

## [ERROR] Troubleshooting

### "Missing required parameter: client_id"
- **Fix**: Make sure you filled in `.env` file with actual credentials
- Restart the app after updating `.env`

### "Failed to sync to Google Drive"
- Check your internet connection
- Make sure you're logged in (Settings → Connect Google)
- Verify credentials in `.env` are correct

### "Sync failed. Check your connection."
- The app tried to sync but couldn't reach Google
- Click **Sync Now** again when connection is stable
- Check that `http://localhost:3001` is accessible

### App won't start
- Make sure Node.js is installed
- Check that ports 3001 (backend) and 5173 (frontend) are free
- Run `npm install` again to reinstall dependencies

## [INFO] Optional: For Distribution

If you're sharing this system with others:

1. **Keep your credentials private** - don't share `.env` file
2. **Create a separate account** for your end users (optional)
3. **Or use your account** and let them use your Google Drive

### For Production Use
- Consider adding encryption to the database
- Implement additional auth layers if needed
- Set up scheduled backups beyond just auto-sync

## [HELP] Need Help?

- Settings modal shows your connection status
- Check browser console (F12) for detailed errors
- Verify `.env` file exists and has correct values
- Make sure Google Drive API is enabled in Google Cloud Console

---

**Your system is ready to use! The Google Drive backup is completely optional - the app works great offline too.**
