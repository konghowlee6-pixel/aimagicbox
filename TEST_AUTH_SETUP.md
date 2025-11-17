# Test Authentication Setup

This document explains how to enable test authentication for automated end-to-end testing with Playwright.

## Overview

The test authentication system bypasses Firebase Google OAuth to allow automated testing without manual user interaction. It's designed to be secure and only enabled in test/development environments.

## Configuration

### Environment Variables

Add these environment variables to enable test authentication:

```bash
# Enable test authentication (ONLY in test/development environments)
ENABLE_TEST_AUTH=true

# Test authentication secret (use a secure random string)
TEST_AUTH_SECRET=your-secure-random-secret-here
```

**SECURITY WARNING**: 
- NEVER enable test auth in production
- Keep TEST_AUTH_SECRET confidential and rotate it if exposed
- Ensure ENABLE_TEST_AUTH is false or unset in production builds

## Usage in Playwright Tests

### 1. Setup Test Authentication

In your Playwright test setup, make a POST request to the test auth endpoint:

```typescript
// At the start of your test
await page.request.post('http://localhost:5000/api/test-auth/login', {
  headers: {
    'X-Test-Auth-Secret': process.env.TEST_AUTH_SECRET!,
    'Content-Type': 'application/json'
  }
});
```

### 2. Include Auth Header in Subsequent Requests

For all subsequent API requests, include the test auth secret header:

```typescript
await page.setExtraHTTPHeaders({
  'X-Test-Auth-Secret': process.env.TEST_AUTH_SECRET!
});
```

### 3. Test User Credentials

The system uses a predefined test user:

```typescript
{
  id: "test-user-playwright-123",
  email: "test@playwright.local",
  displayName: "Playwright Test User",
  photoURL: "https://via.placeholder.com/150"
}
```

## How It Works

1. **Middleware**: The `testAuthMiddleware` checks for the `X-Test-Auth-Secret` header on every request
2. **Header Injection**: When valid, it sets the `x-user-*` headers that Firebase normally provides
3. **User Creation**: The test user is automatically created in the database on first use
4. **Transparent**: All existing routes work normally - they just see a pre-authenticated user

## Implementation Files

- `server/testAuth.ts` - Test auth middleware and login handler
- `server/routes.ts` - Integration of test auth into the application
- `TEST_AUTH_SETUP.md` - This documentation

## Example Playwright Test

```typescript
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Enable test authentication
  await page.request.post('http://localhost:5000/api/test-auth/login', {
    headers: {
      'X-Test-Auth-Secret': process.env.TEST_AUTH_SECRET!,
      'Content-Type': 'application/json'
    }
  });
  
  // Set header for all subsequent requests
  await page.setExtraHTTPHeaders({
    'X-Test-Auth-Secret': process.env.TEST_AUTH_SECRET!
  });
});

test('user can create a project', async ({ page }) => {
  await page.goto('http://localhost:5000/dashboard');
  
  // User is now authenticated as test user
  await expect(page.getByTestId('button-new-project')).toBeVisible();
  
  // ... rest of test
});
```

## Disabling Test Auth

To disable test authentication, simply:
1. Set `ENABLE_TEST_AUTH=false` or remove the variable
2. Remove or leave `TEST_AUTH_SECRET` unset

When disabled, the middleware passes through without modifying headers, and the login endpoint returns a 403 error.
