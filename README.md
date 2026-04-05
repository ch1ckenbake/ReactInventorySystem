# 📦 Inventory Management System

Modern inventory management system with Google OAuth authentication and Supabase database backend.

## 🔐 Authentication Flow

1. **User visits app** → Login page
2. **Click "Sign in with Google"** → Redirects to Google OAuth
3. **Grant permissions** → Returns to app with Google token
4. **App checks Supabase** → Verifies email is in `verified_accounts` table
5. **If authorized** → Shows inventory management dashboard
6. **If not authorized** → Shows "Not authorized" message

## 🚀 Deployment on Vercel

The app is deployed at: **https://react-inventory-system.vercel.app**

### How Deployment Works

1. Push code to GitHub → `main` branch
2. Vercel auto-detects changes
3. Runs `npm run build` (creates optimized bundle)
4. Deploys to CDN
5. Serverless functions (`/api/*`) handle backend logic

### Environment Variables Required

These must be set in **Vercel Dashboard** → **Settings** → **Environment Variables**:

| Variable | Purpose |
|----------|---------|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_ID` | Backend verification |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `SUPABASE_URL` | Database URL |
| `SUPABASE_ANON_KEY` | Public database key |
| `SUPABASE_SERVICE_ROLE_KEY` | Private database key |
| `VITE_BACKEND_URL` | API base URL |

**All variables must be applied to: Production & Preview environments**

## 📱 Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Opens at http://localhost:5173
```

The app uses Vite proxy (`vite.config.ts`) to route `/api` requests to local Vercel functions.

## 📂 Project Structure

```
src/
  ├── App.tsx                 # Main dashboard (protected)
  ├── components/
  │   ├── LoginPage.tsx       # Google OAuth login
  │   └── SettingsModal.tsx   # User settings
  ├── hooks/
  │   └── useAuth.ts          # Auth state management
  └── services/
      ├── googleAuth.ts       # Google OAuth logic
      ├── api.ts              # API helper
      └── offlineSync.ts      # Data sync

api/
  ├── [...].ts                # Catch-all route handler
  ├── inventory/index.ts      # GET/POST inventory
  ├── categories/index.ts     # GET/POST categories
  ├── varieties/index.ts      # GET/POST varieties
  ├── packaging/index.ts      # GET/POST packaging
  ├── history/index.ts        # GET/POST history
  ├── auth/
  │   ├── google.ts           # Google token verification
  │   └── user-info.ts        # Get user profile
  └── verified-accounts/      # Check authorized users
      ├── index.ts
      └── check.ts

.env                    # Local development
vercel.json            # Vercel configuration
vite.config.ts         # Vite configuration
package.json           # Dependencies
tsconfig.json          # TypeScript config
```

## 🔑 Database Setup

### Supabase Tables Required

1. **`users`** - Stores user profiles
   ```sql
   id, email, name, picture, created_at
   ```

2. **`verified_accounts`** - Allowlist for authorized users
   ```sql
   email (PRIMARY KEY), created_at
   ```

3. **`inventory`** - Inventory items
   ```sql
   id, batchCode, categoryId, varietyId, packagingId, quantityPackages, totalWeight, status, createdAt
   ```

Add your email to `verified_accounts` table to access the system.

## ✅ Testing the Deployment

### Health Check
```bash
GET https://react-inventory-system.vercel.app/api/health
```
Returns API status and configuration.

### Sign In
1. Visit https://react-inventory-system.vercel.app
2. Click **"Sign in with Google"**
3. Should redirect to Google login

### Access Dashboard
- If your email is in `verified_accounts`, you'll see the inventory dashboard
- If not, you'll see "Not authorized"

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| 404 errors on API | Check environment variables are set in Vercel |
| Google sign in fails | Add domain to Google Cloud Console authorized URIs |
| "Not authorized" message | Add your email to Supabase `verified_accounts` table |
| Build fails | Check `npm run build` works locally first |

## 📖 See Also

- [AUTH_IMPLEMENTATION.md](AUTH_IMPLEMENTATION.md) - Detailed auth flow documentation
- [Vercel Docs](https://vercel.com/docs) - Deployment documentation
- [Supabase Docs](https://supabase.com/docs) - Database documentation

2. Create new OAuth 2.0 credentials (Web application)
3. Set redirect URI: `https://your-app.vercel.app/api/auth/google/callback`

## 💻 Local Development

```bash
# Install dependencies
npm install

# Create .env.local file
cp .env.example .env.local

# Update .env.local with your database and Google credentials

# Start development server
npm run dev

# In another terminal, watch backend (if needed)
npm run dev:backend
```

## ✨ Features

✅ **Cloud-Hosted** - Deployed on Vercel, accessible anywhere  
✅ **PostgreSQL Database** - Persistent data storage  
✅ **Google Drive Sync** - Backup and restore from Google Drive  
✅ **Inventory Management** - Track categories, varieties, packaging, stock  
✅ **Dashboard Analytics** - Charts and trends  
✅ **Audit Trail** - Complete history of all changes  
✅ **Google Authentication** - Secure optional login  
✅ **Backend-managed verified account allowlist** (`verified_accounts` table)  

## 📂 Project Structure

```
src/
  components/          # React components
  services/            # API integration (googleAuth, offlineSync)
  App.tsx             # Main app
api/
  index.ts            # Health check
  categories/         # Category CRUD endpoints
  varieties/          # Variety management
  packaging/          # Packaging types
  inventory/          # Inventory items
  history/            # Audit history
  auth/               # Google OAuth endpoints
  sync/               # Google Drive sync endpoints
lib/
  db.ts               # PostgreSQL connection & schema
```

## 🔗 API Endpoints

All endpoints prefixed with `/api/`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET/POST | `/categories` | List/create categories |
| PUT/DELETE | `/categories/[id]` | Update/delete category |
| GET/POST | `/varieties` | Varieties management |
| PUT/DELETE | `/varieties/[id]` | Update/delete variety |
| GET/POST | `/packaging` | Packaging types |
| PUT/DELETE | `/packaging/[id]` | Update/delete packaging |
| GET/POST | `/inventory` | Inventory items |
| PUT/DELETE | `/inventory/[id]` | Update/delete item |
| GET | `/history` | Audit history |
| DELETE | `/history/[id]` | Delete history entry |
| GET | `/auth/google/url` | Google OAuth URL |
| POST | `/sync/google-drive` | Sync to Drive |
| GET | `/sync/backup-info` | Check Drive backup |
| POST | `/sync/restore` | Restore from Drive |

## 📦 Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Backend**: Node.js serverless functions (Vercel)
- **Database**: PostgreSQL (Vercel Postgres)
- **Integration**: Google Drive API
- **Deployment**: Vercel

## 🛠️ Building from Source

```bash
# Build frontend
npm run build

# This creates optimized React bundle in dist/
# Vercel auto-deploys from this
```

## 📝 License

MIT
|----------|---------|
| [QUICKSTART.md](QUICKSTART.md) | For end users - how to run and use |
| [SETUP.md](SETUP.md) | Detailed setup & customization guide |
| [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) | Technical details for developers |

## 🚀 Installation

```bash
# 1. Install dependencies
npm install

# 2. Run with launcher
launcher.bat

# OR run manually
npm run dev              # Terminal 1
npm run dev:backend      # Terminal 2
```

### Create an installer
- Quick: build a portable ZIP (no Inno Setup required):
  - npm run build:installer
  - share `dist\installer\InventorySystem-portable.zip` with users (they still need Node.js installed if you include the project files)

- Full installer (recommended for Windows, requires Inno Setup):
  1. Install Inno Setup (https://jrsoftware.org/isinfo.php)
  2. Run `npm run build:installer` — the script will invoke Inno's ISCC to produce `dist\installer\InventorySystemInstaller.exe`

- Optional: produce a single standalone executable (no Node required):
  1. npm install -g pkg
  2. npm run build:exe   # builds frontend + bundles the app into inventory-system.exe
  3. Re-run `npm run build:installer` (Inno Setup will include `inventory-system.exe` in the final installer)

Notes: `inventory-system.exe` is a single-file executable (Node runtime + app). It serves the frontend and runs the local SQLite DB — users do not need Node.js installed.

⚠️ Packaging prerequisites (single-exe):

- You must package on a machine running **Node 18** (the pkg target is `node18-win-x64`). Native modules (for example `better-sqlite3`) must be rebuilt for Node 18 before packaging.

Quick steps to produce a working `.exe`:
1. Switch to Node 18 (use `nvm` / `nvm-windows`): `nvm install 18 && nvm use 18`.
2. Reinstall/rebuild native modules: `npm ci` or `npm rebuild better-sqlite3 --update-binary`.
3. Run `npm run build:exe`.

A helper script is provided: `scripts/prepare-pkg-windows.ps1` — run it after switching to Node 18 to rebuild native modules automatically.

## 🛠️ Building .exe

```bash
# Install pkg globally
npm install -g pkg

# Build the executable
npm run build:exe

# Result: inventory-system.exe

CI: there's a GitHub Actions workflow (`.github/workflows/build-exe.yml`) that builds `inventory-system.exe` on Windows/Node 18 and uploads it as an artifact — use that if you can't package locally.
```

## ☁️ Google Drive Backup Setup

1. Get OAuth credentials from [Google Cloud Console](https://console.cloud.google.com)
2. Create `.env` file (see `.env.example`)
3. Add Google Client ID and Secret
4. Open Settings in app → Connect Google Account
5. Enable auto-sync

## 📊 Inventory Management

### Features
- Add/edit/delete inventory batches
- Manage categories, varieties, packaging
- Search and filter inventory
- Track batch codes and stock levels
- View complete change history
- Dashboard with analytics

### Database Tables
- **Categories** - Product types (Rice, Wheat, etc.)
- **Varieties** - Subtypes with pricing
- **Packaging Types** - Different sizes and units
- **Inventory** - Batch tracking with quantities
- **History** - Complete audit trail

## 🔄 How Offline Sync Works

```
┌─────────────────────────┐
│  Device is Offline      │
│  • All data saved local │
│  • Works normally       │
│  • No cloud access      │
└──────────┬──────────────┘
           │
           ▼ (Device goes online)
┌─────────────────────────┐
│  Auto-Sync Triggered    │
│  • Uploads DB to Google │
│  • Every 5 minutes      │
│  • Or on manual trigger │
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│  Google Drive Backup    │
│  • Safe cloud backup    │
│  • Can restore anytime  │
│  • Sync across devices  │
└─────────────────────────┘
```

## 💾 Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Backend**: Express.js, SQLite (better-sqlite3)
- **Cloud**: Google Drive API
- **Build**: Vite, TypeScript, pkg
- **UI**: Lucide React, Recharts

## 🔐 Security

- Local SQLite database (no cloud by default)
- Google OAuth 2.0 (optional)
- CORS enabled for localhost
- No hardcoded secrets
- Credentials in .env (not committed)

## 📋 System Requirements

- **Windows 7+** (for .exe) or any OS (source)
- **Node.js 18+** (if running from source)
- **2GB RAM, 100MB disk space**

## 🎯 Common Tasks

### Add Inventory
1. Go to Inventory tab
2. Click "Add Stock"
3. Fill in details
4. Click Save

### View History
1. Go to History tab
2. See all changes with timestamps
3. Click for details

### Sync to Google Drive
1. Click Settings (⚙️ icon)
2. Connect Google account
3. Click "Sync to Google Drive"

### Filter Inventory
1. Use search bar or click Filter
2. Select criteria
3. Results update instantly

## 🐛 Troubleshooting

### Port Already in Use
```bash
netstat -ano | findstr :3001
taskkill /PID [NUMBER] /F
```

### Node.js Not Found
- Install from https://nodejs.org/
- Restart terminal after installation

### Google Sync Not Working
1. Check internet connection
2. Verify .env credentials
3. Check browser console (F12)

### Database Issues
- Delete `inventory.db` and restart
- Check file permissions

## 📈 Performance

- **Startup**: 3-5 seconds
- **Database queries**: <50ms
- **Sync time**: 1-5 seconds
- **Memory**: 150-200MB
- **Storage**: 5-10MB

## 🚀 Production Deployment

1. Build .exe: `npm run build:exe`
2. Share `inventory-system.exe` file
3. Users download and double-click
4. No installation needed

Or deploy backend to cloud server and serve frontend from it.

## 📞 Support

See documentation files for:
- Detailed setup guide
- Troubleshooting tips
- API documentation
- Development guide

## 📝 Version

**1.0.0** - Production Ready (Beta)

## 📄 License

MIT License - Free to use and modify

## 🚀 Getting Started Right Now

```bash
npm install
launcher.bat
```

That's it! Your offline inventory system is ready. 🎉

---

Made with ❤️ for inventory management

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
