import { Request, Response, NextFunction } from "express";

/**
 * Test-only authentication middleware
 * 
 * SECURITY: This middleware should ONLY be enabled in test/development environments.
 * It bypasses Firebase authentication to allow automated testing.
 * 
 * Usage:
 * 1. Set ENABLE_TEST_AUTH=true in your test environment
 * 2. Set TEST_AUTH_SECRET to a secure random string
 * 3. Send X-Test-Auth-Secret header with requests to authenticate as test user
 */

// Test user credentials - used when test auth is enabled
export const TEST_USER = {
  id: "test-user-playwright-123",
  email: "test@playwright.local",
  displayName: "Playwright Test User",
  photoURL: "https://via.placeholder.com/150"
};

/**
 * Middleware that enables test authentication when configured
 * Sets x-user-* headers that getFirebaseUser() expects
 */
export function testAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only enable test auth if explicitly configured
  const isTestAuthEnabled = process.env.ENABLE_TEST_AUTH === 'true';
  const testAuthSecret = process.env.TEST_AUTH_SECRET;
  
  if (!isTestAuthEnabled || !testAuthSecret) {
    return next();
  }
  
  // Check if request has valid test auth secret
  const requestSecret = req.headers['x-test-auth-secret'] as string;
  
  if (requestSecret === testAuthSecret) {
    // Set Firebase user headers that getFirebaseUser() expects
    req.headers['x-user-id'] = TEST_USER.id;
    req.headers['x-user-email'] = TEST_USER.email;
    req.headers['x-user-name'] = TEST_USER.displayName;
    req.headers['x-user-photo'] = TEST_USER.photoURL;
  }
  
  next();
}

/**
 * Test auth login endpoint
 * Returns test user info for Playwright to verify authentication
 */
export function testAuthLoginHandler(req: Request, res: Response) {
  // Verify test auth is enabled
  const isTestAuthEnabled = process.env.ENABLE_TEST_AUTH === 'true';
  const testAuthSecret = process.env.TEST_AUTH_SECRET;
  
  if (!isTestAuthEnabled || !testAuthSecret) {
    return res.status(403).json({ 
      error: "Test authentication is not enabled. Set ENABLE_TEST_AUTH=true and TEST_AUTH_SECRET in environment." 
    });
  }
  
  // Verify secret
  const requestSecret = req.body.secret || req.headers['x-test-auth-secret'];
  
  if (requestSecret !== testAuthSecret) {
    return res.status(401).json({ error: "Invalid test authentication secret" });
  }
  
  // Return test user info (headers will be set by middleware on subsequent requests)
  res.json({
    success: true,
    user: TEST_USER,
    message: "Test authentication enabled. Include X-Test-Auth-Secret header in subsequent requests."
  });
}
