# Local Development Setup

This guide helps you set up the project for local development before deploying to Vercel.

## Prerequisites

- Node.js 18+ (check with `node --version`)
- npm 9+ (comes with Node)
- PostgreSQL installed locally (or access to a remote database)

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Database

**Option A: Use Vercel Postgres (Recommended)**
1. Create free PostgreSQL at [vercel.com/postgres](https://vercel.com/postgres)
2. Copy the connection string

**Option B: Use Local PostgreSQL**
```bash
# Install PostgreSQL if you haven't already
# macOS:
brew install postgresql

# Windows: Download from https://www.postgresql.org/download/windows/
# Linux: apt-get install postgresql
```

### 3. Create .env.local

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your values:
```dotenv
# Database Connection
POSTGRES_PRISMA_URL=postgresql://user:password@localhost:5432/inventory_db
POSTGRES_URL_NON_POOLING=postgresql://user:password@localhost:5432/inventory_db

# Google OAuth (optional for local dev)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
VERCEL_URL=http://localhost:3000
```

### 4. Build & Run

```bash
# Build the project
npm run build

# Start development server
npm run dev
```

Your app will be at `http://localhost:5173`

## Development Workflow

### Frontend Development
```bash
npm run dev
# This starts Vite dev server with hot reload
# Your browser will auto-refresh when you edit files
```

### TypeScript Check
```bash
npm run build  # This runs tsc build check
```

### Linting
```bash
npm run lint
```

## API Development

The API endpoints are in `/api`:

### Hot Reload During Dev
- Vite automatically reloads the frontend
- API endpoints are in `/api` - check Vercel CLI or local testing for changes

### Testing Endpoints Locally

```bash
# Health check
curl http://localhost:5173/api

# Get all categories
curl http://localhost:5173/api/categories

# Create category
curl -X POST http://localhost:5173/api/categories \
  -H "Content-Type: application/json" \
  -d '{"name":"Rice","description":"Rice products","currency":"PHP"}'
```

## Troubleshooting

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Database Connection Issues
```bash
# Check connection string in .env.local
# For local PostgreSQL, verify it's running:
# macOS: brew services start postgresql
# Windows: Check Services → PostgreSQL is running
```

### Port Already in Use
```bash
# Default ports:
# Vite: 5173
# API: runs on same Vite port

# If port 5173 is in use, specify a different one:
npm run dev -- --port 3000
```

## Database Migrations

For now, the schema is auto-created on first run via `lib/db.ts`.

If you need to create tables manually:
```sql
-- Connect to your database first
psql your_database

-- Then run the SQL from SCHEMA.sql
\i backend/schema.sql
```

## Next Steps

1. ✅ Local dev works
2. ✅ Test all CRUD operations
3. ✅ Test Google OAuth (if needed)
4. 📦 Deploy to Vercel (see README.md)

## Useful Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Check code quality |

## Need Help?

- See [README.md](./README.md) for deployment guide
- See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for migration details
- See [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md) for status

---
Happy coding! 🚀
