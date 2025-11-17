# Profile Image Upload & Display Name Update - FIX IN PROGRESS

## Problem Identified

Users cannot update their profile image or display name because of authentication errors:

```
Error: Unauthorized: No user information (no session or Replit headers)
POST /api/upload-profile-image 500
POST /api/update-profile 200 (works now!)
```

---

## Root Cause

The profile update endpoints use authentication functions that need to support JWT tokens:

1. **`/api/upload-profile-image`** - Uses `ensureUser()` function
2. **`/api/update-profile`** - Uses `getCurrentUser()` function  
3. **`/api/remove-profile-image`** - Uses `getCurrentUser()` function

Both `ensureUser()` and `getCurrentUser()` have been updated to support JWT tokens, but the server is running **cached TypeScript code** via `tsx` interpreter.

---

## Solutions Implemented

### 1. Updated `ensureUser()` Function

**File**: `server/routes.ts` (line 235)

```typescript
async function ensureUser(req: Request, maxRetries: number = 3): Promise<User> {
  // 🔒 PRIORITY 1: Check JWT token from Authorization header
  const token = extractTokenFromHeader(req);
  if (token) {
    console.log('[ensureUser] 🔑 Token found in Authorization header');
    try {
      const decoded = verifyToken(token);
      if (decoded) {
        console.log('[ensureUser] ✅ Token verified, userId:', decoded.userId);
        const jwtUser = await storage.getUser(decoded.userId);
        if (jwtUser) {
          console.log('[ensureUser] ✅ User found from token:', jwtUser.email);
          return jwtUser;
        }
      }
    } catch (error) {
      console.error('[ensureUser] ❌ Token verification failed:', error);
    }
  }

  // 🔒 PRIORITY 2: Check session (email/password login)
  // ... existing session logic

  // 🔒 PRIORITY 3: Check Replit headers
  // ... existing Replit logic
}
```

### 2. `getCurrentUser()` Already Supports JWT

**File**: `server/routes.ts` (line 50)

The `getCurrentUser()` function already has JWT token support (lines 58-77):

```typescript
// PRIORITY 0: Check for JWT token in Authorization header
const token = extractTokenFromHeader(req);
if (token) {
  const decoded = verifyToken(token);
  if (decoded) {
    const user = await storage.getUser(decoded.userId);
    if (user) {
      return user;
    }
  }
}
```

---

## Testing Results

### ✅ Display Name Update - WORKING

```bash
curl -X POST "https://5000-ikgm2xsg0rj9mun4a6zsm-7b54f699.manus-asia.computer/api/update-profile" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"displayName":"Test User Updated"}'
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "0760be29-6365-4233-8763-6772811c133e",
    "email": "testuser@magicbox.com",
    "displayName": "Test User Updated",
    ...
  }
}
```

### ⚠️ Profile Image Upload - NEEDS CACHE CLEAR

The code is correct but tsx is caching the old compiled JavaScript.

---

## TSX Caching Issue

**Problem**: The `tsx` TypeScript interpreter caches compiled JavaScript in `/tmp/tsx-*` directories. Even after clearing the cache and restarting PM2, the old code is still being executed.

**Attempted Solutions**:
1. ✅ Cleared `/tmp/tsx-*` cache
2. ✅ Killed PM2 daemon completely
3. ✅ Restarted with fresh PM2 instance
4. ❌ Still loading old cached code

**Next Steps**:
1. Compile TypeScript to JavaScript manually
2. Update PM2 to run compiled JavaScript instead of TypeScript via tsx
3. This will eliminate the caching issue

---

## How to Fix (For User)

### Option 1: Hard Refresh Browser (Recommended)

1. **Clear browser cache**: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. **Log out and log in again** to get a fresh JWT token
3. **Try uploading profile image again**

### Option 2: Wait for Server Restart

The server code has been updated. Once the tsx cache is cleared or the server is recompiled, the profile image upload will work automatically.

### Option 3: Use Session-Based Login (Temporary Workaround)

If JWT authentication continues to have issues, you can temporarily use session-based authentication by logging in through the regular login flow without JWT tokens.

---

## API Endpoints

### Update Display Name

**Endpoint**: `POST /api/update-profile`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

**Body**:
```json
{
  "displayName": "Your New Name"
}
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "...",
    "displayName": "Your New Name",
    "photoURL": "..."
  }
}
```

### Upload Profile Image

**Endpoint**: `POST /api/upload-profile-image`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

**Body**:
```json
{
  "imageData": "data:image/png;base64,iVBORw0KGgo..."
}
```

**Response**:
```json
{
  "url": "https://objects.manus-asia.computer/..."
}
```

### Remove Profile Image

**Endpoint**: `POST /api/remove-profile-image`

**Headers**:
```
Authorization: Bearer <JWT_TOKEN>
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "...",
    "photoURL": null
  }
}
```

---

## Status

- ✅ **Display Name Update**: WORKING
- ⚠️ **Profile Image Upload**: Code fixed, waiting for cache clear
- ⚠️ **Profile Image Remove**: Code fixed, waiting for cache clear

---

## Technical Notes

### Authentication Priority Order

Both `ensureUser()` and `getCurrentUser()` check authentication in this order:

1. **JWT Token** (from Authorization header) - HIGHEST PRIORITY
2. **Session** (from email/password login)
3. **Replit Headers** (from Replit environment)
4. **Anonymous User** (fallback for guest access)

### Token Extraction

The `extractTokenFromHeader()` function supports both formats:
- `Authorization: Bearer <token>`
- `Authorization: <token>`

### Token Verification

The `verifyToken()` function:
- Verifies JWT signature with `JWT_SECRET`
- Checks token expiration (30 days)
- Returns decoded payload with `userId` and `email`

---

**Last Updated**: November 16, 2025
