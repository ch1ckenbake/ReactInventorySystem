# 🚀 Quick Deploy to Vercel

## 1️⃣ Vercel Postgres Setup (5 min)
```bash
# Visit https://vercel.com/postgres
# Create free database
# Copy: POSTGRES_PRISMA_URL and POSTGRES_URL_NON_POOLING
```

## 2️⃣ Google OAuth Setup (10 min)
```bash
# Visit https://console.cloud.google.com
# Create OAuth 2.0 Web Application credentials
# Authorized redirect URIs:
#   https://your-app.vercel.app/api/auth/google/callback

# Copy: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
```

## 3️⃣ Local Test (Optional)
```bash
# Copy .env.example to .env.local
cp .env.example .env.local

# Edit .env.local with your credentials
# Run locally
npm install
npm run build  
npm run dev
# Visit http://localhost:5173
```

## 4️⃣ Deploy to Vercel (5 min)
```bash
# Push code
git add .
git commit -m "Deploy inventory system to Vercel"
git push

# Visit https://vercel.com/new
# Import GitHub repository
# Configure Build Settings:
#   - Framework: Vite
#   - Build Command: npm run build
#   - Output Directory: dist
#
# Environment Variables (add from steps 1 & 2):
#   POSTGRES_PRISMA_URL=<from step 1>
#   POSTGRES_URL_NON_POOLING=<from step 1>
#   GOOGLE_CLIENT_ID=<from step 2>
#   GOOGLE_CLIENT_SECRET=<from step 2>
#
# Click "Deploy"
```

✅ Done! Your app is live at `https://[your-project].vercel.app`

---

## 📋 Env Variables Needed

```dotenv
# Database (from Vercel Postgres)
POSTGRES_PRISMA_URL=postgresql://...
POSTGRES_URL_NON_POOLING=postgresql://...

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
```

## 🔗 Useful Links

| What | Link |
|------|------|
| Vercel Dashboard | https://vercel.com/dashboard |
| Vercel Postgres | https://vercel.com/postgres |
| Google Cloud Console | https://console.cloud.google.com |
| Your App Logs | https://vercel.com/[project]/deployments |
| Full Setup Guide | Read MIGRATION_GUIDE.md |

## 🧪 Test Your Deployment

Once deployed:

```bash
# Health check
curl https://your-app.vercel.app/api

# Get all categories
curl https://your-app.vercel.app/api/categories

# Your app should be at
https://your-app.vercel.app
```

## ❌ Troubleshooting

| Issue | Solution |
|-------|----------|
| 500 error on GET / | Check database env vars in Vercel |
| CORS errors | Already enabled on backend |
| Can't log in | Check GOOGLE_CLIENT_ID and redirect URI |
| Database empty | Schema auto-creates on first run |
| Env vars not working | Redeploy after adding variables |

## 📖 More Help

- **LOCAL_DEV_GUIDE.md** - Local development setup
- **DEPLOYMENT_SUMMARY.md** - Detailed checklist  
- **MIGRATION_GUIDE.md** - What changed
- **README.md** - Full documentation

---

**You've got this!** 🎉 

Any questions? Check the docs or review the `/api` directory for endpoint details.
