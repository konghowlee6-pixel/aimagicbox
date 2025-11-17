# Production Deployment Instructions

## Overview
AI MagicBox can be deployed with the frontend and backend hosted separately. The frontend (aimagicbox.ai) can be hosted on any static hosting service, while the backend API remains on Replit or another Node.js host.

## Configuration Steps

### 1. Backend (Replit or your server)
The backend is already configured to accept requests from aimagicbox.ai:
- CORS allows `https://aimagicbox.ai` and `https://www.aimagicbox.ai`
- Session cookies are configured for cross-origin auth (`sameSite: "none"`, `secure: true`)
- Credentials are enabled for authenticated requests

**No backend changes needed** - the current configuration supports production deployment.

### 2. Frontend (aimagicbox.ai)
When building the frontend for production, you need to configure where the backend API is located:

#### Set Environment Variable
Create a `.env.production` file or set the environment variable in your hosting platform:

```bash
VITE_API_BASE_URL=https://your-backend-domain.repl.co
```

**Examples:**
- Replit: `VITE_API_BASE_URL=https://your-repl-name-username.repl.co`
- Custom domain: `VITE_API_BASE_URL=https://api.aimagicbox.ai`
- Development: Leave empty or omit (uses relative URLs)

#### Build the Frontend
```bash
npm run build
```

The built files will be in `dist/public/` directory. Upload these to your static hosting service (Vercel, Netlify, Cloudflare Pages, etc.).

### 3. Verify Deployment

1. **Check CORS:** Open browser console on aimagicbox.ai - you should see successful API calls, not CORS errors
2. **Test Login:** Try logging in with `testuser@magicbox.com` / `123456` 
3. **Check Cookies:** In browser DevTools → Application → Cookies, you should see session cookies from your backend domain

### Common Issues

#### 401 Unauthorized Errors
**Cause:** Frontend can't reach backend or session cookies aren't working  
**Fix:** 
1. Verify `VITE_API_BASE_URL` is set correctly
2. Check backend CORS configuration includes your frontend domain
3. Ensure backend is running and accessible

#### CORS Errors
**Cause:** Backend doesn't allow requests from frontend domain  
**Fix:** Add your frontend domain to `allowedOrigins` in `server/index.ts`:
```typescript
const allowedOrigins = [
  'https://aimagicbox.ai',
  'https://www.aimagicbox.ai',
  'https://your-custom-domain.com',  // Add your domain here
  ...
];
```

#### Session/Cookie Issues  
**Cause:** Cookies not being sent with cross-origin requests  
**Fix:** Ensure both:
- Backend has `credentials: true` in CORS config ✓ (already configured)
- Frontend uses `credentials: 'include'` in fetch calls ✓ (already configured)

## Architecture

```
┌─────────────────┐
│  aimagicbox.ai  │  ← Frontend (Static Files)
│   (Vercel)      │
└────────┬────────┘
         │
         │ HTTPS requests with cookies
         │ VITE_API_BASE_URL=https://backend.repl.co
         │
         ▼
┌─────────────────┐
│  Backend API    │  ← Express Server
│   (Replit)      │
└─────────────────┘
```

## Security Notes

- All requests use HTTPS in production
- Session cookies are `httpOnly`, `secure`, and `sameSite: "none"`
- CORS is restricted to whitelisted domains only
- Credentials are required for authentication

## Need Help?

If you encounter issues:
1. Check browser console for error messages
2. Verify environment variables are set correctly
3. Test the backend API directly (curl or Postman)
4. Ensure HTTPS is used for both frontend and backend
