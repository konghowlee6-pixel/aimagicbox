# 🚀 Production Deployment Instructions for aimagicbox.ai

## ⚠️ CRITICAL ISSUE IDENTIFIED

Your production deployment (aimagicbox.ai) is experiencing issues because:

1. **Outdated Code**: Production is running OLD code with hardcoded Firebase authDomain
2. **Missing Environment Variable**: Production deployment doesn't have `VITE_FIREBASE_AUTH_DOMAIN` set

## ✅ CODE FIXES APPLIED (Ready for Deployment)

The following fixes have been completed in the codebase:

### 1. Firebase Configuration Fixed
**File**: `client/src/lib/firebase.ts`
```javascript
// BEFORE (hardcoded - WRONG)
authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`

// AFTER (environment variable - CORRECT) ✓
authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
```

### 2. Verified No Issues With:
- ✅ localStorage (only stores UI preferences, not auth/data)
- ✅ Backend endpoints (environment-agnostic, no hardcoded domains)
- ✅ Database queries (work on any domain)
- ✅ API authentication (uses Firebase auth headers correctly)

## 📋 DEPLOYMENT STEPS (Follow Exactly)

### Step 1: Access Replit Publishing Tool
1. Open your Replit workspace
2. Click on the **"Publishing"** icon in the left sidebar
3. Find your existing deployment for `aimagicbox.ai`

### Step 2: Add Deployment Secret (CRITICAL)
In the Publishing tool, add this **Deployment Secret**:

```
Key: VITE_FIREBASE_AUTH_DOMAIN
Value: aimagicbox.ai
```

**Important Notes:**
- This is a **deployment secret**, NOT a workspace secret
- The value must be exactly `aimagicbox.ai` (your custom domain)
- Do NOT use `*.firebaseapp.com` or `*.replit.dev`

### Step 3: Verify All Deployment Secrets
Ensure these deployment secrets are configured:

**Required Firebase Secrets:**
- `VITE_FIREBASE_API_KEY` (from your development secrets)
- `VITE_FIREBASE_AUTH_DOMAIN` = `aimagicbox.ai` ← **ADD THIS**
- `VITE_FIREBASE_PROJECT_ID` (from your development secrets)
- `VITE_FIREBASE_APP_ID` (from your development secrets)

**Required Backend Secrets:**
- `DATABASE_URL`
- `PGDATABASE`, `PGHOST`, `PGPASSWORD`, `PGPORT`, `PGUSER`
- `GEMINI_API_KEY`
- `VITE_GEMINI_API_KEY`
- `VERTEX_API_KEY`
- `VERTEX_PROJECT_ID`
- `STRIPE_SECRET_KEY`
- `VITE_STRIPE_PUBLIC_KEY`
- `SESSION_SECRET`

**Note**: Most of these should already be added from your workspace secrets. You only need to manually add `VITE_FIREBASE_AUTH_DOMAIN`.

### Step 4: Republish Your Application
1. Click **"Publish"** or **"Republish"** button
2. Wait for the build to complete (check build logs for errors)
3. Wait for deployment to finish

**Build Configuration (Already Set in `.replit`):**
- Build command: `npm run build`
- Run command: `npm run start`
- Deployment type: Autoscale

### Step 5: Clear Browser Cache (Important)
After republishing:
1. Open https://aimagicbox.ai in an **Incognito/Private window**
2. Or clear your browser cache completely
3. This prevents old cached code from interfering

### Step 6: Test Critical Flows

**Test 1: Authentication**
1. Visit https://aimagicbox.ai
2. Sign in with Google
3. ✅ You should be redirected to dashboard
4. Refresh the page (F5)
5. ✅ You should remain logged in (NOT redirected to login)

**Test 2: Save Project**
1. Create or open a project
2. Generate some visuals
3. Click "Save to My Project"
4. ✅ Success message should appear
5. Refresh the page (F5)
6. ✅ Saved visuals should still be visible

**Test 3: Share to Public**
1. Go to "My Projects" page
2. Find a project with saved images
3. Click the globe icon on the project card
4. ✅ Success message (NOT "Fail to Share Image")
5. Navigate to Community page
6. ✅ Your shared project should appear in the gallery

**Test 4: Session Persistence**
1. While logged in, close the browser completely
2. Reopen browser and go to https://aimagicbox.ai
3. ✅ You should still be logged in
4. ✅ Your projects should be visible

## 🔍 VERIFICATION CHECKLIST

After deployment, verify:

- [ ] `VITE_FIREBASE_AUTH_DOMAIN=aimagicbox.ai` is set as deployment secret
- [ ] Application republished successfully (check build logs)
- [ ] Can login with Google on https://aimagicbox.ai
- [ ] Session persists after page refresh
- [ ] Session persists after browser close/reopen
- [ ] Can save images to projects
- [ ] Saved images remain after refresh
- [ ] Can share projects to Community (no "Fail to Share" error)
- [ ] Shared projects appear in Community gallery
- [ ] No console errors in browser (F12 → Console tab)

## 🐛 TROUBLESHOOTING

### Issue: "Fail to Share Image" error persists
**Solution**: 
1. Verify `VITE_FIREBASE_AUTH_DOMAIN=aimagicbox.ai` is set in deployment secrets
2. Republish the application
3. Clear browser cache or test in incognito mode

### Issue: Projects disappear after refresh
**Solution**:
1. Open browser console (F12)
2. Look for Firebase auth errors
3. Verify you're testing on https://aimagicbox.ai (not *.replit.dev)
4. Ensure deployment has the correct `VITE_FIREBASE_AUTH_DOMAIN`

### Issue: Session lost after login
**Solution**:
1. Check Firebase Console → Authentication → Authorized domains
2. Ensure `aimagicbox.ai` is listed
3. Check Google Cloud Console → OAuth redirect URIs
4. Ensure `https://aimagicbox.ai/__/auth/handler` is listed

### Issue: Build fails during deployment
**Solution**:
1. Check build logs in Replit Publishing tool
2. Verify all required environment variables are set
3. Try republishing again (sometimes network issues occur)

### Issue: Still seeing old behavior
**Solution**:
1. Browser cache - Test in incognito/private window
2. Service worker cache - Clear site data in DevTools
3. CDN cache - Wait 5 minutes for CDN to invalidate

## 📊 WHAT CHANGED

### Before (Production Issues)
```
Firebase Config → authDomain: "your-project.firebaseapp.com"
                             ↓
Production Domain → aimagicbox.ai
                             ↓
Authentication Context Mismatch → Session Lost
                             ↓
API Calls Fail → "Fail to Share Image"
Projects Disappear → Can't Retrieve User Data
```

### After (Fixed)
```
Firebase Config → authDomain: "aimagicbox.ai"
                             ↓
Production Domain → aimagicbox.ai
                             ✓
Authentication Context Match → Session Persists
                             ✓
API Calls Work → Sharing Successful
Projects Persist → User Data Retrieved
```

## 🎯 NEXT STEPS

1. **Add deployment secret**: `VITE_FIREBASE_AUTH_DOMAIN=aimagicbox.ai`
2. **Republish** the application
3. **Test in incognito mode** at https://aimagicbox.ai
4. **Verify all critical flows** work (login, save, share, refresh)
5. **Report back** with test results

## 💡 WHY THIS FIXES THE ISSUES

### Root Cause
Firebase uses `authDomain` to establish the authentication context. When the code used `*.firebaseapp.com` but your site ran on `aimagicbox.ai`, Firebase created separate authentication contexts, causing:
- Session cookies to be scoped to the wrong domain
- Auth tokens to be invalid for API requests
- User data to appear "lost" (actually just inaccessible)

### The Fix
By setting `authDomain` to match your production domain (`aimagicbox.ai`), Firebase now:
- Creates sessions scoped to the correct domain
- Generates valid auth tokens for API requests
- Maintains user authentication across refreshes
- Allows proper data retrieval and sharing

## ❓ NEED HELP?

If you encounter any issues during deployment:
1. Check the build logs in Replit Publishing tool
2. Check browser console (F12) for error messages
3. Verify Firebase Console settings
4. Test in multiple browsers/incognito mode

---

**Status**: Code is ready. Deployment configuration is documented. Ready for production republishing.
