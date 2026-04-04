# Supabase Migration & Deployment Guide

This guide will help you migrate from SQLite to Supabase and deploy to Vercel with full authentication.

## Overview

Your app now uses:
- **Authentication**: Google OAuth 2.0
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **Storage**: Google Drive (optional backups)

## Prerequisites

1. A Vercel account (https://vercel.com)
2. A Google Cloud project with OAuth credentials (see VERCEL_AUTH_SETUP.md)
3. A Supabase account (https://supabase.com) - FREE tier is sufficient
4. Git repository

## Step 1: Create Supabase Project

### Sign Up for Supabase

1. Go to [Supabase](https://supabase.com)
2. Click **Start Your Project**
3. Sign in with GitHub or email
4. Click **New Project**

### Configure Your Project

1. **Project Name**: "inventory-system" (or your choice)
2. **Database Password**: Create a secure password (save this!)
3. **Region**: Choose the region closest to your users
4. Click **Create new project**

Wait for project initialization (2-3 minutes)

## Step 2: Create Database Schema

Once your project is created:

### Option A: Using Supabase SQL Editor (Recommended for first time)

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the SQL from [Database Schema SQL](#database-schema-sql) below
4. Click **Run**

### Database Schema SQL

```sql
-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'PHP',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Varieties table
CREATE TABLE varieties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_per_kg REAL NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category_id, name)
);

-- Packaging types table
CREATE TABLE packaging_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  size REAL NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  price_per_package REAL NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Category packaging prices table
CREATE TABLE category_packaging_prices (
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  packaging_id UUID NOT NULL REFERENCES packaging_types(id) ON DELETE CASCADE,
  price REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (category_id, packaging_id)
);

-- DEPRECATED - use variety_packaging_prices instead

-- Variety packaging prices table (replaces category pricing)
CREATE TABLE variety_packaging_prices (
  variety_id UUID NOT NULL REFERENCES varieties(id) ON DELETE CASCADE,
  packaging_id UUID NOT NULL REFERENCES packaging_types(id) ON DELETE CASCADE,
  price REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (variety_id, packaging_id)
);

-- Pricing is now per-variety, not per-category
-- Example: Kohaku rice at 400 PHP per sack
-- INSERT INTO variety_packaging_prices (variety_id, packaging_id, price)
-- SELECT variety.id, (SELECT id FROM packaging_types WHERE name='Sack'), 400
-- FROM varieties WHERE name='Kohaku' AND category_id=(SELECT id FROM categories WHERE name='Rice');

CREATE INDEX idx_variety_packaging_prices ON variety_packaging_prices(variety_id);

-- Inventory table
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code TEXT NOT NULL UNIQUE,
  category_id UUID NOT NULL REFERENCES categories(id),
  variety_id UUID NOT NULL REFERENCES varieties(id),
  packaging_id UUID NOT NULL REFERENCES packaging_types(id),
  quantity_packages INTEGER NOT NULL,
  total_weight REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'In Stock',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- History table
CREATE TABLE history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  details TEXT,
  old_values TEXT,
  new_values TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verified accounts table (new)
CREATE TABLE verified_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Backend-managed verified account allowlist
-- Only emails in this table are allowed to log in through the app.
-- Maintain this list through Supabase dashboard, migrations, or backend admin APIs.
-- Example:
-- INSERT INTO verified_accounts (email) VALUES ('admin@example.com');

-- Create indexes
CREATE INDEX idx_history_created_at ON history(created_at DESC);
CREATE INDEX idx_history_entity_type ON history(entity_type);
CREATE INDEX idx_history_action ON history(action);
CREATE INDEX idx_verified_accounts_email ON verified_accounts(email);
```

### Enable Row Level Security (Optional but Recommended)

1. For each table (categories, varieties, packaging_types, inventory, history):
2. Go to **Authentication** → **Policies**
3. Enable RLS (Row Level Security) for the table
4. This restricts access so only authenticated users can modify data

## Step 3: Get Your Supabase Keys

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** → `SUPABASE_URL`
   - **Anon (public)** → `SUPABASE_ANON_KEY`
   - **Service Role (secret)** → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **IMPORTANT**: Service Role Key is SECRET - never commit to Git or public repos!

## Step 4: Local Setup & Testing

### 1. Install Supabase Client

```bash
npm install
```

The `@supabase/supabase-js` package is already in your dependencies.

### 2. Configure Local Environment

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your values:
```

Your `.env.local` should look like:

```
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NODE_ENV=development
```

### 3. Test Locally

```bash
# Start development server
npm run dev

# In another terminal, start the backend
npm run backend:local
```

Visit `http://localhost:3000`:
1. You should see the login page
2. Click "Sign in with Google"
3. After login, you should see the empty inventory dashboard
4. Try adding a category or inventory item

If you see database errors, check:
- Supabase URL is correct
- API keys are correctly copied
- Regional endpoint matches your Supabase project

## Step 5: Deploy to Vercel

### Option A: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Select your project name
# When asked about settings, press 'y' to override
```

### Option B: Using GitHub Integration

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click **Add New** → **Project**
4. Select your GitHub repository
5. Click **Import**
6. Continue to next section to add environment variables

## Step 6: Configure Vercel Environment Variables

After deployment starts, add these environment variables to Vercel:

1. Go to your Vercel project settings
2. Go to **Environment Variables**
3. Add the following variables:

| Name | Value |
|------|-------|
| `GOOGLE_CLIENT_ID` | Your Google Client ID |
| `GOOGLE_CLIENT_SECRET` | Your Google Client Secret |
| `SUPABASE_URL` | Your Supabase Project URL |
| `SUPABASE_ANON_KEY` | Your Supabase Anon Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase Service Role Key |

⚠️ **IMPORTANT**: Service Role Key is sensitive - only add to Vercel (not client-side code)

## Step 7: Update Google OAuth

Update your Google Cloud Console with Vercel deployment URL:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Go to **APIs & Services** → **Credentials**
3. Click your OAuth 2.0 Client ID
4. Add authorized redirect URI:
   ```
   https://your-vercel-app.vercel.app/api/auth/google/callback
   ```
5. Click **Save**

## Step 8: Test Production Deployment

1. Visit your Vercel deployment URL
2. You should see the login page
3. Click "Sign in with Google"
4. After login, you should see the inventory dashboard
5. Try creating a category/inventory item
6. Refresh the page - data should persist

## Database Migrations from SQLite to Supabase

If you have existing SQLite data, migrate it:

### Using SQL Export

1. In SQLite, export your data as SQL:
   ```bash
   sqlite3 inventory.db ".dump" > export.sql
   ```

2. Import into Supabase SQL Editor:
   - Go to Supabase **SQL Editor** → **New Query**
   - Paste the exported SQL
   - Click **Run**

### Using Python Script (Alternative)

```bash
pip install sqlite3 supabase
python migrate_sqlite_to_supabase.py
```

Create `migrate_sqlite_to_supabase.py`:
```python
import sqlite3
from supabase import create_client
import os

sqlite_conn = sqlite3.connect('inventory.db')
supabase = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
)

# Migrate each table
cursor = sqlite_conn.cursor()
cursor.execute("SELECT * FROM categories")
for row in cursor.fetchall():
    supabase.table('categories').insert({'id': row[0], 'name': row[1], ...}).execute()

# Repeat for each table...
```

## Troubleshooting

### "Failed to connect to Supabase"

- Check SUPABASE_URL is correct (should be `https://xxxxx.supabase.co`)
- Verify API keys are not copied with extra spaces
- Ensure Supabase project is active (not paused)

### "Cannot read property 'from' of undefined"

- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in `.env.local`
- Check `node_modules/@supabase/supabase-js` exists

### Login fails with auth error

- Verify Google OAuth credentials
- Check Google redirect URI includes `/api/auth/google/callback`
- See VERCEL_AUTH_SETUP.md for detailed auth setup

### "Row level security violation"

- Supabase policies are restricting access
- Temporarily disable RLS to test: **Authentication** → **Policies** → Disable for table
- Or configure policies properly once testing works

### Vercel deployment shows blank page

- Check Vercel logs: **Deployments** → **Function logs**
- Verify all environment variables are set
- Check for TypeScript compilation errors

## Monitoring & Maintenance

### Check Database Usage

1. Go to Supabase **Settings** → **Billing**
2. Plan includes: 500MB database, 1GB bandwidth free/month
3. Upgrade if needed for production use

### View Live Logs

1. Go to **Database** → **Query Performance**
2. See real-time database queries
3. Optimize slow queries

### Backup Your Data

Supabase automatically backs up, but you can also:

1. Export as CSV: **Table** → Right-click → **Export data**
2. Or use API: `supabase.from('table').select('*').csv()`

## Next Steps

✅ Authentication working (Google OAuth)  
✅ Database deployed (Supabase)  
✅ Deployed to Vercel  

What's next:

1. **Share with team**: Give your Vercel URL to teammates
2. **Custom domain**: Add your domain in Vercel settings
3. **Enable RLS policies**: For multi-tenant security
4. **Set up monitoring**: Monitor uptime and errors
5. **Add Apple/GitHub auth**: Optional - use Supabase Auth

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Supabase Support**: https://supabase.com/support
- **Vercel Docs**: https://vercel.com/docs
- **GitHub Issues**: Create issue with error logs and environment info

---

**You're all set! Your inventory system is now live with Supabase and Vercel!** 🚀
