# ✅ AI MagicBox Railway Deployment Checklist

## Pre-Deployment Preparation

### 📁 Files Created

- [x] `railway.json` - Railway configuration

- [x] `Procfile` - Process definition

- [x] `.gitignore` - Updated with sensitive files

- [x] `RAILWAY_ENV_VARIABLES.md` - Environment variables documentation

- [x] `RAILWAY_DEPLOYMENT_GUIDE.md` - Complete deployment guide

### 🔍 Code Verification

- [x] `package.json` has correct scripts:
  - ✅ `build`: Compiles frontend
  - ✅ `start`: Starts production server
  - ✅ `db:push`: Database migrations

- [x] All dependencies listed in `package.json`

- [x] `.env` file excluded from Git

---

## Deployment Steps

### Step 1: GitHub Setup

- [ ] Initialize Git repository

- [ ] Create GitHub repository

- [ ] Push code to GitHub

- [ ] Verify all files uploaded

### Step 2: Railway Project

- [ ] Sign up/login to Railway

- [ ] Create new project from GitHub

- [ ] Connect to `aimagicbox` repository

- [ ] Verify automatic deployment started

### Step 3: Database Setup

- [ ] Add PostgreSQL database to project

- [ ] Verify `DATABASE_URL` auto-injected

- [ ] Run database migrations (`npm run db:push`)

- [ ] Verify tables created successfully

### Step 4: Environment Variables

- [ ] Generate new `SESSION_SECRET` (32 chars)

- [ ] Generate new `JWT_SECRET` (32 chars)

- [ ] Add `RUNWARE_API_KEY`

- [ ] Add `GEMINI_API_KEY`

- [ ] Add all SMTP configuration (6 variables)

- [ ] Set `APP_URL` to `https://aimagicbox.ai`

- [ ] Set `NODE_ENV` to `production`

- [ ] Verify all 15+ variables configured

### Step 5: Domain Configuration

- [ ] Add custom domain in Railway settings

- [ ] Copy DNS records provided by Railway

- [ ] Update DNS at domain registrar

- [ ] Wait for DNS propagation (15-30 mins )

- [ ] Verify SSL certificate issued

- [ ] Test HTTPS access

### Step 6: Testing

- [ ] Visit `https://aimagicbox.ai`

- [ ] Test login page loads correctly

- [ ] Test user registration

- [ ] Test email verification

- [ ] Test login functionality

- [ ] Test dashboard access

- [ ] Test AI image generation

- [ ] Test project creation

- [ ] Check all pages load without errors

---

## Post-Deployment

### Monitoring

- [ ] Check Railway deployment logs

- [ ] Monitor application performance

- [ ] Set up error alerts (optional )

### Security

- [ ] Verify all secrets are environment variables

- [ ] Confirm `.env` not in GitHub

- [ ] Review CORS settings if needed

### Optimization

- [ ] Monitor Railway usage/costs

- [ ] Consider caching strategies

- [ ] Review database performance

---

## Important Commands

### Generate Secrets

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Manual Database Migration

```bash
DATABASE_URL="<railway-url>" npm run db:push
```

### Check DNS Propagation

```
https://www.whatsmydns.net
```

---

## Troubleshooting

### If Build Fails

1. Check Railway build logs

1. Verify all dependencies in package.json

1. Ensure Node.js version compatible

### If Database Connection Fails

1. Verify DATABASE_URL is set

1. Check PostgreSQL service is running

1. Run migrations manually

### If Domain Doesn't Work

1. Verify DNS records are correct

1. Wait longer for propagation (up to 48h )

1. Check Railway domain status

### If Email Doesn't Send

1. Verify SMTP credentials

1. Check SMTP_PORT and SMTP_SECURE

1. Test with different email

---

## Expected Timeline

- **GitHub Setup:** 5 minutes

- **Railway Deployment:** 5-10 minutes

- **Environment Configuration:** 10 minutes

- **Database Setup:** 5 minutes

- **Domain Configuration:** 5 minutes

- **DNS Propagation:** 15-30 minutes (up to 48 hours)

- **Testing:** 10 minutes

**Total Time:** ~1 hour (excluding DNS propagation wait)

---

## Success Criteria

✅ Application accessible at [https://aimagicbox.ai](https://aimagicbox.ai)✅ SSL certificate active (HTTPS working )✅ Login/signup functional✅ Email verification working✅ AI features operational✅ Database connected and working✅ No errors in Railway logs

---

## Next Steps After Deployment

1. **Monitor Performance**
  - Check Railway dashboard daily
  - Review logs for errors
  - Monitor costs

1. **Update Manus Domain**
  - Disconnect `aimagicbox.ai` from `modern-login-page` in Manus
  - Keep Manus sandbox for development/testing

1. **Backup Strategy**
  - Regular database backups (Railway provides automatic backups)
  - Keep Git repository updated
  - Document any configuration changes

1. **Future Updates**
  - Push code changes to GitHub
  - Railway auto-deploys on push
  - Test in staging environment if needed

---

**📞 Need Help?**

- Railway Docs: [https://docs.railway.app](https://docs.railway.app)

- Railway Discord: [https://discord.gg/railway](https://discord.gg/railway)

- Check deployment guide: `RAILWAY_DEPLOYMENT_GUIDE.md`

