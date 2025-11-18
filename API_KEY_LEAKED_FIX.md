# 🚨 Gemini API Key Leaked - Fix Guide

## ❌ Problem Detected

**Error Message:**
```
Your API key was reported as leaked. 
Please use another API key.
```

**Status:** The current Gemini API key (`AIzaSyA2PP-C-SlNs7vNyvsIXnFBZVFzsukOzQ8`) has been flagged as leaked by Google and is now **DISABLED**.

---

## 🔍 Why This Happened

API keys can be leaked through:
- ✗ Committed to Git repository (even if later removed, it's in history)
- ✗ Exposed in public code
- ✗ Shared in screenshots or documentation
- ✗ Uploaded to public platforms

**Important:** Once a key is leaked, it cannot be reused even if you remove it from public view.

---

## ✅ Solution: Generate New API Key

### Step 1: Go to Google AI Studio
Visit: https://aistudio.google.com/app/apikey

### Step 2: Delete Old Key (Optional but Recommended)
- Find the leaked key: `AIzaSyA2PP-C-SlNs7vNyvsIXnFBZVFzsukOzQ8`
- Click the trash icon to delete it
- This prevents any further unauthorized use

### Step 3: Create New API Key
1. Click **"Create API Key"** button
2. Select your Google Cloud project (or create new one)
3. Copy the new key (starts with `AIza...`)
4. **IMPORTANT:** Keep this key private!

### Step 4: Update Local Environment
The new key needs to be added to `.env` file:
```bash
GEMINI_API_KEY=AIza...your-new-key-here
```

### Step 5: Update Railway Environment
1. Login to Railway Dashboard: https://railway.app/dashboard
2. Go to your AI MagicBox project
3. Click "Variables" tab
4. Find `GEMINI_API_KEY`
5. Click "Edit" and replace with new key
6. Save and redeploy

---

## 🔒 Best Practices to Prevent Future Leaks

### 1. Never Commit API Keys to Git
✅ **DO:**
- Use `.env` files (already in `.gitignore`)
- Use environment variables
- Use secret management tools

✗ **DON'T:**
- Hardcode keys in source code
- Commit `.env` files
- Share keys in public channels

### 2. Use Git History Cleaning (If Already Committed)
If keys were committed to Git:
```bash
# Remove from Git history (use with caution!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (WARNING: Rewrites history)
git push origin --force --all
```

### 3. Rotate Keys Regularly
- Generate new keys every 3-6 months
- Delete old keys after rotation
- Update all environments

### 4. Use API Key Restrictions
In Google Cloud Console:
- Restrict by IP address
- Restrict by HTTP referrer
- Restrict by API (only enable Gemini API)

---

## 🧪 Testing After Fix

### 1. Verify New Key Works Locally
```bash
cd /home/ubuntu/aimagicbox

# Update .env with new key
# Then restart server
pnpm run dev

# Test the API
curl -X POST http://localhost:3000/api/quickclip/generate-animation-prompt \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://h5.arriival.com/test.jpg", "variation": 0}'
```

### 2. Check Diagnostics
```bash
curl http://localhost:3000/api/diagnostics | jq '.services.gemini'
```

Should return: `"configured"`

### 3. Test Magic Wand in Browser
1. Go to QuickClip Video Generator
2. Upload an image
3. Click "Magic Wand" button
4. Should generate animation prompt successfully

---

## 📋 Checklist

- [ ] Generated new Gemini API key from Google AI Studio
- [ ] Deleted old leaked key
- [ ] Updated `.env` file with new key
- [ ] Restarted local server
- [ ] Tested API endpoint locally
- [ ] Updated Railway environment variable
- [ ] Redeployed Railway
- [ ] Tested Magic Wand in production
- [ ] Verified no errors in logs

---

## 🔍 Current Status

**Leaked Key:** `AIzaSyA2PP-C-SlNs7vNyvsIXnFBZVFzsukOzQ8` ❌ DISABLED

**Action Required:** Generate new key and update both:
1. Local `.env` file
2. Railway environment variables

---

## 📞 Support

If you encounter issues:
1. Verify new key is correctly copied (no extra spaces)
2. Check Google Cloud Console for key status
3. Ensure key has Gemini API enabled
4. Check Railway deployment logs

---

## ⚠️ Security Reminder

**NEVER share API keys in:**
- ✗ Git commits
- ✗ Public documentation
- ✗ Screenshots
- ✗ Chat messages
- ✗ Public forums

**ALWAYS use:**
- ✅ Environment variables
- ✅ Secret management tools
- ✅ Private configuration files (in `.gitignore`)

---

**Date:** November 18, 2025
**Status:** Waiting for new Gemini API key
**Priority:** HIGH - Blocks Magic Wand feature
