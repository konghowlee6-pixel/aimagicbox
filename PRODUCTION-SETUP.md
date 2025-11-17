# Production Environment Setup for AI MagicBox

## Critical Issue: Firebase Authentication Domain Configuration

### Problem
The application was using an incorrect Firebase `authDomain` configuration that caused:
- Authentication failures on production domain (aimagicbox.ai)
- Session loss after refresh/logout
- "Fail to share image" errors
- Saved projects appearing to disappear

### Root Cause
The Firebase configuration was hardcoded to use `${VITE_FIREBASE_PROJECT_ID}.firebaseapp.com` instead of reading from the environment variable `VITE_FIREBASE_AUTH_DOMAIN`.

This caused authentication to work in test environments (*.replit.dev) but fail on the production domain (aimagicbox.ai).

### Fix Applied
Updated `client/src/lib/firebase.ts` to correctly use:
```javascript
authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
```

## Required Environment Variables for Production

### Firebase Authentication
```bash
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=aimagicbox.ai  # ⚠️ CRITICAL: Must match your production domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

### Database
```bash
DATABASE_URL=your_production_database_url
PGDATABASE=your_db_name
PGHOST=your_db_host
PGPASSWORD=your_db_password
PGPORT=5432
PGUSER=your_db_user
```

### AI Services
```bash
GEMINI_API_KEY=your_gemini_api_key
VITE_GEMINI_API_KEY=your_gemini_api_key  # For client-side usage
VERTEX_API_KEY=your_vertex_api_key
VERTEX_PROJECT_ID=your_vertex_project_id
```

### Payment Processing
```bash
STRIPE_SECRET_KEY=your_stripe_secret_key
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
```

### Security
```bash
SESSION_SECRET=your_random_session_secret
```

## Firebase Console Configuration

### 1. Add Authorized Domain
In Firebase Console:
1. Go to Authentication → Settings → Authorized domains
2. Add your production domain: `aimagicbox.ai`
3. Save changes

### 2. Configure OAuth Redirect URIs
If using OAuth providers (Google Sign-in):
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Find your OAuth 2.0 Client ID
3. Add authorized redirect URIs:
   - `https://aimagicbox.ai/__/auth/handler`
   - `https://aimagicbox.ai`
4. Save changes

## Deployment Steps

### Step 1: Set Environment Variables
Set all required environment variables in your production environment (Replit Secrets, Vercel Environment Variables, or your hosting platform).

**CRITICAL**: Ensure `VITE_FIREBASE_AUTH_DOMAIN` is set to `aimagicbox.ai` (NOT `*.firebaseapp.com`)

### Step 2: Deploy Application
```bash
# The application will automatically rebuild with the correct configuration
npm run build
npm run dev  # Or your production start command
```

### Step 3: Test Authentication Flow
1. Visit https://aimagicbox.ai
2. Click "Sign in with Google"
3. Complete authentication
4. Verify you remain logged in after:
   - Page refresh
   - Browser close/reopen
   - Navigate between pages

### Step 4: Test Data Persistence
1. Create a new project
2. Save images to the project
3. Refresh the page
4. Verify saved images remain visible
5. Logout and login again
6. Verify projects and images persist

### Step 5: Test Sharing
1. Go to "My Projects"
2. Click the globe icon on a saved project
3. Verify success message (not "fail to share")
4. Navigate to Community page
5. Verify the shared project appears

## Troubleshooting

### "Fail to share image"
- **Cause**: Invalid Firebase auth headers or missing `VITE_FIREBASE_AUTH_DOMAIN`
- **Fix**: Verify `VITE_FIREBASE_AUTH_DOMAIN=aimagicbox.ai` is set correctly

### Projects disappear after refresh
- **Cause**: Authentication session not persisting due to authDomain mismatch
- **Fix**: Ensure `VITE_FIREBASE_AUTH_DOMAIN` matches your production domain

### "Authentication failed" on login
- **Cause**: Domain not authorized in Firebase Console
- **Fix**: Add `aimagicbox.ai` to Firebase Console → Authentication → Authorized domains

### Session lost after logout/login
- **Cause**: authDomain mismatch causing different authentication contexts
- **Fix**: Verify environment variable is correctly set and rebuild application

## Verification Checklist

- [ ] `VITE_FIREBASE_AUTH_DOMAIN` environment variable set to `aimagicbox.ai`
- [ ] All Firebase environment variables configured
- [ ] Firebase Console has `aimagicbox.ai` as authorized domain
- [ ] OAuth redirect URIs configured in Google Cloud Console
- [ ] Application rebuilt after environment variable changes
- [ ] Authentication works and persists across refreshes
- [ ] Projects and saved images persist after logout/login
- [ ] Sharing to Community works without errors
- [ ] Database connection working in production

## Notes

- The fix has been applied to the codebase
- No code changes needed in production - only environment variable configuration
- The 500 error on save was a race condition that auto-retries successfully
- Data is NOT lost - it's a session/authentication issue causing inability to retrieve user data

## Support

If issues persist after following this guide:
1. Check browser console for detailed error messages
2. Verify all environment variables are set correctly
3. Clear browser cache and cookies
4. Test in incognito/private browsing mode
5. Check Firebase Console audit logs for authentication attempts
