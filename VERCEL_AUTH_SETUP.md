# Vercel Deployment & Authentication Setup Guide

This guide will help you deploy your Inventory System to Vercel with proper Google OAuth authentication.

## Prerequisites

1. A Vercel account (https://vercel.com)
2. A Google Cloud project with OAuth credentials
3. Git repository (GitHub, GitLab, or Bitbucket)

## Step 1: Set Up Google OAuth Credentials

### Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Create Project**
3. Name it "Inventory System" (or your preference)
4. Click **Create**

### Enable Google APIs

1. In the Cloud Console, go to **APIs & Services** → **Library**
2. Search for and enable:
   - Google Drive API
   - Google OAuth API (or "Google+ API")
3. Wait a moment for the APIs to be enabled

### Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. If prompted, first create an OAuth consent screen:
   - Choose **External** user type
   - Fill in the App name: "Inventory System"
   - Add your email as the developer contact
   - Add the same email as a Test user
   - Click **Save and Continue** through all screens
4. Back on Credentials, click **Create OAuth Client ID**
5. Choose **Web application**
6. Add authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/google/callback
   https://your-app.vercel.app/api/auth/google/callback
   ```
   (Replace `your-app` with your actual Vercel app name)
7. Click **Create**
8. Copy your **Client ID** and **Client Secret**

## Step 2: Deploy to Vercel

### Option A: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# During deployment, when asked about environment variables, say yes
# Then add these:
# - GOOGLE_CLIENT_ID: [Your Client ID from Step 1]
# - GOOGLE_CLIENT_SECRET: [Your Client Secret from Step 1]
```

### Option B: Using GitHub Integration

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click **Add New...** → **Project**
4. Select your GitHub repository
5. Click **Import**
6. In Environment Variables, add:
   - `GOOGLE_CLIENT_ID`: Your Client ID
   - `GOOGLE_CLIENT_SECRET`: Your Client Secret
7. Click **Deploy**

## Step 3: Configure Google OAuth

After deployment, update your OAuth redirect URI:

1. Go back to [Google Cloud Console](https://console.cloud.google.com/)
2. Go to **APIs & Services** → **Credentials**
3. Click your OAuth 2.0 Client ID
4. Add your Vercel deployment URL as an authorized redirect URI:
   ```
   https://your-app.vercel.app/api/auth/google/callback
   ```
5. Click **Save**

## Step 4: Test the Deployment

1. Visit your Vercel deployment URL
2. You should see the login page
3. Click "Sign in with Google"
4. Authorize the app
5. You should be redirected to your inventory dashboard

## Environment Variables

The following environment variables are required for production:

```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

Optional variables:

```
GOOGLE_DRIVE_FOLDER_ID=optional_folder_id_for_backups
NODE_ENV=production
```

## Features with Authentication

Your deployed app now includes:

✅ **Protected Access**: Only authenticated users can access the inventory system  
✅ **Google OAuth**: Secure login with Google credentials  
✅ **Google Drive Sync**: Backup and restore your database  
✅ **Offline Support**: Works completely offline with automatic sync  
✅ **Multiple Devices**: Access your inventory from any device  

## Troubleshooting

### "Redirect URI mismatch" error

- Make sure your redirect URI in Google Cloud matches your Vercel deployment URL exactly
- Don't include trailing slashes
- Use `https://` (not `http://`)

### "Google app is unverified" warning

This is normal for development. The app is in development mode because you're the only test user:

1. Click **Continue** or **Advanced** to proceed
2. Your account is already added as a test user in the OAuth consent screen

### "Cannot find module" errors

Run `npm install` to ensure all dependencies are installed:

```bash
npm install
npm run build
```

### Blank page or 404 errors

1. Check that your build succeeded in Vercel dashboard
2. Verify environment variables are set correctly
3. Check Vercel function logs for errors

## Local Development

To test locally before deploying:

1. Copy `.env.example` to `.env.local`
2. Add your Google OAuth credentials:
   ```
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   ```
3. Run `npm run dev`
4. Visit `http://localhost:3000`

## Security Notes

- Never commit `.env` or `.env.local` to version control
- Your Client Secret should only be stored in Vercel's environment variables
- The app uses OAuth 2.0, which securely handles credentials
- All database data can be backed up to Google Drive

## Support

For more help:

- [Vercel Documentation](https://vercel.com/docs)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
