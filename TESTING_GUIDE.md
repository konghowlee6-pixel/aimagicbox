# AI MagicBox - Testing Guide

## Prerequisites
✅ Railway environment variable `SMTP_FROM` updated to `noreply@aimagicbox.ai`
✅ Railway redeployment completed
✅ Application accessible at https://web-production-8cd2.up.railway.app

## Test 1: Email Verification Flow

### Step 1: Register New User
1. Open: https://web-production-8cd2.up.railway.app
2. Click "Sign Up" or navigate to registration page
3. Fill in:
   - Email: Use a real email you can access
   - Password: At least 6 characters
   - Username: Any username
4. Click "Register" or "Sign Up"

### Step 2: Check Registration Response
**Expected:**
- Success message appears
- User is created in database
- Verification email is sent

**Check Railway Logs for:**
```
[Email] Attempting to send verification email to: [your-email]
[Email] FROM_EMAIL: noreply@aimagicbox.ai
[Email] Verification email sent successfully
```

### Step 3: Check Email Inbox
**Expected:**
- Email arrives within 30 seconds
- From: AI MagicBox <noreply@aimagicbox.ai>
- Subject: "Verify your email address – AI MagicBox"
- Professional purple/pink gradient design
- Clear "Verify Email" button

### Step 4: Click Verification Link
**Expected:**
- Opens verification success page
- Shows success message
- Auto-redirects to https://www.aimagicbox.com after 3 seconds

---

## Test 2: Password Reset Flow

### Step 1: Navigate to Forgot Password
1. Open: https://web-production-8cd2.up.railway.app
2. Click "Forgot Password" link
3. Enter registered email address
4. Click "Send Reset Link"

### Step 2: Check Railway Logs
**Expected:**
```
[Email] Attempting to send password reset email to: [your-email]
[Email] FROM_EMAIL: noreply@aimagicbox.ai
[Email] Password reset email sent successfully
```

### Step 3: Check Email Inbox
**Expected:**
- Email arrives within 30 seconds
- From: AI MagicBox <noreply@aimagicbox.ai>
- Subject: "Reset your password – AI MagicBox"
- Matching branded design
- Clear "Reset Password" button

### Step 4: Click Reset Link
**Expected:**
- Opens password reset page
- Form with "New Password" and "Confirm Password" fields
- Password strength indicator
- Validation messages

### Step 5: Submit New Password
1. Enter new password (min 6 characters)
2. Confirm password
3. Click "Reset Password"

**Expected:**
- Success message appears
- Auto-redirects to login page after 3 seconds

### Step 6: Login with New Password
1. Enter email
2. Enter new password
3. Click "Login"

**Expected:**
- Successfully logs in
- Redirects to dashboard/home page

---

## Troubleshooting

### If Emails Don't Arrive

#### Check 1: Railway Logs
Look for errors:
```
[Email] Failed to send verification email: Error: Connection timeout
```

**Solution:** MailerSend account may still be pending approval. Wait up to 24 hours.

#### Check 2: Spam Folder
- Check spam/junk folder
- Mark as "Not Spam" if found there

#### Check 3: Email Address
- Ensure email address is valid
- Try different email provider (Gmail, Outlook, etc.)

#### Check 4: MailerSend Dashboard
1. Login to: https://www.mailersend.com/
2. Check "Activity" tab
3. Look for sent emails and delivery status

### If Connection Still Times Out

**Option A:** Use test domain temporarily
Update Railway `SMTP_FROM` to:
```
noreply@test-y7zpl9898do45vx6.mlsender.net
```

**Option B:** Wait for MailerSend approval
- Account approval takes up to 24 hours
- Full sending capabilities after approval
- No rate limits or throttling

**Option C:** Contact MailerSend support
- Request expedited approval
- Explain production deployment needs

---

## Success Indicators

### ✅ Email Verification Working
- User receives verification email within 30 seconds
- Email has professional branding
- Verification link works
- Redirects to aimagicbox.com after 3 seconds
- No errors in Railway logs

### ✅ Password Reset Working
- User receives reset email within 30 seconds
- Reset link opens password reset page
- New password can be set
- Redirects to login page after 3 seconds
- User can login with new password

### ✅ Overall System Health
- No module import errors in logs
- No SMTP connection timeouts
- All pages load correctly
- Mobile responsive design works
- Popup dialogs display properly

---

## Railway Log Commands

### View Recent Logs
```bash
railway logs --tail 100
```

### Follow Logs in Real-Time
```bash
railway logs --follow
```

### Filter Email-Related Logs
```bash
railway logs | grep -i email
```

---

## Contact Information

**MailerSend Support:** https://www.mailersend.com/help
**Railway Support:** https://railway.app/help
**Project URL:** https://web-production-8cd2.up.railway.app

---

**Last Updated:** 2025-11-18 02:45 GMT+8
