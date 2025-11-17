# 🚀 AI MagicBox - Railway Deployment Guide

Complete step-by-step guide to deploy your AI MagicBox application to Railway with custom domain `aimagicbox.ai`.

---

## 📋 Prerequisites

- GitHub account
- Railway account (sign up at https://railway.app)
- Your custom domain `aimagicbox.ai` DNS access

---

## 🎯 Deployment Steps

### **Step 1: Prepare Your Code Repository**

#### 1.1 Initialize Git Repository
```bash
cd /home/ubuntu/aimagicbox
git init
git add .
git commit -m "Initial commit - AI MagicBox application"
```

#### 1.2 Create GitHub Repository
1. Go to https://github.com/new
2. Create a new repository named `aimagicbox`
3. **Do NOT initialize** with README, .gitignore, or license
4. Copy the repository URL

#### 1.3 Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/aimagicbox.git
git branch -M main
git push -u origin main
```

---

### **Step 2: Deploy to Railway**

#### 2.1 Create New Project
1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub
5. Select your `aimagicbox` repository

#### 2.2 Add PostgreSQL Database
1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway will automatically create a database
4. The `DATABASE_URL` will be auto-injected into your app

#### 2.3 Configure Environment Variables
1. Click on your **aimagicbox service**
2. Go to **"Variables"** tab
3. Click **"+ New Variable"**
4. Add all variables from `RAILWAY_ENV_VARIABLES.md`:

**Required Variables:**
```
SESSION_SECRET=<generate-new-secret>
JWT_SECRET=<generate-new-secret>
RUNWARE_API_KEY=nhfOlliGtbwKtXaxWZyXNcF0FAwlOLXO
GEMINI_API_KEY=AIzaSyA2PP-C-SlNs7vNyvsIXnFBZVFzsukOzQ8
SMTP_HOST=mail.arriival.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=careteam@arriival.com
SMTP_PASS=Lin!!8899!@#!@#
SMTP_FROM=careteam@arriival.com
SMTP_FROM_NAME=AI MagicBox
APP_URL=https://aimagicbox.ai
NODE_ENV=production
```

**Generate Secrets:**
```bash
# Run this command twice to generate SESSION_SECRET and JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 2.4 Deploy
1. Railway will automatically detect your Node.js app
2. It will run `npm install` and `npm run build`
3. Then start with `npm start`
4. Wait for deployment to complete (2-5 minutes)

---

### **Step 3: Set Up Database**

#### 3.1 Run Database Migrations
1. In Railway, go to your **aimagicbox service**
2. Click **"Settings"** → **"Deploy"**
3. Under **"Build Command"**, add:
   ```
   npm run build && npm run db:push
   ```
4. Redeploy the service

**Alternative: Manual Migration**
1. Click on **PostgreSQL** service
2. Go to **"Connect"** tab
3. Copy the **"Postgres Connection URL"**
4. In your local terminal:
   ```bash
   DATABASE_URL="<railway-postgres-url>" npm run db:push
   ```

---

### **Step 4: Connect Custom Domain**

#### 4.1 Add Domain in Railway
1. In your Railway project, click on **aimagicbox service**
2. Go to **"Settings"** → **"Domains"**
3. Click **"+ Custom Domain"**
4. Enter: `aimagicbox.ai`
5. Railway will provide DNS records

#### 4.2 Update DNS Records
Railway will show you one of these options:

**Option A: CNAME Record (Recommended)**
- **Type:** CNAME
- **Name:** `@` or `aimagicbox.ai`
- **Value:** `<your-app>.up.railway.app`

**Option B: A Record**
- **Type:** A
- **Name:** `@`
- **Value:** `<ip-address-provided-by-railway>`

#### 4.3 Configure DNS
1. Log into your domain registrar (where you bought aimagicbox.ai)
2. Go to DNS Management
3. Add the CNAME or A record provided by Railway
4. Save changes

#### 4.4 Wait for DNS Propagation
- DNS changes can take 5 minutes to 48 hours
- Usually completes within 15-30 minutes
- Check status: https://www.whatsmydns.net

#### 4.5 Update APP_URL
1. Once domain is connected, go back to Railway
2. Update the `APP_URL` variable to: `https://aimagicbox.ai`
3. Redeploy the service

---

### **Step 5: Verify Deployment**

#### 5.1 Test Your Application
1. Visit `https://aimagicbox.ai`
2. Test login functionality
3. Test sign-up with email verification
4. Test AI features (image generation, etc.)

#### 5.2 Check Logs
1. In Railway, go to your service
2. Click **"Deployments"** tab
3. View logs to check for any errors

---

## 🔧 Post-Deployment Configuration

### **SSL Certificate**
- ✅ Railway automatically provisions SSL certificates
- ✅ HTTPS is enabled by default
- ✅ No additional configuration needed

### **Environment Updates**
To update environment variables:
1. Go to Railway → Your Service → Variables
2. Edit the variable
3. Service will automatically redeploy

### **Code Updates**
To deploy new code:
```bash
git add .
git commit -m "Your update message"
git push origin main
```
Railway will automatically detect and deploy changes.

---

## 💰 Pricing Information

### **Railway Pricing:**
- **Free Tier:** $5 credit per month
- **Hobby Plan:** $5/month + usage
- **Typical Cost for AI MagicBox:** $10-20/month

**Cost Breakdown:**
- Web Service: ~$5-10/month
- PostgreSQL Database: ~$5/month
- Bandwidth: Included in base price

---

## 🐛 Troubleshooting

### **Build Fails**
- Check build logs in Railway
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### **Database Connection Error**
- Verify `DATABASE_URL` is set correctly
- Check if database migrations ran successfully
- Run `npm run db:push` manually

### **Domain Not Working**
- Verify DNS records are correct
- Wait for DNS propagation (up to 48 hours)
- Check Railway domain status

### **Email Not Sending**
- Verify SMTP credentials are correct
- Check SMTP_PORT and SMTP_SECURE settings
- Test with a different email provider if needed

---

## 📞 Support

- **Railway Documentation:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **AI MagicBox Issues:** Check application logs in Railway

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Railway project created
- [ ] PostgreSQL database added
- [ ] All environment variables configured
- [ ] Database migrations completed
- [ ] Application deployed successfully
- [ ] Custom domain added in Railway
- [ ] DNS records updated
- [ ] Domain SSL certificate active
- [ ] Application tested and working
- [ ] Email verification tested
- [ ] AI features tested

---

**🎉 Congratulations! Your AI MagicBox is now live at https://aimagicbox.ai**
