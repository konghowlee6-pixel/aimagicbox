# AI MagicBox - Vercel Deployment Guide

## 🚀 Quick Deployment Steps

### Prerequisites
- Vercel account (free tier): https://vercel.com/signup
- GitHub account (optional but recommended)

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI** (already installed in this environment)
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   cd /home/ubuntu/aimagicbox
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables** (after first deployment)
   ```bash
   vercel env add DATABASE_URL
   vercel env add RUNWARE_API_KEY
   vercel env add GEMINI_API_KEY
   vercel env add JWT_SECRET
   ```

### Option 2: Deploy via GitHub + Vercel Dashboard

1. **Push to GitHub**
   ```bash
   cd /home/ubuntu/aimagicbox
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to https://vercel.com/new
   - Click "Import Git Repository"
   - Select your GitHub repository
   - Configure build settings (see below)
   - Add environment variables
   - Click "Deploy"

---

## ⚙️ Vercel Configuration

### Build Settings

**Framework Preset:** Other  
**Build Command:** `npm run build`  
**Output Directory:** `dist/public`  
**Install Command:** `npm install`

### Environment Variables

Add these in Vercel Dashboard → Project Settings → Environment Variables:

```
DATABASE_URL=your_postgres_connection_string
RUNWARE_API_KEY=nhfOlliGtbwKtXaxWZyXNcF0FAwlOLXO
GEMINI_API_KEY=AIzaSyA2PP-C-SlNs7vNyvsIXnFBZVFzsukOzQ8
JWT_SECRET=aimagicbox-super-secret-jwt-key-2024
NODE_ENV=production
```

---

## 🗄️ Database Setup for Production

### Option 1: Vercel Postgres (Recommended)

1. Go to your Vercel project dashboard
2. Click "Storage" tab
3. Click "Create Database" → "Postgres"
4. Copy the connection string
5. Add it as `DATABASE_URL` environment variable
6. Run migrations:
   ```bash
   DATABASE_URL="your_vercel_postgres_url" npm run db:push
   ```

### Option 2: Neon Database (Free Tier)

1. Sign up at https://neon.tech
2. Create a new project
3. Copy the connection string
4. Add it as `DATABASE_URL` in Vercel
5. Run migrations:
   ```bash
   DATABASE_URL="your_neon_url" npm run db:push
   ```

### Option 3: Supabase (Free Tier)

1. Sign up at https://supabase.com
2. Create a new project
3. Go to Settings → Database
4. Copy the connection string (use "Connection pooling" URL)
5. Add it as `DATABASE_URL` in Vercel
6. Run migrations:
   ```bash
   DATABASE_URL="your_supabase_url" npm run db:push
   ```

---

## 📝 vercel.json Configuration

The project already has a `vercel.json` file configured. Here's what it does:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server/index.ts",
      "use": "@vercel/node"
    },
    {
      "src": "client/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist/public"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "dist/public/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

---

## 🔧 Post-Deployment Steps

### 1. Verify Deployment
- Visit your Vercel URL (e.g., `https://aimagicbox.vercel.app`)
- Check if the login page loads

### 2. Test Login
- Email: testuser@magicbox.com
- Password: 123456

### 3. Check Logs
- Go to Vercel Dashboard → Your Project → Deployments
- Click on the latest deployment
- View "Functions" tab for server logs

### 4. Add Custom Domain (Optional)
- Go to Project Settings → Domains
- Add your custom domain
- Follow DNS configuration instructions

---

## 🐛 Troubleshooting

### Build Fails

**Error:** "Cannot find module"
- **Fix:** Make sure all dependencies are in `package.json`
- Run `npm install` locally to verify

**Error:** "Build exceeded time limit"
- **Fix:** Vercel free tier has 45-second build limit
- Optimize build process or upgrade plan

### Database Connection Issues

**Error:** "Connection refused" or "Timeout"
- **Fix:** Ensure DATABASE_URL is set correctly
- Use connection pooling URL for serverless environments
- Check if database allows connections from Vercel IPs

### Login Not Working

**Error:** 401 or 500 errors
- **Fix:** Verify all environment variables are set
- Check JWT_SECRET is configured
- Ensure database migrations have run

### API Routes 404

**Error:** "/api/auth/login" returns 404
- **Fix:** Verify vercel.json routing configuration
- Check server/index.ts exports correctly
- Ensure @vercel/node is handling the routes

---

## 📊 Deployment Checklist

- [ ] Vercel account created
- [ ] Project pushed to GitHub (if using GitHub method)
- [ ] Database created (Vercel Postgres/Neon/Supabase)
- [ ] DATABASE_URL environment variable set
- [ ] RUNWARE_API_KEY environment variable set
- [ ] GEMINI_API_KEY environment variable set
- [ ] JWT_SECRET environment variable set
- [ ] Database migrations run (`npm run db:push`)
- [ ] Project deployed to Vercel
- [ ] Login tested and working
- [ ] Custom domain configured (optional)

---

## 🎯 Expected Result

After successful deployment:

✅ **URL:** https://your-project-name.vercel.app  
✅ **Login:** Working with JWT tokens  
✅ **Database:** Connected and operational  
✅ **API:** All endpoints responding  
✅ **Performance:** Fast global CDN delivery  
✅ **Uptime:** 99.9% guaranteed by Vercel  

---

## 💡 Alternative: Deploy to Railway

If you prefer Railway over Vercel:

1. Sign up at https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Add environment variables
4. Railway will auto-detect and deploy
5. Get a permanent URL like: `https://aimagicbox.up.railway.app`

**Railway Advantages:**
- Easier database setup (built-in Postgres)
- Better for full-stack apps
- Generous free tier ($5/month credit)

---

## 📞 Need Help?

If you encounter issues:
1. Check Vercel deployment logs
2. Verify all environment variables
3. Test database connection
4. Review server logs in Vercel dashboard

The application is fully ready for deployment - just follow these steps!
