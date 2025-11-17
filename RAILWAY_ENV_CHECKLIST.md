# ✅ Railway Environment Variables Checklist

## 🔍 Problem: Emails worked yesterday but not working now

**Yesterday (Sun 13:12):** ✅ Email successfully received  
**Today:** ❌ Email not received

---

## 📋 Required Railway Environment Variables

Please check your Railway dashboard and **verify these exact values**:

### SMTP Configuration (MUST match exactly):

```
SMTP_HOST = mail.arriival.com
SMTP_PORT = 587
SMTP_SECURE = false
SMTP_USER = careteam@arriival.com
SMTP_PASS = Lin!!8899!@#!@#
SMTP_FROM = careteam@arriival.com
SMTP_FROM_NAME = AI MagicBox
```

### Application URL:

```
APP_URL = https://web-production-8cd2.up.railway.app
```

---

## 🚨 Common Issues

### Issue 1: SMTP_PORT is set to 465 instead of 587
**Fix:** Change `SMTP_PORT` from `465` to `587`

### Issue 2: SMTP_SECURE is set to true instead of false
**Fix:** Change `SMTP_SECURE` from `true` to `false`

### Issue 3: Variables were deleted or modified
**Fix:** Re-add all SMTP variables exactly as shown above

### Issue 4: Railway deployment failed
**Fix:** Check Railway deployment logs for errors

---

## 🔧 How to Check and Fix

### Step 1: Login to Railway
1. Go to: https://railway.app
2. Open your `aimagicbox` project
3. Click on the `web` service

### Step 2: Check Variables Tab
1. Click on **"Variables"** tab
2. Look for all SMTP_* variables
3. Verify each value matches the list above

### Step 3: Check for Missing Variables
Make sure ALL these variables exist:
- [ ] SMTP_HOST
- [ ] SMTP_PORT
- [ ] SMTP_SECURE
- [ ] SMTP_USER
- [ ] SMTP_PASS
- [ ] SMTP_FROM
- [ ] SMTP_FROM_NAME
- [ ] APP_URL

### Step 4: Check Deployment Status
1. Click on **"Deployments"** tab
2. Check if the latest deployment succeeded
3. Look for any error messages

### Step 5: Check Deployment Logs
1. Click on the latest deployment
2. Click **"View Logs"**
3. Look for email-related messages
4. Look for SMTP configuration on startup

---

## 📊 Expected Logs (If Working)

When you register a test account, you should see:

```
[Email] Creating SMTP transporter with config: {
  host: 'mail.arriival.com',
  port: 587,
  secure: false,
  user: 'careteam@arriival.com'
}
[Email] SMTP transporter created
[Email] Attempting to send verification email to: test@example.com
[Email] FROM_NAME: AI MagicBox FROM_EMAIL: careteam@arriival.com
[Email] APP_URL: https://web-production-8cd2.up.railway.app
[Email] Verification email sent successfully
```

---

## ❌ Error Logs (If Not Working)

If you see these errors:

### Error 1: Connection Timeout
```
[Email] Failed to send verification email: Error: Email send timeout after 10 seconds
```
**Cause:** SMTP_PORT might be set to 465 instead of 587  
**Fix:** Change SMTP_PORT to 587

### Error 2: Authentication Failed
```
[Email] Failed to send verification email: Error: Invalid login
```
**Cause:** SMTP_USER or SMTP_PASS is incorrect  
**Fix:** Verify credentials match exactly

### Error 3: Connection Refused
```
[Email] Failed to send verification email: Error: Connection refused
```
**Cause:** SMTP_HOST or SMTP_PORT is incorrect  
**Fix:** Verify host is `mail.arriival.com` and port is `587`

---

## 🧪 Testing Steps

### 1. Verify Environment Variables
- [ ] All SMTP variables are set correctly
- [ ] SMTP_PORT = 587 (not 465)
- [ ] SMTP_SECURE = false (not true)

### 2. Trigger Redeployment
If you changed any variables:
- [ ] Railway will automatically redeploy
- [ ] Wait 1-2 minutes for deployment to complete

### 3. Test Registration
- [ ] Go to: https://web-production-8cd2.up.railway.app/register
- [ ] Register with a test email
- [ ] Check Railway logs immediately

### 4. Check Email Inbox
- [ ] Check inbox (should arrive in 1-2 minutes)
- [ ] Check spam/junk folder
- [ ] Check if email address is correct

---

## 🎯 Most Likely Cause

Based on the symptoms, the most likely cause is:

**Railway environment variables were changed during our troubleshooting:**
- We tried port 465 (didn't work)
- We tried increased timeouts (didn't work)
- **We need to set it back to port 587 with SMTP_SECURE=false**

---

## ✅ Quick Fix Checklist

1. [ ] Login to Railway
2. [ ] Go to Variables tab
3. [ ] Set `SMTP_PORT = 587`
4. [ ] Set `SMTP_SECURE = false`
5. [ ] Verify other SMTP variables are correct
6. [ ] Wait for automatic redeployment (1-2 min)
7. [ ] Test registration
8. [ ] Check Railway logs
9. [ ] Check email inbox

---

## 📞 If Still Not Working

If emails still don't work after verifying all variables:

1. **Copy the Railway deployment logs** (all email-related messages)
2. **Send me the logs**
3. I'll diagnose the exact issue

---

## 💡 Remember

**Yesterday it worked with:**
- Port 587
- SMTP_SECURE = false
- Standard 10-15 second timeouts

**Let's get back to that exact configuration!** 🎯
