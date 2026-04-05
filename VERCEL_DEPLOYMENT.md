# Vercel Deployment Guide - Serverless Frontend + Backend

Your app is now configured to run both frontend and backend as serverless functions on Vercel!

## Architecture

- **Frontend**: React app built to static files in `/dist`
- **Backend**: Node.js Express API running as serverless functions in `/api`
- **Database**: Supabase (external)
- **Auth**: Google OAuth + Custom verification

## Local Development

```bash
# Install dependencies
npm install

# Start dev server (frontend + API proxy)
npm run dev

# The app will be available at: http://localhost:5173
# API calls to /api/* are proxied to the serverless handlers
```

## Deployment Steps

### 1. Set Up Environment Variables on Vercel

Go to your Vercel dashboard → Project Settings → Environment Variables, and add:

```
GOOGLE_CLIENT_ID=736394863441-c3f897fvnnr3bd3n10t4dggu33eh17sk.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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a
SUPABASE_URL=https://ikzajcuqqjnvowmbawgr.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlremFqY3VxcWpudm93bWJhd2dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NTAzMzcsImV4cCI6MjA5MDUyNjMzN30.6OfD5s71ZF2BlBT_UWEpzDAsO3R9ROXvAjJq_LHhgm0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlremFqY3VxcWpudm93bWJhd2dyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk1MDMzNywiZXhwIjoyMDkwNTI2MzM3fQ.CrdYmIm_HceDhADzImfPJxmmcl6dIRWxc0leRAtb4UY
```

### 2. Update Google OAuth Redirect URI

In Google Cloud Console, add this to your OAuth 2.0 Client ID:
```
https://your-vercel-domain.vercel.app/api/auth/google/callback
```

### 3. Update Environment Variable in Code

In your project `.env.local` (if testing locally):
```
VITE_API_BASE=http://localhost:3000/api
```

Update your `src/services/api.ts` if needed to use this:
```typescript
const API_BASE = import.meta.env.VITE_API_BASE || '/api';
```

### 4. Deploy to Vercel

**Option A: Connect GitHub**
1. Push your code to GitHub
2. Import the repository in Vercel
3. Build settings should auto-detect
4. Add environment variables
5. Deploy!

**Option B: Vercel CLI**
```bash
npm install -g vercel
vercel login
vercel deploy --prod
```

## How It Works

### Frontend
- React app is built to `/dist`
- Vercel serves static files from `outputDirectory: dist`
- SPA routing is handled by rewrite rule: `/:path* → /index.html`

### Backend (Serverless Functions)
- All requests to `/api/*` are routed to `/api/[...path]` handler
- Express.js app handles routing internally
- Each function invocation is stateless
- Supabase connection is established per request

## Important Notes

⚠️ **Token Storage Warning**
Currently, tokens are stored in memory using a `Map`. This **won't work in production** because each request goes to a fresh function instance.

**Solution**: Use Supabase to store user tokens:

```typescript
// Store token in Supabase
await supabase.from('user_tokens').insert({
  user_id: userId,
  token: token,
  created_at: new Date().toISOString()
});

// Retrieve token later
const { data } = await supabase
  .from('user_tokens')
  .select('token')
  .eq('user_id', userId)
  .single();
```

## API Endpoints

All endpoints are available at `/api/*`:

- `GET /api/auth/google/url` - Get Google OAuth URL
- `GET /api/auth/google/callback` - Handle OAuth callback
- `GET /api/auth/user-info` - Get authenticated user info
- `GET /api/inventory` - List inventory
- `POST /api/inventory` - Create inventory
- `PUT /api/inventory/:id` - Update inventory
- `DELETE /api/inventory/:id` - Delete inventory
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category

## Cold Starts

First request to a serverless function may take 1-2 seconds (cold start). This is normal for serverless.

**To minimize cold starts:**
- Keep function size small
- Use ES modules (already configured)
- Avoid heavy dependencies

## Troubleshooting

### Blank Page or 404
- Check that frontend is building to `/dist`
- Check Vercel logs: `vercel logs`

### API calls returning 404
- Ensure `/api` routes are properly rewritten in `vercel.json`
- Check that `/api/[...path].ts` is in the correct location

### CORS errors
- CORS is enabled in `/api/[...path].ts`
- Check browser console for actual error

### Database connection fails
- Verify Supabase environment variables are set in Vercel
- Check Supabase network restrictions

## Next Steps

1. Test locally: `npm run dev`
2. Check build: `npm run build`
3. Log in to Vercel and connect GitHub repository
4. Set environment variables
5. Deploy!

For more info: https://vercel.com/docs
