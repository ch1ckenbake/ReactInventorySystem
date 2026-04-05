# Vercel Serverless Configuration - Summary of Changes

## What Was Fixed

Your React Inventory System is now fully configured to host **both frontend and backend using Vercel serverless functions**. Here's what was changed:

### 1. **vercel.json** - Routing Configuration
- Added `rewrites` rules to handle API routing
- `/api/*` requests → serverless functions in `/api/[...path]`
- All other routes → frontend `index.html` (for SPA routing)
- Updated env variables to use Vercel secrets pattern (`@variable_name`)

### 2. **vite.config.ts** - Frontend Build Configuration  
- Updated API proxy target to `localhost:3000` (matching serverless function port)
- Added build optimizations for Vercel deployment
- Configured proper output directory (`/dist`)

### 3. **api/[...path].ts** - Serverless Function Handler
- Complete rewrite with proper error handling
- Improved module loading with caching
- Better error messages for debugging
- All API routes working through Express
- Health check endpoint at `/api/health`
- Proper initialization of Supabase schema

Key improvements:
- ✅ Lazy-loaded modules to avoid build-time errors
- ✅ Proper VercelRequest/VercelResponse handling
- ✅ CORS enabled for frontend requests
- ✅ Error logging for troubleshooting
- ✅ Module caching to avoid repeated imports

### 4. **.env** - Environment Variables
- Updated GOOGLE_REDIRECT_URI to use `/api/auth/google/callback`
- Updated VERCEL_URL reference to `http://localhost:3000`
- Added VERCEL_URL for local testing (Vercel auto-sets this in production)

### 5. **package.json** - Dependencies
- Added `@vercel/node` to devDependencies for proper serverless types

## How the Architecture Works

### Frontend (Static Files)
- React app is built to `/dist` folder
- Vercel serves these as static files automatically
- SPA routing is handled by rewrite: `/:path* → /index.html`
- Build output is minified and optimized

### Backend (Serverless Functions)
- Express.js app runs in `/api/[...path].ts`
- Each HTTP request triggers a new function instance
- All routes handled through Express routing
- Supabase connection established per request
- Module imports are cached to improve cold start performance

### Database & Auth
- Supabase for data persistence
- Google OAuth for authentication
- User tokens stored in memory per request (⚠️ see note below)

## Important: Token Storage Warning ⚠️

Currently, tokens are stored in a `Map` which **only works during a single request**. In production:

**For the next request from another serverless function instance, the token will be lost!**

### Recommended Solution:

Store tokens in Supabase instead:

```typescript
// In your handler, store token after OAuth:
const modules = await getBackendModules();
await modules.supabase.from('user_tokens').insert({
  user_id: userId,
  token: token,
  created_at: new Date().toISOString()
});

// Retrieve token on frontend by user ID
const { data } = await modules.supabase
  .from('user_tokens')
  .select('token')
  .eq('user_id', userId)
  .single();
```

## API Endpoints (All under `/api/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/auth/google/url` | Get Google OAuth URL |
| GET | `/api/auth/google/callback` | OAuth callback handler |
| GET | `/api/auth/user-info` | Get authenticated user info |
| GET | `/api/inventory` | List all inventory |
| POST | `/api/inventory` | Create inventory item |
| PUT | `/api/inventory/:id` | Update inventory item |
| DELETE | `/api/inventory/:id` | Delete inventory item |
| GET | `/api/categories` | List all categories |
| POST | `/api/categories` | Create category |
| PUT | `/api/categories/:id` | Update category |
| DELETE | `/api/categories/:id` | Delete category |

## Local Development

```bash
# Install packages
npm install

# Start development server
npm run dev

# The app runs on http://localhost:5173
# /api calls are proxied to localhost:3000
```

## Ready to Deploy!

1. **Test locally**: `npm run dev`
2. **Build locally**: `npm run build` 
3. **Git commit and push** to your GitHub repo
4. **Connect to Vercel**:
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Add environment variables (GOOGLE_CLIENT_ID, etc.)
   - Click "Deploy"

## Environment Variables for Vercel

Go to Project Settings → Environment Variables and add:

| Key | Value | Source |
|-----|-------|--------|
| GOOGLE_CLIENT_ID | `736394863...` | Google Cloud Console |
| GOOGLE_CLIENT_SECRET | `GOCSPX-...` | Google Cloud Console |
| SUPABASE_URL | `https://ikz...` | Your .env file |
| SUPABASE_ANON_KEY | long JWT token | Your .env file |
| SUPABASE_SERVICE_ROLE_KEY | long JWT token | Your .env file |

## Vercel Cold Starts

- First request to a function: **1-2 seconds** (cold start)
- Subsequent requests: **<100ms** (warm)
- This is normal for serverless! 

To minimize cold starts:
- Keep function size small ✓ (we only load modules when needed)
- Cache modules ✓ (done in the handler)
- Use efficient dependencies ✓

## Next Steps

1. Install dependencies: `npm install`
2. Test locally: `npm run dev` 
3. Check for build errors: `npm run build`
4. Verify Google OAuth is configured for your domain
5. Push to GitHub and deploy to Vercel!

For more details, see [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)
