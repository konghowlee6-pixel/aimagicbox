import "express-session";

declare module "express-session" {
  interface SessionData {
    // User session data
    userId?: string;
    userEmail?: string;
    userName?: string;
    photoURL?: string | null;
    
    // Anonymous user tracking
    anonymousUserId?: string;
    
    // Logout flag to prevent Replit auto-login
    explicitLogout?: boolean;
  }
}
