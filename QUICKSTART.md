# Quick Start: 5 Minutes to Working App

## TL;DR - Just Do This

### Step 1: Get Credentials (10 minutes)

#### Google OAuth
1. Go to https://console.cloud.google.com/
2. Create Project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID (Web application)
4. Copy **Client ID** and **Client Secret**

#### Supabase
1. Go to https://supabase.com
2. Create new project
3. Run the SQL schema (see SUPABASE_SETUP.md)
4. Copy **Project URL**, **Anon Key**, and **Service Role Key**

### Step 2: Local Setup (5 minutes)

```bash
# Install
npm install

# Create env file
cp .env.example .env.local

# Edit .env.local with your credentials
# GOOGLE_CLIENT_ID=xxx
# GOOGLE_CLIENT_SECRET=xxx
# SUPABASE_URL=xxx
# SUPABASE_ANON_KEY=xxx
# SUPABASE_SERVICE_ROLE_KEY=xxx
```

### Step 3: Run Locally (2 minutes)

Terminal 1:
```bash
npm run dev
```

Terminal 2:
```bash
npm run backend:local
```

Visit `http://localhost:3000` → Click Login → Done! ✅

### Step 4: Deploy to Vercel (5 minutes)

```bash
npm i -g vercel
vercel login
vercel
# Add same env vars when prompted
```

Done! Your app is live! 🚀

---

## Detailed Guides

- **Complete Setup**: See [COMPLETE_SETUP.md](./COMPLETE_SETUP.md)
- **Google OAuth**: See [VERCEL_AUTH_SETUP.md](./VERCEL_AUTH_SETUP.md)
- **Supabase**: See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

## What Just Happened?

✅ **Login Page** - Users must sign in with Google  
✅ **Supabase Database** - All data saves to cloud  
✅ **Vercel Ready** - Deploy with one command  

Your inventory system is now:
- 🔒 Secure (authenticated)
- ☁️ Cloud-hosted (Supabase)
- 🚀 Production-ready (Vercel)

## Need Help?

- Check `.env.local` has all 5 variables filled in
- Check browser console (F12) for errors
- See COMPLETE_SETUP.md troubleshooting section
