import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import multer from "multer";
import path from "path";
import { DatabaseStorage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { LocalFileStorageService } from "./localFileStorage";
import {
  insertProjectSchema,
  insertCampaignSchema,
  insertCampaignImageSchema,
  insertVisualSchema,
  insertTextContentSchema,
  type GenerateAdCopyRequest,
  type GenerateBrandKitRequest,
  type GenerateVisualRequest,
  type FusionVisualRequest,
  type User,
} from "@shared/schema";
import { QUICKCLIP_RESOLUTIONS, type ResolutionKey } from "@shared/quickclip-utils";
import {
  generateAdCopy,
  generateBrandKit,
  enhancePrompt,
  rewriteText,
  generateText,
  optimizePrompt,
} from "./deepseek";
import { analyzeVisualForTextPlacement, generateCaptionScriptFromImage, generatePromoSceneDescription, generatePromoRecommendations, generateSceneTextOverlays } from "./ai-visual-analyzer";
import pLimit from "p-limit";
import {
  rewriteTextWithVertex,
  generateFusionBackgroundWithVertex,
  generateContextualCopyWithVertex,
} from "./services/vertexService";
import Stripe from "stripe";
import { testAuthMiddleware, testAuthLoginHandler } from "./testAuth";
import { generateToken, verifyToken, extractTokenFromHeader } from "./tokenAuth";
import { ttsService } from "./services/ttsService";
import { videoService, type VideoScene } from "./services/videoService";
import {
  insertPromoVideoSchema,
  insertPromoVideoSceneSchema,
  insertPromoVideoAssetSchema,
  type PromoVideo,
  type PromoVideoScene,
} from "@shared/schema";

const storage = new DatabaseStorage();

// Helper function to get user from session or Replit headers
async function getCurrentUser(req: Request) {
  try {
    // Check if user explicitly logged out - prevent Replit auto-login
    if (req.session.explicitLogout) {
      console.log('[getCurrentUser] User explicitly logged out - blocking authentication');
      return null;
    }

    // PRIORITY 0: Check for JWT token in Authorization header
    const token = extractTokenFromHeader(req);
    if (token) {
      console.log('[getCurrentUser] 🔑 Token found in Authorization header');
      try {
        const decoded = verifyToken(token);
        console.log('[getCurrentUser] ✅ Token verified, userId:', decoded.userId);
        const user = await storage.getUser(decoded.userId);
        if (user) {
          console.log('[getCurrentUser] ✅ User found from token:', user.email);
          return user;
        } else {
          console.log('[getCurrentUser] ⚠️ Token valid but user not found in DB');
        }
      } catch (err) {
        console.error('[getCurrentUser] ❌ Token verification failed:', err);
      }
    } else {
      console.log('[getCurrentUser] No token in Authorization header');
    }

    // PRIORITY 1: Check session first (email/password login)
    if (req.session.userId) {
      try {
        // First try to get by ID
        let user = await storage.getUser(req.session.userId);
        if (user) {
          console.log('[getCurrentUser] Using session user:', user.email);
          return user;
        }

        // If not found by ID, try by email (in case user was created differently)
        if (req.session.userEmail) {
          user = await storage.getUserByEmail(req.session.userEmail);
          if (user) {
            console.log('[getCurrentUser] Found session user by email:', user.email);
            return user;
          }
        }

        // Session user not in DB, create them (only if truly doesn't exist)
        try {
          const newUser = await storage.createUser({
            id: req.session.userId,
            email: req.session.userEmail || "",
            displayName: req.session.userName || "User",
            photoURL: null,
          });
          console.log('[getCurrentUser] Created session user:', newUser.email);
          return newUser;
        } catch (createErr: any) {
          // If creation failed due to duplicate, fetch the existing user
          if (createErr.code === '23505' && req.session.userEmail) {
            user = await storage.getUserByEmail(req.session.userEmail);
            if (user) {
              console.log('[getCurrentUser] Found existing user after create collision:', user.email);
              return user;
            }
          }
          throw createErr;
        }
      } catch (err) {
        console.error('getCurrentUser: Session user lookup/create failed:', err);
        // Fall through to next method
      }
    }

    // PRIORITY 2: Only use Replit headers if no session exists
    // This prevents Replit from overriding email/password login
    const replitUser = getReplitUser(req);
    if (replitUser) {
      console.log('[getCurrentUser] No session found, using Replit user:', replitUser.email);
      const user = await ensureUser(req);
      if (user) return user;
    }

    // PRIORITY 3: Anonymous user as last resort
    const anonUser = await getAnonymousUser(req);
    if (!anonUser) {
      throw new Error('Failed to get or create anonymous user');
    }
    console.log('[getCurrentUser] Using anonymous user:', anonUser.id);
    return anonUser;
  } catch (error) {
    console.error('getCurrentUser: Critical error getting user:', error);
    throw error;
  }
}

// Initialize Stripe (optional - gracefully handle if not configured)
let stripe: Stripe | null = null;
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-09-30.clover",
    });
  }
} catch (error) {
  console.warn("Stripe not initialized:", error);
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: "./uploads",
    filename: (req: any, file: any, cb: any) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Helper to get Replit user from request headers
function getReplitUser(req: Request): { id: string; email: string; displayName: string; photoURL: string | null } | null {
  const userId = req.headers['x-replit-user-id'] as string;
  const userName = req.headers['x-replit-user-name'] as string;
  const userEmail = req.headers['x-replit-user-email'] as string;

  if (!userId || !userName) {
    return null;
  }

  return {
    id: userId,
    email: userEmail || `${userName}@replit.user`,
    displayName: userName,
    photoURL: null
  };
}

// Get or create anonymous/guest user for non-authenticated requests
// Each session gets a unique anonymous user ID for data isolation
async function getAnonymousUser(req: Request): Promise<User> {
  // Get or create unique anonymous user ID for this session
  if (!req.session.anonymousUserId) {
    req.session.anonymousUserId = `guest-${randomUUID()}`;
    console.log('[getAnonymousUser] Created new session-based anonymous user ID:', req.session.anonymousUserId);
  }

  const anonymousUserId = req.session.anonymousUserId;
  const anonymousEmail = `${anonymousUserId}@guest.aimagicbox.local`;

  try {
    // Try to get existing anonymous user
    let user = await storage.getUser(anonymousUserId);
    if (user) {
      return user;
    }

    // Check by email as fallback
    user = await storage.getUserByEmail(anonymousEmail);
    if (user) {
      return user;
    }

    // Create anonymous user if doesn't exist
    console.log('[getAnonymousUser] Creating new guest user:', anonymousUserId);
    user = await storage.createUser({
      id: anonymousUserId,
      email: anonymousEmail,
      displayName: 'Guest User',
      photoURL: null,
    });
    return user;
  } catch (error: any) {
    console.error('[getAnonymousUser] Error:', error);
    // If user already exists (race condition), try fetching again
    const user = await storage.getUser(anonymousUserId);
    if (user) {
      return user;
    }
    throw new Error('Failed to get or create anonymous user');
  }
}

// Ensure user exists in database (create if needed)
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
        console.warn('[ensureUser] ⚠️ Token valid but user not found in DB:', decoded.userId);
      }
    } catch (error) {
      console.error('[ensureUser] ❌ Token verification failed:', error);
    }
  } else {
    console.log('[ensureUser] No token in Authorization header');
  }

  // 🔒 PRIORITY 2: Check session (email/password login)
  if (req.session?.userId) {
    console.log('[ensureUser] Using session user:', req.session.userId);
    const sessionUser = await storage.getUser(req.session.userId);
    if (sessionUser) {
      return sessionUser;
    }
    console.warn('[ensureUser] Session user not found in DB:', req.session.userId);
  }

  // 🔒 PRIORITY 3: Check Replit headers (only if no session)
  const replitUser = getReplitUser(req);

  if (!replitUser) {
    throw new Error("Unauthorized: No user information (no JWT token, session, or Replit headers)");
  }

  console.log('[ensureUser] Using Replit user:', replitUser.email);

  // Try to get or create user with retry logic for race conditions
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check if user exists by ID first
      let dbUser = await storage.getUser(replitUser.id);

      if (dbUser) {
        // User exists - return without syncing to preserve manual profile updates
        return dbUser;
      }

      // Check if user exists by email (in case they were created with a different ID)
      dbUser = await storage.getUserByEmail(replitUser.email);

      if (dbUser) {
        // User exists - return without syncing to preserve manual profile updates
        return dbUser;
      }

      // User doesn't exist - try to create
      try {
        dbUser = await storage.createUser({
          id: replitUser.id,
          email: replitUser.email,
          displayName: replitUser.displayName || null,
          photoURL: replitUser.photoURL || null,
        });
        return dbUser;
      } catch (createError: any) {
        // Check if this is a uniqueness constraint violation (race condition)
        const isConstraintViolation = 
          createError.code === '23505' || // PostgreSQL unique violation code
          createError.message?.toLowerCase().includes('duplicate') ||
          createError.message?.toLowerCase().includes('unique constraint') ||
          createError.message?.toLowerCase().includes('already exists');

        if (isConstraintViolation) {
          // Another request created the user - retry to fetch it
          if (attempt < maxRetries) {
            console.log(`[ensureUser] Race condition detected, retrying (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
            continue;
          } else {
            // Final attempt - try one more fetch
            dbUser = await storage.getUserByEmail(replitUser.email);
            if (dbUser) {
              return dbUser;
            }
            throw new Error("User creation failed due to race condition");
          }
        }

        throw createError;
      }
    } catch (error: any) {
      if (attempt === maxRetries) {
        console.error("[ensureUser] Failed after all retries:", error);
        throw error;
      }

      if (!error.message?.includes('race condition')) {
        throw error;
      }
    }
  }

  throw new Error("ensureUser failed after all retry attempts");
}

export function registerRoutes(app: Express): Server {
  // Test auth middleware (only enabled when ENABLE_TEST_AUTH=true)
  // This MUST be applied before any routes that need authentication
  app.use(testAuthMiddleware);

  // Test auth login endpoint
  app.post("/api/test-auth/login", testAuthLoginHandler);

  // Simple auth endpoints for email/password login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Simple test credential check (for testing only)
      if (email === "testuser@magicbox.com" && password === "123456") {
        // Clear the explicitLogout flag when user logs in
        delete req.session.explicitLogout;

        // Set session
        req.session.userId = "testuser-magicbox-123";
        req.session.userEmail = email;
        req.session.userName = "Test User";
        req.session.photoURL = null;

        // Generate JWT token
        const token = generateToken({ userId: "testuser-magicbox-123", email });
        console.log('✅ Generated token for user:', email);

        // Save session before responding to ensure explicitLogout is cleared
        return req.session.save((err) => {
          if (err) {
            console.error('[AUTH] Session save error:', err);
            return res.status(500).json({ error: "Login failed" });
          }
          return res.json({ 
            success: true,
            token: token,
            user: { 
              id: "testuser-magicbox-123", 
              email, 
              displayName: "Test User",
              photoURL: null 
            } 
          });
        });
      }

      // Support testuser@aimagicbox.com account
      if (email === "testuser@aimagicbox.com" && password === "123456") {
        // Clear the explicitLogout flag when user logs in
        delete req.session.explicitLogout;

        // Set session
        req.session.userId = "testuser-aimagicbox-123";
        req.session.userEmail = email;
        req.session.userName = "AI MagicBox Test User";
        req.session.photoURL = null;

        // Save session before responding to ensure explicitLogout is cleared
        return req.session.save((err) => {
          if (err) {
            console.error('[AUTH] Session save error:', err);
            return res.status(500).json({ error: "Login failed" });
          }
          return res.json({ 
            success: true, 
            user: { 
              id: "testuser-aimagicbox-123", 
              email, 
              displayName: "AI MagicBox Test User",
              photoURL: null 
            } 
          });
        });
      }

      // Support test@aimagicbox.com account
      if (email === "test@aimagicbox.com" && password === "password123") {
        // Clear the explicitLogout flag when user logs in
        delete req.session.explicitLogout;

        // Set session
        req.session.userId = "d425c85b-3395-47c7-8d73-05f1570acc63";
        req.session.userEmail = email;
        req.session.userName = "Test User";
        req.session.photoURL = null;

        // Save session before responding to ensure explicitLogout is cleared
        return req.session.save((err) => {
          if (err) {
            console.error('[AUTH] Session save error:', err);
            return res.status(500).json({ error: "Login failed" });
          }
          return res.json({ 
            success: true, 
            user: { 
              id: "d425c85b-3395-47c7-8d73-05f1570acc63", 
              email, 
              displayName: "Test User",
              photoURL: null 
            } 
          });
        });
      }

      // Support testuser@magicbox.com account
      if (email === "testuser@magicbox.com" && password === "123456") {
        // Clear the explicitLogout flag when user logs in
        delete req.session.explicitLogout;

        // Set session
        req.session.userId = "testuser-magicbox-123";
        req.session.userEmail = email;
        req.session.userName = "Test User";
        req.session.photoURL = null;

        // Generate JWT token
        const token = generateToken({
          userId: "testuser-magicbox-123",
          email: email
        });

        // Save session before responding to ensure explicitLogout is cleared
        return req.session.save((err) => {
          if (err) {
            console.error('[AUTH] Session save error:', err);
            return res.status(500).json({ error: "Login failed" });
          }
          return res.json({ 
            success: true,
            token: token, // Include token in response
            user: { 
              id: "testuser-magicbox-123", 
              email, 
              displayName: "Test User",
              photoURL: null 
            } 
          });
        });
      }

      // Support testuser@gmail.com account
      if (email === "testuser@gmail.com" && password === "123456") {
        // Clear the explicitLogout flag when user logs in
        delete req.session.explicitLogout;

        // Set session
        req.session.userId = "testuser-gmail-123";
        req.session.userEmail = email;
        req.session.userName = "Gmail Test User";
        req.session.photoURL = null;

        // Save session before responding to ensure explicitLogout is cleared
        return req.session.save((err) => {
          if (err) {
            console.error('[AUTH] Session save error:', err);
            return res.status(500).json({ error: "Login failed" });
          }
          return res.json({ 
            success: true, 
            user: { 
              id: "testuser-gmail-123", 
              email, 
              displayName: "Gmail Test User",
              photoURL: null 
            } 
          });
        });
      }

      return res.status(401).json({ error: "Invalid credentials" });
    } catch (error: any) {
      console.error("Login error:", error);
      return res.status(500).json({ error: "Login failed" });
    }
  });

  // Get current user endpoint - returns fresh database data
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      console.log('[AUTH] /api/auth/me called');
      console.log('[AUTH] Session ID:', req.sessionID);
      console.log('[AUTH] Session userId:', req.session.userId);

      // Check if user explicitly logged out (prevent Replit auto-login)
      if (req.session.explicitLogout) {
        console.log('[AUTH] User explicitly logged out - blocking authentication');
        return res.status(401).json({ error: "Not authenticated" });
      }

      // PRIORITY 0: Check JWT token first (most reliable through proxy)
      const authHeader = req.headers.authorization as string | undefined;
      if (authHeader) {
        const token = extractTokenFromHeader(authHeader);
        if (token) {
          const payload = verifyToken(token);
          if (payload) {
            console.log('[AUTH] ✅ Token authenticated:', payload.email);
            return res.json({
              id: payload.userId,
              email: payload.email,
              displayName: "Test User",
              photoURL: null,
              uid: payload.userId
            });
          } else {
            console.log('[AUTH] ❌ Invalid token');
          }
        }
      }

      // PRIORITY 1: Check session (email/password login with cookies)
      if (req.session.userId) {
        try {
          let user = await storage.getUser(req.session.userId);
          if (!user && req.session.userEmail) {
            user = await storage.getUserByEmail(req.session.userEmail);
          }
          if (user) {
            console.log('[AUTH] ✅ Session user authenticated:', user.email);
            return res.json({
              id: user.id,
              email: user.email,
              displayName: user.displayName || "User",
              photoURL: user.photoURL || null,
              uid: user.id
            });
          }
        } catch (err) {
          console.error('[AUTH] Session user lookup failed:', err);
        }
      }

      // PRIORITY 2: Check Replit headers (only if no session)
      const replitUser = getReplitUser(req);
      if (replitUser) {
        try {
          let dbUser = await storage.getUser(replitUser.id);
          if (!dbUser) {
            dbUser = await storage.getUserByEmail(replitUser.email);
          }
          if (dbUser) {
            console.log('[AUTH] ✅ Replit user authenticated:', dbUser.email);
            return res.json({
              id: dbUser.id,
              email: dbUser.email,
              displayName: dbUser.displayName || "User",
              photoURL: dbUser.photoURL || null,
              uid: dbUser.id
            });
          }
        } catch (err) {
          console.error('[AUTH] Replit user lookup failed:', err);
        }
      }

      // Do NOT fall back to anonymous user - return 401 instead
      console.log('[AUTH] ❌ No authenticated user found - returning 401');
      return res.status(401).json({ error: "Not authenticated" });
    } catch (error: any) {
      console.error("[AUTH] Error:", error);
      return res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    // Set a flag before destroying to prevent Replit auto-login
    req.session.explicitLogout = true;

    // Save the session with the flag, then respond
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('[AUTH] Error saving logout flag:', saveErr);
      }

      // Don't destroy session completely - keep the logout flag
      // Just clear user data
      delete req.session.userId;
      delete req.session.userEmail;
      delete req.session.userName;

      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ error: "Logout failed" });
        }
        console.log('[AUTH] User logged out successfully, explicitLogout flag set');
        res.json({ success: true });
      });
    });
  });

  // Health check
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({ status: "ok" });
  });

  // Diagnostic endpoint for troubleshooting
  app.get("/api/diagnostics", async (req: Request, res: Response) => {
    try {
      const diagnostics = {
        status: "operational",
        timestamp: new Date().toISOString(),
        server: {
          status: "running",
          port: 5000,
          environment: process.env.NODE_ENV || "development",
        },
        database: {
          status: "unknown",
          connected: false,
        },
        services: {
          stripe: stripe ? "configured" : "not configured",
          deepseek: process.env.DEEPSEEK_API_KEY ? "configured" : "missing",
          runware: process.env.RUNWARE_API_KEY ? "configured" : "missing",
          vertex: process.env.VERTEX_API_KEY ? "configured" : "missing",
          firebase: {
            projectId: process.env.VITE_FIREBASE_PROJECT_ID ? "configured" : "missing",
            authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN ? "configured" : "missing",
          },
        },
      };

      // Test database connection
      try {
        await storage.getUser("test-user-check-connection");
        diagnostics.database.status = "connected";
        diagnostics.database.connected = true;
      } catch (error: any) {
        // Connection works if we get a "not found" error vs. connection error
        if (error.message?.includes("not found") || error.message?.includes("User not found")) {
          diagnostics.database.status = "connected";
          diagnostics.database.connected = true;
        } else {
          diagnostics.database.status = `error: ${error.message}`;
          diagnostics.database.connected = false;
        }
      }

      res.json(diagnostics);
    } catch (error: any) {
      res.status(500).json({
        status: "error",
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  });

  // Projects
  app.post("/api/projects", async (req: Request, res: Response) => {
    try {
      const user = await getCurrentUser(req);

      const data = insertProjectSchema.parse({
        ...req.body,
        userId: user.id,
      });

      const project = await storage.createProject(data);
      res.status(201).json(project);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects", async (req: Request, res: Response) => {
    try {
      const user = await getCurrentUser(req);
      const projects = await storage.getProjectsWithCampaigns(user.id);
      res.json(projects);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const user = await getCurrentUser(req);
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (project.userId !== user.id) {
        return res.status(403).json({ error: "Forbidden: Access denied" });
      }
      res.json(project);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const user = await getCurrentUser(req);
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (project.userId !== user.id) {
        return res.status(403).json({ error: "Forbidden: Access denied" });
      }
      const updatedProject = await storage.updateProject(req.params.id, req.body);
      res.json(updatedProject);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/projects/:id", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (project.userId !== user.id) {
        return res.status(403).json({ error: "Forbidden: Access denied" });
      }
      const success = await storage.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get project with all campaigns and images
  app.get("/api/projects/:id/full", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (project.userId !== user.id) {
        return res.status(403).json({ error: "Forbidden: Access denied" });
      }

      // Get all campaigns for this project
      const campaigns = await storage.getProjectCampaigns(req.params.id);
      console.log(`[GET PROJECT] Found ${campaigns.length} campaigns for project ${req.params.id}`);
      if (campaigns.length > 0) {
        console.log(`[GET PROJECT] First campaign:`, {
          id: campaigns[0].id,
          headline: campaigns[0].headline?.substring(0, 50) || '(empty)',
          subheadline: campaigns[0].subheadline?.substring(0, 50) || '(empty)'
        });
      }

      // Get all images for each campaign
      const campaignsWithImages = await Promise.all(
        campaigns.map(async (campaign) => {
          const images = await storage.getCampaignImages(campaign.id);
          return {
            ...campaign,
            images: images.map((img) => {
              // Calculate expiration metadata
              const createdAt = new Date(img.createdAt);
              const expiresAt = new Date(createdAt);
              expiresAt.setDate(expiresAt.getDate() + 60); // 60 days from creation
              
              const now = new Date();
              const daysUntilExpiration = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              
              return {
                id: img.id,
                src: img.imageUrl,
                design: img.designOverride,
                isSaved: img.isSaved === 1, // Include saved status
                // Expiration metadata
                expiresAt: expiresAt.toISOString(),
                daysUntilExpiration,
                isExpiringSoon: daysUntilExpiration <= 10 && daysUntilExpiration > 0,
              };
            }),
          };
        })
      );

      console.log(`[GET PROJECT] Returning campaigns with images:`, {
        count: campaignsWithImages.length,
        firstCampaignHeadline: campaignsWithImages[0]?.headline?.substring(0, 50) || '(empty)'
      });

      res.json({
        ...project,
        campaigns: campaignsWithImages,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Save project with campaigns and images
  app.post("/api/projects/:id/save", async (req: Request, res: Response) => {
    let user;
    try {
      // Try to get authenticated user, fallback to anonymous user
      user = await getCurrentUser(req);
    } catch (error: any) {
      console.error("[SAVE] Failed to get user:", error);
      return res.status(401).json({ error: "Authentication failed" });
    }

    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (project.userId !== user.id) {
        return res.status(403).json({ error: "Forbidden: Access denied" });
      }

      const { campaigns: campaignData, thumbnailUrl, name } = req.body;

      console.log(`[SAVE] Starting save for project ${req.params.id}, user ${user.id}`);

      // Update project name and/or thumbnail
      const updates: Partial<{ name: string; thumbnailUrl: string }> = {};
      if (name !== undefined) {
        updates.name = name;
      }
      if (thumbnailUrl) {
        updates.thumbnailUrl = thumbnailUrl;
      }
      if (Object.keys(updates).length > 0) {
        try {
          await storage.updateProject(req.params.id, updates);
          console.log(`[SAVE] Updated project metadata successfully`);
        } catch (error: any) {
          console.error("[SAVE] Failed to update project metadata:", error);
          return res.status(500).json({ error: "Failed to update project metadata" });
        }
      }

      // Save all campaigns with error handling
      const savedCampaigns = [];
      for (const campaign of campaignData || []) {
        try {
          let campaignId = campaign.id;

          // Check if campaign exists
          const existingCampaign = await storage.getCampaign(campaign.id);

          if (existingCampaign) {
            // Verify the campaign belongs to this project
            if (existingCampaign.projectId !== req.params.id) {
              console.error(`[SAVE] Campaign ${campaign.id} does not belong to project ${req.params.id}`);
              return res.status(403).json({ error: `Campaign ${campaign.id} does not belong to project ${req.params.id}` });
            }
            // Update existing campaign
            const campaignUpdates = {
              headline: campaign.headline,
              subheadline: campaign.subheadline,
              description: campaign.description,
              hashtags: campaign.hashtags,
            };
            console.log(`[SAVE] Updating campaign ${campaign.id} with:`, {
              headline: campaignUpdates.headline,
              subheadline: campaignUpdates.subheadline?.substring(0, 50)
            });
            await storage.updateCampaign(campaign.id, campaignUpdates);

            // Verify the update persisted
            const verifyUpdated = await storage.getCampaign(campaign.id);
            console.log(`[SAVE] Verified campaign ${campaign.id} in DB:`, {
              headline: verifyUpdated?.headline,
              subheadline: verifyUpdated?.subheadline?.substring(0, 50)
            });
            console.log(`[SAVE] Updated campaign ${campaign.id}`);
          } else {
            // Create new campaign
            const newCampaign = await storage.createCampaign({
              id: campaign.id,
              projectId: req.params.id,
              headline: campaign.headline,
              subheadline: campaign.subheadline,
              description: campaign.description,
              hashtags: campaign.hashtags,
            });
            campaignId = newCampaign.id;
            console.log(`[SAVE] Created new campaign ${campaignId}`);
          }

          // Save all images for this campaign
          const savedImages = [];
          for (const image of campaign.images || []) {
            try {
              console.log(`[SAVE] Processing image ${image.id}:`, {
                hasRenderedUrl: !!image.renderedImageUrl,
                renderedUrlPreview: image.renderedImageUrl?.substring(0, 50),
                imageUrl: image.src?.substring(0, 50)
              });

              const existingImage = await storage.getCampaignImage(image.id);

              if (existingImage) {
                // Verify the image belongs to this campaign
                if (existingImage.campaignId !== campaignId) {
                  console.error(`[SAVE] Image ${image.id} does not belong to campaign ${campaignId}`);
                  return res.status(403).json({ error: `Image ${image.id} does not belong to campaign ${campaignId}` });
                }
                // Update existing image and mark as saved
                const updateData = {
                  imageUrl: image.src,
                  designOverride: image.design,
                  renderedImageUrl: image.renderedImageUrl || existingImage.renderedImageUrl,
                  isSaved: 1,
                };
                console.log(`[SAVE] Updating existing image ${image.id} with renderedImageUrl:`, updateData.renderedImageUrl?.substring(0, 50));
                await storage.updateCampaignImage(image.id, updateData);
                savedImages.push(image.id);
              } else {
                // Create new image and mark as saved
                // Initialize editMetadata based on the visual type (fusion/canvas/template)
                let editMetadata: { origin: 'fusion' | 'canvas' | 'template'; modalEdits: number } = {
                  origin: 'template',
                  modalEdits: 0,
                };

                try {
                  const visual = await storage.getVisual(image.id);
                  if (visual) {
                    if (visual.type === 'fusion') {
                      editMetadata = { origin: 'fusion', modalEdits: 0 };
                      console.log(`[SAVE] Initializing editMetadata for fusion image ${image.id}`);
                    } else if (visual.type === 'inpaint') {
                      editMetadata = { origin: 'canvas', modalEdits: 0 };
                      console.log(`[SAVE] Initializing editMetadata for canvas image ${image.id}`);
                    } else {
                      console.log(`[SAVE] Visual ${image.id} is type '${visual.type}', using template default`);
                    }
                  } else {
                    console.log(`[SAVE] Visual ${image.id} not found, using template default for editMetadata`);
                  }
                } catch (visualLookupError) {
                  console.log(`[SAVE] Error looking up visual ${image.id}, using template default:`, visualLookupError);
                }

                const createData = {
                  id: image.id,
                  campaignId,
                  imageUrl: image.src,
                  designOverride: image.design,
                  renderedImageUrl: image.renderedImageUrl,
                  editMetadata,
                  isSaved: 1,
                };
                console.log(`[SAVE] Creating new image ${image.id} with renderedImageUrl:`, createData.renderedImageUrl?.substring(0, 50));
                await storage.createCampaignImage(createData);
                savedImages.push(image.id);
              }
            } catch (imageError: any) {
              console.error(`[SAVE] Failed to save image ${image.id}:`, imageError);
              // Continue with other images instead of failing entire save
            }
          }
          console.log(`[SAVE] Saved ${savedImages.length} images for campaign ${campaignId}`);
          savedCampaigns.push(campaignId);
        } catch (campaignError: any) {
          console.error(`[SAVE] Failed to save campaign ${campaign.id}:`, campaignError);
          // Continue with other campaigns instead of failing entire save
        }
      }

      console.log(`[SAVE] Successfully saved project ${req.params.id} with ${savedCampaigns.length} campaigns`);
      res.json({ 
        success: true, 
        message: "Project saved successfully",
        savedCampaigns: savedCampaigns.length,
      });
    } catch (error: any) {
      console.error("[SAVE] Critical error saving project:", error);
      res.status(500).json({ 
        error: error.message || "Failed to save project",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Visuals
  app.get("/api/projects/:id/visuals", async (req: Request, res: Response) => {
    try {
      // Use getCurrentUser which supports both authenticated and guest users
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (project.userId !== user.id) {
        return res.status(403).json({ error: "Forbidden: Access denied" });
      }
      const visuals = await storage.getProjectVisuals(req.params.id);
      
      // Add expiration metadata to each visual
      const visualsWithExpiration = visuals.map(visual => {
        const createdAt = new Date(visual.createdAt);
        const expiresAt = new Date(createdAt);
        expiresAt.setDate(expiresAt.getDate() + 60); // 60 days from creation
        
        const now = new Date();
        const daysUntilExpiration = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          ...visual,
          expiresAt: expiresAt.toISOString(),
          daysUntilExpiration,
          isExpiringSoon: daysUntilExpiration <= 10 && daysUntilExpiration > 0,
        };
      });
      
      res.json(visualsWithExpiration);
    } catch (error: any) {
      console.error('[GET Visuals] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Text Content
  app.get("/api/projects/:id/content", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (project.userId !== user.id) {
        return res.status(403).json({ error: "Forbidden: Access denied" });
      }
      const content = await storage.getProjectTextContent(req.params.id);
      res.json(content);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Generate Ad Copy
  app.post("/api/generate/ad-copy", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);

      const {projectId, platform, productName, productDescription, targetAudience, tone } = req.body as GenerateAdCopyRequest;

      if (!projectId || !platform || !productName || !productDescription) {
        return res.status(400).json({ error: "Missing required fields: projectId, platform, productName, productDescription" });
      }

      // Verify project ownership
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (project.userId !== user.id) {
        return res.status(403).json({ error: "Forbidden: Access denied" });
      }

      // Generate ad copy using Gemini
      const content = await generateAdCopy({
        platform,
        productName,
        productDescription,
        targetAudience,
        tone,
      });

      // Save to storage
      const textContent = await storage.createTextContent({
        projectId,
        type: "ad_copy",
        content,
        metadata: {
          platform,
          tone: tone || "professional",
        },
      });

      // Track API usage
      await storage.createApiUsage({
        userId: user.id,
        endpoint: "deepseek_text",
        tokensUsed: Math.ceil(content.length / 4), // Rough estimate
        cost: 5, // 5 cents per generation
      });

      res.status(201).json(textContent);
    } catch (error: any) {
      console.error("Error in /api/generate/ad-copy:", error);
      res.status(500).json({ error: error.message || "Failed to generate ad copy" });
    }
  });

  // Generate BrandKit
  app.post("/api/generate/brandkit", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);

      const { projectId, brandName, industry, description } = req.body as GenerateBrandKitRequest;

      if (!projectId || !brandName || !industry || !description) {
        return res.status(400).json({ error: "Missing required fields: projectId, brandName, industry, description" });
      }

      // Verify project ownership
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

  // Generate Caption from uploaded image using Runware Caption API
  app.post("/api/generate/caption", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const { imageURL } = req.body;

      if (!imageURL) {
        return res.status(400).json({ error: "Missing required field: imageURL" });
      }

      const { generateRunwareCaption } = await import('./services/runwareService');

      try {
        const caption = await generateRunwareCaption(imageURL);

        // Track API usage
        await storage.createApiUsage({
          userId: user.id,
          endpoint: "runware_caption",
          cost: 3, // 3 cents for caption generation
        });

        res.json({ caption });
      } catch (error: any) {
        console.error("Caption generation error:", error);
        res.status(500).json({ 
          error: error.message || "Failed to generate caption",
          fallback: "Unable to generate image description. Please try again or enter your own prompt."
        });
      }
    } catch (error: any) {
      console.error("Error in /api/generate/caption:", error);
      res.status(500).json({ error: error.message || "Failed to generate caption" });
    }
  });


      if (project.userId !== user.id) {
        return res.status(403).json({ error: "Forbidden: Access denied" });
      }

      // Generate BrandKit using Gemini
      const brandKit = await generateBrandKit({
        brandName,
        industry,
        description,
      });

      // Update project with BrandKit data
      const updatedProject = await storage.updateProject(projectId, {
        brandKit: {
          brandName,
          tagline: brandKit.tagline,
          colors: brandKit.colors,
          tone: brandKit.tone,
        },
      });

      // Save summary as text content
      const textContent = await storage.createTextContent({
        projectId,
        type: "brandkit_summary",
        content: brandKit.summary,
        metadata: {},
      });

      // Track API usage
      await storage.createApiUsage({
        userId: user.id,
        endpoint: "deepseek_text",
        tokensUsed: Math.ceil(brandKit.summary.length / 4),
        cost: 10, // 10 cents for BrandKit generation
      });

      res.status(201).json({ project: updatedProject, summary: textContent });
    } catch (error: any) {
      console.error("Error in /api/generate/brandkit:", error);
      res.status(500).json({ error: error.message || "Failed to generate BrandKit" });
    }
  });

  // Generate Visual with Runware AI
  app.post("/api/generate/visual", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);

      const {projectId, prompt, negativePrompt, numberOfImages, size } = req.body;

      if (!projectId) {
        return res.status(400).json({ error: "Missing required field: projectId" });
      }

      // Verify project ownership
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (project.userId !== user.id) {
        return res.status(403).json({ error: "Forbidden: Access denied" });
      }

      // Import Runware service
      const { generateRunwareImages, enhanceRunwarePrompt, mapSizeToRunwareDimensions } = await import('./services/runwareService');

      // Handle __BLANK__ token for empty prompts
      let enhancedPrompt = '__BLANK__';

      if (prompt && prompt.trim()) {
        // Enhance prompt using Runware Prompt Enhancer API
        try {
          const enhancedPrompts = await enhanceRunwarePrompt(prompt.trim(), 380, 1);
          enhancedPrompt = enhancedPrompts[0] || prompt;
          console.log('📝 Enhanced prompt:', enhancedPrompt);
        } catch (error: any) {
          console.warn('⚠️ Prompt enhancement failed, using original:', error.message);
          enhancedPrompt = prompt;
        }
      } else {
        console.log('📝 Using __BLANK__ token for empty prompt');
      }

      // Map size to dimensions
      const dimensions = mapSizeToRunwareDimensions(size || project.size || '12x12');

      // Prepare negative prompt - user input takes priority, then add defaults
      let finalNegativePrompt = 'text, words, letters, numbers, logos, watermarks, signatures';
      if (negativePrompt && negativePrompt.trim()) {
        finalNegativePrompt = `${negativePrompt.trim()}, ${finalNegativePrompt}`;
      }

      // Generate images using Runware AI
      const imageUrls = await generateRunwareImages(
        enhancedPrompt,
        finalNegativePrompt,
        dimensions.width,
        dimensions.height,
        numberOfImages || 3
      );

      // Save all generated visuals to storage
      const visuals = [];
      for (const imageUrl of imageUrls) {
        const visual = await storage.createVisual({
          projectId,
          type: "generated",
          prompt: enhancedPrompt,
          imageUrl,
          creatorId: user.id,
          creatorName: user.displayName || null,
          creatorEmail: user.email || null,
          creatorPhoto: user.photoURL || null,
        });
        visuals.push(visual);
      }

      // Track API usage
      await storage.createApiUsage({
        userId: user.id,
        endpoint: "runware_image",
        cost: 15 * imageUrls.length, // 15 cents per image
      });

      res.status(201).json({ visuals, enhancedPrompt });
    } catch (error: any) {
      console.error("Error in /api/generate/visual:", error);
      res.status(500).json({ error: error.message || "Failed to generate visual" });
    }
  });

  // Enhance Prompt with Runware
  app.post("/api/runware/enhance-prompt", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const { prompt } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Missing required field: prompt" });
      }

      const { enhanceRunwarePrompt } = await import('./services/runwareService');
      const enhancedPrompts = await enhanceRunwarePrompt(prompt, 380, 3);

      // Track API usage
      await storage.createApiUsage({
        userId: user.id,
        endpoint: "runware_prompt_enhance",
        cost: 2, // 2 cents for prompt enhancement
      });

      res.json({ enhancedPrompts });
    } catch (error: any) {
      console.error("Error in /api/runware/enhance-prompt:", error);
      res.status(500).json({ error: error.message || "Failed to enhance prompt" });
    }
  });

  // Generate Caption with Runware
  app.post("/api/runware/generate-caption", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const { imageURL } = req.body;

      if (!imageURL) {
        return res.status(400).json({ error: "Missing required field: imageURL" });
      }

      const { generateRunwareCaption } = await import('./services/runwareService');
      const caption = await generateRunwareCaption(imageURL);

      // Track API usage
      await storage.createApiUsage({
        userId: user.id,
        endpoint: "runware_caption",
        cost: 3, // 3 cents for caption generation
      });

      res.json({ caption });
    } catch (error: any) {
      console.error("Error in /api/runware/generate-caption:", error);
      res.status(500).json({ error: error.message || "Failed to generate caption" });
    }
  });

  // Generate Fusion Background with Runware AI (for client-side fusion)
  app.post("/api/generate/fusion-background", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const { backgroundPrompt, negativePrompt } = req.body;

      if (!backgroundPrompt) {
        return res.status(400).json({ error: "Missing required field: backgroundPrompt" });
      }

      const { generateRunwareFusionBackground } = await import('./services/runwareService');

      const backgroundImageUrl = await generateRunwareFusionBackground(
        backgroundPrompt,
        1024,
        1024
      );

      // Track API usage
      await storage.createApiUsage({
        userId: user.id,
        endpoint: "runware_fusion_background",
        cost: 15, // 15 cents for fusion background
      });

      res.json({ backgroundImageUrl });
    } catch (error: any) {
      console.error("Error generating fusion background:", error);
      res.status(500).json({ error: error.message || "Failed to generate fusion background" });
    }
  });

  // Generate Fusion Visual with EXACT-DIMENSION Sharp Compositing
  // Preserves background and product appearance exactly, only adds lighting/shadows
  app.post("/api/generate/fusion", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);

      const { projectId, backgroundImageData, productImageData, placementDescription } = req.body as FusionVisualRequest;

      console.log(`🔍 Fusion request received for projectId: ${projectId}`);
      console.log(`📐 Using EXACT-DIMENSION compositing (preserves background & product exactly)`);

      if (!projectId || !backgroundImageData || !productImageData) {
        return res.status(400).json({ error: "Missing required fields: projectId, backgroundImageData, productImageData" });
      }

      // Verify project ownership
      console.log(`🔍 Looking up project: ${projectId} for user: ${user.id}`);
      const project = await storage.getProject(projectId);
      console.log(`🔍 Project found:`, project ? `Yes (${project.name})` : 'No');

      if (!project) {
        console.error(`❌ Project not found: ${projectId}`);
        return res.status(404).json({ error: "Project not found" });
      }
      if (project.userId !== user.id) {
        return res.status(403).json({ error: "Forbidden: Access denied" });
      }

      const { promises: fs } = await import('fs');
      const path = await import('path');
      const { compositeProductOntoBackground, analyzeLightingForProduct, suggestProductPlacement } = await import('./services/imageCompositing');

      // Convert base64 background image to file
      const backgroundBase64 = backgroundImageData.replace(/^data:image\/\w+;base64,/, '');
      const backgroundBuffer = Buffer.from(backgroundBase64, 'base64');
      const backgroundFilename = `background-${Date.now()}-${randomUUID()}.png`;
      const backgroundImagePath = path.join(process.cwd(), 'uploads', backgroundFilename);
      await fs.writeFile(backgroundImagePath, backgroundBuffer);

      // Convert base64 product image to file
      const productBase64 = productImageData.replace(/^data:image\/\w+;base64,/, '');
      const productImageBuffer = Buffer.from(productBase64, 'base64');
      const productImageFilename = `product-${Date.now()}-${randomUUID()}.png`;
      const productImagePath = path.join(process.cwd(), 'uploads', productImageFilename);
      await fs.writeFile(productImagePath, productImageBuffer);

      console.log('✅ Saved background and product images');

      // Analyze scene lighting for optimal product integration
      console.log('💡 Analyzing scene lighting...');
      const lightingAnalysis = await analyzeLightingForProduct(
        backgroundImagePath,
        productImagePath
      );
      console.log(`   Recommendation: ${lightingAnalysis.recommendation}`);

      // Get AI-suggested placement based on description
      console.log('📍 Determining product placement...');
      const placementSuggestion = await suggestProductPlacement(
        backgroundImagePath,
        productImagePath,
        placementDescription || 'center the product in the scene'
      );

      // Composite product onto background with exact dimension preservation
      console.log('🎨 Compositing product onto background (EXACT dimensions)...');
      const fusionImageUrl = await compositeProductOntoBackground({
        backgroundImagePath,
        productImagePath,
        placement: {
          x: placementSuggestion.x,
          y: placementSuggestion.y,
          scale: placementSuggestion.scale
        },
        lightingAdjustment: {
          enabled: true,
          brightness: lightingAnalysis.brightness,
          shadowIntensity: lightingAnalysis.shadowIntensity
        }
      });

      console.log('✅ Fusion visual created with exact dimensions:', fusionImageUrl);

      // Cleanup temporary files
      try {
        await fs.unlink(backgroundImagePath);
        await fs.unlink(productImagePath);
        console.log('✅ Temporary files cleaned up');
      } catch (cleanupError) {
        console.log('⚠️ Cleanup skipped:', cleanupError);
      }

      // Save to storage with creator information
      const visual = await storage.createVisual({
        projectId,
        type: "fusion",
        prompt: placementDescription || "Product composited onto scene",
        imageUrl: fusionImageUrl,
        productImageUrl: fusionImageUrl,
        creatorId: user.id,
        creatorName: user.displayName || null,
        creatorEmail: user.email || null,
        creatorPhoto: user.photoURL || null,
      });

      // Track API usage (much cheaper than Imagen!)
      await storage.createApiUsage({
        userId: user.id,
        endpoint: "fusion_composite",
        cost: 2, // 2 cents for Sharp compositing (vs 25 cents for Imagen)
      });

      res.status(201).json(visual);
    } catch (error: any) {
      console.error("Error in /api/generate/fusion:", error);
      res.status(500).json({ error: error.message || "Failed to generate fusion visual" });
    }
  });

  // Generate Fusion Visual with Gemini 2.5 Flash Image (AI-powered multi-image fusion)
  // Supports 2-8 reference images with natural language fusion instructions
  app.post("/api/generate/fusion-gemini", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);

      const { projectId, referenceImages, fusionPrompt, width, height } = req.body;

      console.log(`🔍 Gemini fusion request received for projectId: ${projectId}`);
      console.log(`🎨 Using AI-powered multi-image fusion with ${referenceImages?.length || 0} images`);

      // Validate inputs
      if (!projectId || !referenceImages || !fusionPrompt) {
        return res.status(400).json({ 
          error: "Missing required fields: projectId, referenceImages, fusionPrompt" 
        });
      }

      if (!Array.isArray(referenceImages) || referenceImages.length < 2 || referenceImages.length > 8) {
        return res.status(400).json({ 
          error: "referenceImages must be an array of 2-8 image URLs" 
        });
      }

      // Verify project ownership
      console.log(`🔍 Looking up project: ${projectId} for user: ${user.id}`);
      const project = await storage.getProject(projectId);

      if (!project) {
        console.error(`❌ Project not found: ${projectId}`);
        return res.status(404).json({ error: "Project not found" });
      }
      if (project.userId !== user.id) {
        return res.status(403).json({ error: "Forbidden: Access denied" });
      }

      // Call Gemini fusion service
      const { fuseImagesWithGemini } = await import('./services/runwareService');

      const { imageUrl: fusedImageUrl, cost } = await fuseImagesWithGemini(
        referenceImages,
        fusionPrompt,
        width || 1024,
        height || 1024
      );

      console.log('✅ Gemini fusion visual created:', fusedImageUrl);
      console.log(`💰 Actual cost from Runware: ${cost}¢`);

      // Save to storage with creator information
      const visual = await storage.createVisual({
        projectId,
        type: "fusion",
        prompt: fusionPrompt,
        imageUrl: fusedImageUrl,
        productImageUrl: fusedImageUrl,
        creatorId: user.id,
        creatorName: user.displayName || null,
        creatorEmail: user.email || null,
        creatorPhoto: user.photoURL || null,
      });

      // Track API usage with actual cost from Runware
      await storage.createApiUsage({
        userId: user.id,
        endpoint: "fusion_gemini",
        cost: cost, // Use actual cost from Runware API
      });

      res.status(201).json(visual);
    } catch (error: any) {
      console.error("Error in /api/generate/fusion-gemini:", error);
      res.status(500).json({ error: error.message || "Failed to generate Gemini fusion visual" });
    }
  });

  // Generate Inpainted Image
  app.post("/api/generate/inpaint", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const { projectId, imageDataUrl, maskDataUrl, prompt, negativePrompt, width, height } = req.body;

      if (!projectId || !imageDataUrl || !maskDataUrl) {
        return res.status(400).json({ error: "Missing required fields: projectId, imageDataUrl, maskDataUrl" });
      }

      console.log('🎨 Inpaint request received for projectId:', projectId);
      console.log('📝 Prompt:', prompt);
      console.log('📝 Negative Prompt:', negativePrompt);

      // Verify project exists and belongs to user
      const project = await storage.getProject(projectId);
      if (!project) {
        console.log('🔍 Project not found:', projectId);
        return res.status(404).json({ error: "Project not found" });
      }
      if (project.userId !== user.id) {
        console.log('🔍 Project does not belong to user');
        return res.status(403).json({ error: "Not authorized to access this project" });
      }

      // Generate inpainted image using Runware
      const { generateInpaintedImage } = await import('./services/runwareService');
      const imageUrl = await generateInpaintedImage(
        imageDataUrl,
        maskDataUrl,
        prompt,
        negativePrompt,
        width,
        height
      );

      // Save to storage with creator information
      const visual = await storage.createVisual({
        projectId,
        type: "inpaint",
        prompt: prompt || "Inpainted image",
        imageUrl,
        productImageUrl: imageUrl,
        creatorId: user.id,
        creatorName: user.displayName || null,
        creatorEmail: user.email || null,
        creatorPhoto: user.photoURL || null,
      });

      // Track API usage (FLUX.1 Fill Pro inpainting cost)
      await storage.createApiUsage({
        userId: user.id,
        endpoint: "runware_inpaint",
        cost: 5, // 5 cents per inpaint operation
      });

      res.status(201).json(visual);
    } catch (error: any) {
      console.error("Error in /api/generate/inpaint:", error);
      res.status(500).json({ error: error.message || "Failed to generate inpainted image" });
    }
  });

  // Generate Outpainted Image
  app.post("/api/generate/outpaint", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const { projectId, imageDataUrl, directions, prompt, negativePrompt, width, height } = req.body;

      if (!projectId || !imageDataUrl || !directions) {
        return res.status(400).json({ error: "Missing required fields: projectId, imageDataUrl, directions" });
      }

      console.log('🖼️ Outpaint request received for projectId:', projectId);
      console.log('📝 Prompt:', prompt);
      console.log('📝 Negative Prompt:', negativePrompt);
      console.log('📐 Directions:', directions);

      // Verify project exists and belongs to user
      const project = await storage.getProject(projectId);
      if (!project) {
        console.log('🔍 Project not found:', projectId);
        return res.status(404).json({ error: "Project not found" });
      }
      if (project.userId !== user.id) {
        console.log('🔍 Project does not belong to user');
        return res.status(403).json({ error: "Not authorized to access this project" });
      }

      // Generate outpainted image using Runware
      const { generateOutpaintedImage } = await import('./services/runwareService');
      const imageUrl = await generateOutpaintedImage(
        imageDataUrl,
        directions,
        prompt,
        negativePrompt,
        width,
        height
      );

      // Save to storage with creator information
      const visual = await storage.createVisual({
        projectId,
        type: "outpaint",
        prompt: prompt || "Outpainted image",
        imageUrl,
        productImageUrl: imageUrl,
        creatorId: user.id,
        creatorName: user.displayName || null,
        creatorEmail: user.email || null,
        creatorPhoto: user.photoURL || null,
      });

      // Track API usage (FLUX.1 Fill Pro outpainting cost)
      await storage.createApiUsage({
        userId: user.id,
        endpoint: "runware_outpaint",
        cost: 5, // 5 cents per outpaint operation
      });

      res.status(201).json(visual);
    } catch (error: any) {
      console.error("Error in /api/generate/outpaint:", error);
      res.status(500).json({ error: error.message || "Failed to generate outpainted image" });
    }
  });

  // Generate Image-to-Image Transformation
  app.post("/api/generate/image2image", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const { projectId, imageDataUrl, transformPrompt, strength, negativePrompt, width, height } = req.body;

      if (!projectId || !imageDataUrl || !transformPrompt) {
        return res.status(400).json({ error: "Missing required fields: projectId, imageDataUrl, transformPrompt" });
      }

      // Validate strength parameter (0-100)
      const styleStrength = strength !== undefined ? Math.max(0, Math.min(100, strength)) : 70;

      console.log('🔄 Image2Image transformation request received for projectId:', projectId);
      console.log('💬 Transform prompt:', transformPrompt);
      console.log('🎚️ Style strength:', styleStrength);
      console.log('📝 Negative Prompt:', negativePrompt);

      // Verify project exists and belongs to user
      const project = await storage.getProject(projectId);
      if (!project) {
        console.log('🔍 Project not found:', projectId);
        return res.status(404).json({ error: "Project not found" });
      }
      if (project.userId !== user.id) {
        console.log('🔍 Project does not belong to user');
        return res.status(403).json({ error: "Not authorized to access this project" });
      }

      // Generate transformed image using Runware
      const { generateImage2ImageTransformation } = await import('./services/runwareService');
      const imageUrl = await generateImage2ImageTransformation(
        imageDataUrl,
        transformPrompt,
        styleStrength,
        negativePrompt,
        width,
        height
      );

      // Save to storage with creator information
      const visual = await storage.createVisual({
        projectId,
        type: "image2image",
        prompt: transformPrompt,
        imageUrl,
        productImageUrl: imageUrl,
        creatorId: user.id,
        creatorName: user.displayName || null,
        creatorEmail: user.email || null,
        creatorPhoto: user.photoURL || null,
      });

      // Track API usage (FLUX.1 schnell image-to-image cost)
      await storage.createApiUsage({
        userId: user.id,
        endpoint: "runware_image2image",
        cost: 3, // 3 cents per image-to-image transformation
      });

      res.status(201).json(visual);
    } catch (error: any) {
      console.error("Error in /api/generate/image2image:", error);
      res.status(500).json({ error: error.message || "Failed to generate transformed image" });
    }
  });

  // Upscale Image
  app.post("/api/runware/upscale", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const { imageDataUrl, upscaleFactor = 2 } = req.body;

      if (!imageDataUrl) {
        return res.status(400).json({ error: "Missing required field: imageDataUrl" });
      }

      console.log('🔍 Upscale request received');
      console.log('📊 Upscale factor:', upscaleFactor);

      // Call Runware upscale service
      const { upscaleImage } = await import('./services/runwareService');
      const upscaledImageDataUrl = await upscaleImage(imageDataUrl, upscaleFactor);

      res.status(200).json({ imageDataUrl: upscaledImageDataUrl });
    } catch (error: any) {
      console.error("Error in /api/runware/upscale:", error);
      res.status(500).json({ error: error.message || "Failed to upscale image" });
    }
  });

  // Generate Scene Descriptions for PromoVideo
  app.post("/api/generate/scene-descriptions", async (req: Request, res: Response) => {
    try {
      // Support both authenticated and anonymous users
      const user = await getCurrentUser(req);

      const { images } = req.body;

      // Validate input
      if (!images || !Array.isArray(images) || images.length < 3 || images.length > 5) {
        return res.status(400).json({ error: "Please provide 3-5 base64 images" });
      }

      // Validate each image is a valid base64 string
      const base64Regex = /^data:image\/(jpeg|jpg|png|webp);base64,/;
      if (!images.every((img: string) => typeof img === 'string' && base64Regex.test(img))) {
        return res.status(400).json({ error: "All images must be valid base64-encoded JPG, PNG, or WebP" });
      }

      console.log(`🎬 Generating scene descriptions for ${images.length} images`);

      // Use concurrency limit of 2 to avoid rate limits
      const limit = pLimit(2);

      // Process images in parallel with concurrency control
      const results = await Promise.all(
        images.map((image: string, index: number) =>
          limit(async () => {
            console.log(`🎬 Processing image ${index + 1}/${images.length}`);
            const result = await generatePromoSceneDescription(image);
            console.log(`✅ Scene ${index + 1}: ${result.success ? result.description : 'Failed - using fallback'}`);
            return result;
          })
        )
      );

      // Check if all scenes succeeded
      const allSuccess = results.every(r => r.success);
      const descriptions = results.map(r => r.description);

      console.log(`🎬 Scene description generation complete. Success rate: ${results.filter(r => r.success).length}/${images.length}`);

      res.json({
        success: allSuccess,
        descriptions,
        results, // Include individual status for each scene
      });
    } catch (error: any) {
      console.error("Failed to generate scene descriptions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate Voiceover & Music Recommendations for PromoVideo
  app.post("/api/generate/promo-recommendations", async (req: Request, res: Response) => {
    try {
      // Support both authenticated and anonymous users
      const user = await getCurrentUser(req);

      const { sceneDescriptions } = req.body;

      // Validate input
      if (!sceneDescriptions || !Array.isArray(sceneDescriptions) || sceneDescriptions.length === 0) {
        return res.status(400).json({ error: "Please provide scene descriptions" });
      }

      console.log(`🎵 Generating voiceover and music recommendations from ${sceneDescriptions.length} scene descriptions`);

      const result = await generatePromoRecommendations(sceneDescriptions);

      if (!result.success) {
        console.error("Failed to generate recommendations:", result.error);
        // Still return default recommendations
        return res.json({
          success: true,
          recommendations: {
            language: 'bahasa',
            voiceType: 'female',
            musicStyle: 'calm'
          }
        });
      }

      console.log(`✅ Recommendations generated:`, result.recommendations);
      res.json(result);

    } catch (error: any) {
      console.error("Failed to generate promo recommendations:", error);
      // Return default recommendations on error
      res.json({
        success: true,
        recommendations: {
          language: 'bahasa',
          voiceType: 'female',
          musicStyle: 'calm'
        }
      });
    }
  });

  // Generate Text Overlays for PromoVideo Scenes
  app.post("/api/generate/scene-text-overlays", async (req: Request, res: Response) => {
    try {
      // Support both authenticated and anonymous users
      const user = await getCurrentUser(req);

      const { sceneDescriptions } = req.body;

      // Validate input
      if (!sceneDescriptions || !Array.isArray(sceneDescriptions) || sceneDescriptions.length === 0) {
        return res.status(400).json({ error: "Please provide scene descriptions" });
      }

      console.log(`📝 Generating text overlays for ${sceneDescriptions.length} scenes`);

      const result = await generateSceneTextOverlays(sceneDescriptions);

      if (!result.success) {
        console.error("Failed to generate text overlays:", result.error);
        // Return generic fallback text
        const fallbacks = [
          "Your Perfect Daily Companion",
          "Elevate Every Moment",
          "Crafted for Excellence",
          "Beauty Naturally Delivered",
          "Inspired by You"
        ];
        return res.json({
          success: true,
          textOverlays: sceneDescriptions.map((_, i) => fallbacks[i % fallbacks.length])
        });
      }

      console.log(`✅ Text overlays generated:`, result.textOverlays);
      res.json(result);

    } catch (error: any) {
      console.error("Failed to generate scene text overlays:", error);
      // Return generic fallback text on error
      const fallbacks = [
        "Your Perfect Daily Companion",
        "Elevate Every Moment",
        "Crafted for Excellence"
      ];
      res.json({
        success: true,
        textOverlays: req.body.sceneDescriptions?.map((_: any, i: number) => 
          fallbacks[i % fallbacks.length]
        ) || fallbacks.slice(0, 3)
      });
    }
  });

  // Generate Narration Summary for PromoVideo
  app.post("/api/generate/narration-summary", async (req: Request, res: Response) => {
    try {
      // Support both authenticated and anonymous users
      const user = await getCurrentUser(req);

      const { sceneDescriptions, language } = req.body;

      // Validate input
      if (!sceneDescriptions || !Array.isArray(sceneDescriptions) || sceneDescriptions.length === 0) {
        return res.status(400).json({ error: "Please provide scene descriptions" });
      }

      if (!language || !['ms', 'en', 'zh'].includes(language)) {
        return res.status(400).json({ error: "Please provide a valid language (ms, en, or zh)" });
      }

      console.log(`🎙️ Generating narration summary in ${language} for ${sceneDescriptions.length} scenes`);

      // Create Gemini prompt for narration summary
      const languageMap = {
        ms: 'Bahasa Melayu',
        en: 'English',
        zh: 'Simplified Chinese'
      };

      const { enforceGeminiEthnicConsistency } = await import('./promptUtils');
      const prompt = enforceGeminiEthnicConsistency(`Generate a short promotional narration summary based on these scene descriptions:

${sceneDescriptions.map((desc: string, i: number) => `Scene ${i + 1}: ${desc}`).join('\n')}

Requirements:
- Write EXACTLY 3 sentences maximum (no more, no less)
- Make it persuasive and emotionally engaging
- End with a clear call to action (e.g., "Try it now and feel the difference.")
- Language: ${languageMap[language as 'ms' | 'en' | 'zh']}
- Keep it concise (~450 characters total)
- Focus on benefits and emotional connection

Narration summary:`);

      const narrationText = await generateText(prompt, 'gemini-flash');

      // Validate output length (max ~450 characters as per architect guidance)
      const trimmedNarration = narrationText.trim();
      if (trimmedNarration.length > 500) {
        console.warn(`⚠️ Narration too long (${trimmedNarration.length} chars), truncating...`);
      }

      // Track API usage
      await storage.createApiUsage({
        userId: user.id,
        endpoint: "deepseek_text",
        tokensUsed: Math.ceil((prompt.length + narrationText.length) / 4),
        cost: 1, // 1 cent for narration generation
      });

      console.log(`✅ Narration summary generated: "${trimmedNarration.substring(0, 100)}..."`);

      res.json({ 
        success: true,
        narrationText: trimmedNarration.substring(0, 500) // Cap at 500 chars
      });

    } catch (error: any) {
      console.error("Failed to generate narration summary:", error);
      // Return generic fallback based on language
      const fallbacks = {
        ms: "Temui pengalaman luar biasa dengan produk yang direka khas untuk anda. Nikmati kualiti terbaik setiap hari. Cuba sekarang dan rasakan perbezaannya!",
        en: "Discover an extraordinary experience with a product designed just for you. Enjoy the finest quality every day. Try it now and feel the difference!",
        zh: "发现专为您设计的非凡体验产品。每天享受最优质的品质。立即尝试，感受不同！"
      };

      res.json({
        success: true,
        narrationText: fallbacks[req.body.language as 'ms' | 'en' | 'zh'] || fallbacks.en
      });
    }
  });

  // Generate AI Placement Suggestion
  app.post("/api/generate/placement-suggestion", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const { productDescription, backgroundContext } = req.body;

      // Trim and validate background context
      const trimmedContext = (backgroundContext || "").trim();
      if (!trimmedContext) {
        return res.status(400).json({ error: "Missing required field: backgroundContext" });
      }

      // Generate placement suggestion using Gemini
      const prompt = `You are an expert product photographer and scene compositor. Based on the following context, generate a concise, practical placement suggestion for how to position the product in the scene.

Background Scene: ${trimmedContext}
Product: ${productDescription || "the product"}

Provide a single, specific placement suggestion that describes:
- Where the product should be placed in the scene
- How it should be oriented or positioned
- Any lighting or compositional details

Keep it concise (1-2 sentences) and actionable. Example: "Place the product in the center foreground on a wooden surface, angled slightly to the right to catch natural light from the window."

Placement suggestion:`;

      const suggestion = await generateText(prompt, 'gemini-flash');

      // Track API usage
      await storage.createApiUsage({
        userId: user.id,
        endpoint: "deepseek_text",
        tokensUsed: Math.ceil((prompt.length + suggestion.length) / 4),
        cost: 1, // 1 cent for placement suggestion
      });

      res.json({ suggestion: suggestion.trim() });
    } catch (error: any) {
      console.error("Error in /api/generate/placement-suggestion:", error);
      res.status(500).json({ error: error.message || "Failed to generate placement suggestion" });
    }
  });

  // Smart Prompt Optimizer
  app.post("/api/optimize-prompt", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const { prompt } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Missing required field: prompt" });
      }

      // Optimize the prompt using Gemini
      const optimizedPrompt = await optimizePrompt(prompt);

      // Only track API usage if optimization succeeded (not using fallback)
      if (optimizedPrompt !== prompt) {
        await storage.createApiUsage({
          userId: user.id,
          endpoint: "deepseek_text",
          tokensUsed: Math.ceil((prompt.length + optimizedPrompt.length) / 4),
          cost: 2, // 2 cents for prompt optimization
        });
      }

      res.json({ optimizedPrompt });
    } catch (error: any) {
      console.error("Error in /api/optimize-prompt:", error);
      // Return original prompt as fallback instead of error
      res.json({ optimizedPrompt: req.body.prompt || "" });
    }
  });

  // Generic AI Text Generation
  app.post("/api/ai/generate-text", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const { prompt, modelPreference, brandContext } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Missing required field: prompt" });
      }

      // Generate text using Gemini
      const generatedText = await generateText(prompt, modelPreference || 'gemini-flash');

      // Track API usage
      await storage.createApiUsage({
        userId: user.id,
        endpoint: "deepseek_text",
        tokensUsed: Math.ceil((prompt.length + generatedText.length) / 4),
        cost: 1, // 1 cent for text generation
      });

      res.json({ text: generatedText });
    } catch (error: any) {
      console.error("Error in /api/ai/generate-text:", error);
      res.status(500).json({ error: error.message || "Failed to generate text" });
    }
  });

  // AI Visual Analysis for Text Placement
  app.post("/api/analyze-visual", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const { imageId, imageUrl } = req.body;

      if (!imageUrl) {
        return res.status(400).json({ error: "Missing required field: imageUrl" });
      }

      console.log("Analyzing visual for optimal text placement...");

      // Run AI analysis on the image
      const analysisResult = await analyzeVisualForTextPlacement(imageUrl);

      console.log("Visual analysis complete:", analysisResult);

      // If imageId provided, update the database with analysis results
      if (imageId) {
        await storage.updateCampaignImage(imageId, {
          visualAnalysis: analysisResult,
        });
      }

      // Track API usage only if analysis was successful
      if (analysisResult.analyzed) {
        await storage.createApiUsage({
          userId: user.id,
          endpoint: "gemini_image_analysis",
          cost: 3, // 3 cents for visual analysis
        });
      }

      res.json(analysisResult);
    } catch (error: any) {
      console.error("Error in /api/analyze-visual:", error);
      res.status(500).json({ error: error.message || "Failed to analyze visual" });
    }
  });

  // Vertex AI Endpoints

  // Smart Text Rewriting with Vertex AI
  app.post("/api/vertex/rewrite-text", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const { text, context, targetStyle } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Missing required field: text" });
      }

      const rewrittenText = await rewriteTextWithVertex({
        originalText: text,
        context,
        targetStyle: targetStyle || "professional",
      });

      // Track API usage
      await storage.createApiUsage({
        userId: user.id,
        endpoint: "vertex_text",
        tokensUsed: Math.ceil((text.length + rewrittenText.length) / 4),
        cost: 3, // 3 cents for Vertex AI text rewriting
      });

      res.json({ rewrittenText });
    } catch (error: any) {
      console.error("Error in /api/vertex/rewrite-text:", error);
      res.status(500).json({ error: error.message || "Failed to rewrite text with Vertex AI" });
    }
  });

  // AI Fusion with Vertex AI
  app.post("/api/vertex/fusion", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const { productDescription, backgroundTheme, mood, brandContext } = req.body;

      if (!productDescription || !backgroundTheme) {
        return res.status(400).json({ 
          error: "Missing required fields: productDescription, backgroundTheme" 
        });
      }

      const backgroundDescription = await generateFusionBackgroundWithVertex({
        productDescription,
        backgroundTheme,
        mood,
        brandContext,
      });

      // Track API usage
      await storage.createApiUsage({
        userId: user.id,
        endpoint: "vertex_fusion",
        tokensUsed: Math.ceil((productDescription.length + backgroundDescription.length) / 4),
        cost: 5, // 5 cents for Vertex AI fusion background generation
      });

      res.json({ backgroundDescription });
    } catch (error: any) {
      console.error("Error in /api/vertex/fusion:", error);
      res.status(500).json({ error: error.message || "Failed to generate fusion background with Vertex AI" });
    }
  });

  // Contextual Copywriting with Vertex AI
  app.post("/api/vertex/copywriting", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const { 
        platform, 
        productName, 
        productDescription, 
        targetAudience, 
        tone, 
        brandVoice, 
        callToAction 
      } = req.body;

      if (!platform || !productName || !productDescription) {
        return res.status(400).json({ 
          error: "Missing required fields: platform, productName, productDescription" 
        });
      }

      const adCopy = await generateContextualCopyWithVertex({
        platform,
        productName,
        productDescription,
        targetAudience,
        tone,
        brandVoice,
        callToAction,
      });

      // Track API usage
      await storage.createApiUsage({
        userId: user.id,
        endpoint: "vertex_copywriting",
        tokensUsed: Math.ceil((productDescription.length + JSON.stringify(adCopy).length) / 4),
        cost: 4, // 4 cents for Vertex AI contextual copywriting
      });

      res.json(adCopy);
    } catch (error: any) {
      console.error("Error in /api/vertex/copywriting:", error);
      res.status(500).json({ error: error.message || "Failed to generate copy with Vertex AI" });
    }
  });

  // Generate Caption Script from Image with Gemini Vision
  app.post("/api/vertex/generate-caption-script", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const { imageDataUrl, brandContext } = req.body;

      if (!imageDataUrl) {
        return res.status(400).json({ error: "Missing required field: imageDataUrl" });
      }

      const script = await generateCaptionScriptFromImage(imageDataUrl, brandContext);

      // Track API usage
      await storage.createApiUsage({
        userId: user.id,
        endpoint: "gemini_caption_script",
        tokensUsed: Math.ceil(script.length / 4),
        cost: 3, // 3 cents for Gemini vision caption generation
      });

      res.json({ script });
    } catch (error: any) {
      console.error("Error in /api/vertex/generate-caption-script:", error);
      res.status(500).json({ error: error.message || "Failed to generate caption script" });
    }
  });

  // Generate Fusion Suggestion from Background and Product Images
  app.post("/api/fusion/suggest-prompt", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const { backgroundImageDataUrl, productImageDataUrl } = req.body;

      if (!backgroundImageDataUrl || !productImageDataUrl) {
        return res.status(400).json({ 
          error: "Missing required fields: backgroundImageDataUrl, productImageDataUrl" 
        });
      }

      const { generateFusionSuggestion } = await import('./ai-visual-analyzer');
      const suggestion = await generateFusionSuggestion(backgroundImageDataUrl, productImageDataUrl);

      // Track API usage
      await storage.createApiUsage({
        userId: user.id,
        endpoint: "gemini_fusion_suggestion",
        tokensUsed: Math.ceil(suggestion.length / 4),
        cost: 2, // 2 cents for fusion suggestion with Gemini Vision
      });

      res.json({ suggestion });
    } catch (error: any) {
      console.error("Error in /api/fusion/suggest-prompt:", error);
      res.status(500).json({ error: error.message || "Failed to generate fusion suggestion" });
    }
  });

  // Stats
  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const stats = await storage.getUserUsageStats(user.id);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Usage history
  app.get("/api/usage/history", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const history = await storage.getUserUsageHistory(user.id);
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Serve uploaded images
  app.use("/uploads", (req, res, next) => {
    // Add CORS headers for uploaded files
    res.header("Access-Control-Allow-Origin", "*");
    next();
  });

  // Stripe Payment Endpoints
  app.post("/api/create-subscription", async (req: Request, res: Response) => {
    try {
      if (!stripe) {
        return res.status(503).json({ error: "Payment processing is not configured. Please contact support." });
      }

      const user = await ensureUser(req);
      const { plan } = req.body;

      if (!plan || !['starter', 'professional', 'enterprise'].includes(plan)) {
        return res.status(400).json({ error: "Invalid plan selected" });
      }

      // Define price amounts (in cents)
      const priceMap = {
        starter: 2900,      // $29.00
        professional: 7900, // $79.00
        enterprise: 19900,  // $199.00
      };

      // Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.displayName || undefined,
          metadata: {
            userId: user.id,
          },
        });
        customerId = customer.id;
      }

      // Create subscription with payment intent
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `AI MagicBox ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
            },
            unit_amount: priceMap[plan as keyof typeof priceMap],
            recurring: {
              interval: 'month',
            },
          } as any, // Type assertion for Stripe SDK compatibility
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      // Update user with subscription info
      await storage.updateUserSubscription(
        user.id,
        customerId,
        subscription.id,
        plan,
        subscription.status
      );

      // Extract client secret from payment intent
      const invoice = subscription.latest_invoice as any;
      const clientSecret = invoice?.payment_intent?.client_secret;

      res.json({
        subscriptionId: subscription.id,
        clientSecret,
      });
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ error: error.message || "Failed to create subscription" });
    }
  });

  // Serve uploaded files from local storage
  app.get("/uploads/:filePath(*)", async (req: Request, res: Response) => {
    const localStorageService = new LocalFileStorageService();
    try {
      const urlPath = `/uploads/${req.params.filePath}`;
      const filepath = localStorageService.getFilePath(urlPath);
      
      // Check if file exists
      const exists = await localStorageService.fileExists(urlPath);
      if (!exists) {
        return res.sendStatus(404);
      }
      
      // Serve the file
      res.sendFile(filepath);
    } catch (error) {
      console.error("Error serving uploaded file:", error);
      return res.sendStatus(500);
    }
  });

  // Legacy /objects endpoint - redirect to /uploads
  app.get("/objects/:objectPath(*)", async (req: Request, res: Response) => {
    // Redirect old /objects URLs to /uploads
    const newPath = req.path.replace('/objects/', '/uploads/');
    res.redirect(301, newPath);
  });

  // Community / Public Projects
  app.get("/api/community/projects", async (req: Request, res: Response) => {
    try {
      const {category, size, search, sort, cursor, limit } = req.query;

      const filters: { category?: string; size?: string; search?: string; sort?: string; cursor?: string; limit?: number } = {};
      if (category && typeof category === 'string') filters.category = category;
      if (size && typeof size === 'string') filters.size = size;
      if (search && typeof search === 'string') filters.search = search;
      if (sort && typeof sort === 'string') filters.sort = sort;
      if (cursor && typeof cursor === 'string') filters.cursor = cursor;
      if (limit && typeof limit === 'string') filters.limit = parseInt(limit, 10);

      const { items: publicProjects, nextCursor } = await storage.getPublicProjects(filters);
      console.log(`[COMMUNITY] Found ${publicProjects.length} public projects, first userId: ${publicProjects[0]?.userId}`);

      // Get like counts, user info, and public visual image for each project
      const projectsWithDetails = await Promise.all(
        publicProjects.map(async (project) => {
          // CRITICAL SAFEGUARD: Filter out projects without publicVisualId
          if (!project.publicVisualId) {
            console.error(`[COMMUNITY] ❌ Skipping project ${project.id} - no publicVisualId set`);
            return null;
          }

          const likeCount = await storage.getProjectLikeCount(project.id);
          const owner = await storage.getUser(project.userId);

          // Fetch the public visual image if publicVisualId is set
          let publicVisualUrl: string | null = null;
          let canvasRatio = project.size; // e.g., "1:1", "16:9", "3:4", "9:16"

          if (project.publicVisualId) {
            const publicImage = await storage.getCampaignImage(project.publicVisualId);
            if (publicImage) {
              // ALWAYS use renderedImageUrl for newly shared designs (contains full rendered canvas)
              // renderedImageUrl includes: text, typography, logo, layout, all graphic elements
              // This is what the user saw in their final design when they clicked "Share to Public"
              if (publicImage.renderedImageUrl) {
                // CRITICAL SAFEGUARD: Block projects with base64 data URIs (bad legacy data)
                // Only allow proper object storage URLs (/objects/community/...)
                if (publicImage.renderedImageUrl.startsWith('data:image')) {
                  console.error(`[COMMUNITY] ❌ Blocking project ${project.id} - has base64 renderedImageUrl instead of object storage URL`);
                  return null; // Filter out this project
                }
                publicVisualUrl = publicImage.renderedImageUrl;
                console.log(`[COMMUNITY] ✅ Using high-res rendered canvas for project ${project.id}: ${publicImage.renderedImageUrl.substring(0, 100)}...`);
              } else {
                // CRITICAL: Block legacy projects without renderedImageUrl
                // These projects only have background images, not full rendered canvases
                // Users must re-save their images to generate high-resolution renderedImageUrl
                console.error(`[COMMUNITY] ❌ Blocking project ${project.id} - missing renderedImageUrl (legacy data). User must re-save image.`);
                return null; // Filter out this project
              }
            } else {
              // publicImage not found - filter out this project
              console.error(`[COMMUNITY] ❌ Blocking project ${project.id} - publicImage not found in database`);
              return null;
            }
          }

          // FINAL VALIDATION: Ensure we have a valid object storage URL
          if (!publicVisualUrl || publicVisualUrl.startsWith('data:image')) {
            console.error(`[COMMUNITY] ❌ Blocking project ${project.id} - invalid publicVisualUrl: ${publicVisualUrl?.substring(0, 50) || 'NULL'}`);
            return null;
          }

          return {
            ...project,
            userId: project.userId, // Explicitly include userId
            likeCount,
            ownerName: owner?.displayName || 'User',
            ownerPhoto: owner?.photoURL || null,
            publicVisualUrl, // Use the fully rendered canvas with full design
            canvasRatio, // e.g., "1:1", "16:9", "3:4", "9:16" for dynamic card layout
          };
        })
      );

      // Filter out null entries (projects with bad base64 renderedImageUrl)
      const validProjects = projectsWithDetails.filter(p => p !== null);

      console.log(`[COMMUNITY] First project response includes userId: ${validProjects[0]?.userId}`);

      // Return paginated response with cursor
      res.json({
        items: validProjects,
        nextCursor
      });
    } catch (error: any) {
      console.error("Error fetching public projects:", error);

      // Return 400 for invalid cursor errors
      if (error.message?.includes('Invalid cursor')) {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: error.message || "Failed to fetch public projects" });
    }
  });

  app.post("/api/projects/:id/toggle-public", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const { id } = req.params;
      const { category } = req.body;

      // Get project to verify ownership
      const project = await storage.getProject(id);
      if (!project || project.userId !== user.id) {
        return res.status(403).json({ error: "Not authorized to modify this project" });
      }

      // CRITICAL VALIDATION: When making project PUBLIC, ensure it has a valid renderedImageUrl
      if (project.isPublic === 0) { // About to make public
        let publicVisualId = project.publicVisualId;

        // AUTO-SELECT: If no publicVisualId is set, automatically select the first saved image
        if (!publicVisualId) {
          console.log(`[AUTO-SELECT] No publicVisualId set, searching for first valid saved image...`);

          // Get all campaigns for this project
          const campaigns = await storage.getProjectCampaigns(id);
          let firstValidImage = null;

          // Search through all campaigns for first image with valid renderedImageUrl
          for (const campaign of campaigns) {
            const images = await storage.getCampaignImages(campaign.id);
            for (const image of images) {
              if (image && image.renderedImageUrl && !image.renderedImageUrl.startsWith('data:image')) {
                firstValidImage = image;
                console.log(`[AUTO-SELECT] ✅ Found valid image: ${image.id} with renderedImageUrl: ${image.renderedImageUrl}`);
                break;
              }
            }
            if (firstValidImage) break;
          }

          if (!firstValidImage) {
            return res.status(400).json({ 
              error: "No saved images found. Please save at least one image with 'Save to My Project' before sharing." 
            });
          }

          // Set this image as the public visual
          publicVisualId = firstValidImage.id;
          await storage.updateProject(id, { publicVisualId });
          console.log(`[AUTO-SELECT] ✅ Automatically set publicVisualId to: ${publicVisualId}`);
        }

        // Validate that the selected image has a renderedImageUrl
        const publicImage = await storage.getCampaignImage(publicVisualId);
        if (!publicImage) {
          return res.status(400).json({ 
            error: "Selected image not found. Please save your images first." 
          });
        }

        if (!publicImage.renderedImageUrl) {
          return res.status(400).json({ 
            error: "Image must be saved with full design rendering before sharing. Please click the circle to select the image, then click 'Save to My Project'." 
          });
        }

        // Ensure it's a valid object storage URL (not base64)
        if (publicImage.renderedImageUrl.startsWith('data:image')) {
          return res.status(400).json({ 
            error: "Image upload failed. Please save the image again to upload it to storage." 
          });
        }

        console.log(`[SHARE VALIDATION] ✅ Project ${id} validated - has renderedImageUrl: ${publicImage.renderedImageUrl}`);
      }

      // Update category if provided when making public
      const updates: any = {};
      if (category) {
        updates.category = category;
      }

      // Toggle public status
      const updatedProject = await storage.toggleProjectPublic(id, user.id);

      // Apply category update if provided
      if (updatedProject && Object.keys(updates).length > 0) {
        const finalProject = await storage.updateProject(id, updates);
        return res.json(finalProject);
      }

      res.json(updatedProject);
    } catch (error: any) {
      console.error("Error toggling project public status:", error);
      res.status(500).json({ error: error.message || "Failed to toggle project public status" });
    }
  });

  // Upload rendered canvas image for community sharing
  app.post("/api/upload-community-image", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const { imageData } = req.body; // base64 JPEG data

      if (!imageData) {
        return res.status(400).json({ error: "imageData is required" });
      }

      // Convert base64 to buffer
      const base64Data = imageData.replace(/^data:image\/jpeg;base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");

      // Upload to local file storage
      const localStorageService = new LocalFileStorageService();
      const publicUrl = await localStorageService.uploadCommunityImage(imageBuffer);

      const sizeInKB = (imageBuffer.length / 1024).toFixed(2);
      console.log(`✅ Uploaded community image: ${publicUrl} (${sizeInKB} KB)`);

      res.json({ url: publicUrl });
    } catch (error: any) {
      console.error("Error uploading community image:", error);
      res.status(500).json({ error: error.message || "Failed to upload image" });
    }
  });

  // Upload profile image
  app.post("/api/upload-profile-image", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const { imageData } = req.body;

      if (!imageData) {
        return res.status(400).json({ error: "imageData is required" });
      }

      // Validate image format (support JPEG and PNG)
      const imageFormat = imageData.match(/^data:image\/(jpeg|jpg|png);base64,/);
      if (!imageFormat) {
        return res.status(400).json({ error: "Invalid image format. Only JPEG and PNG are supported." });
      }

      // Extract content type from the data URL
      const format = imageFormat[1];
      const contentType = format === 'png' ? 'image/png' : 'image/jpeg';

      // Convert base64 to buffer
      const base64Data = imageData.replace(/^data:image\/(jpeg|jpg|png);base64,/, "");
      const imageBuffer = Buffer.from(base64Data, "base64");

      // Validate image size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (imageBuffer.length > maxSize) {
        return res.status(400).json({ error: "Image size must be less than 5MB" });
      }

      // Upload to local file storage with proper content type
      const localStorageService = new LocalFileStorageService();
      const photoURL = await localStorageService.uploadProfileImage(imageBuffer, user.id, contentType);

      const sizeInKB = (imageBuffer.length / 1024).toFixed(2);
      console.log(`✅ Uploaded profile image for user ${user.id}: ${photoURL} (${sizeInKB} KB)`);

      // CRITICAL FIX: Update user profile with new photoURL in database
      const updatedUser = await storage.updateUserProfile(user.id, user.displayName, photoURL);
      console.log(`✅ Updated user ${user.id} photoURL in database: ${photoURL}`);

      // Sync session data for email/password authenticated users
      if (req.session.userId === user.id) {
        req.session.photoURL = photoURL;
        console.log(`✅ Synced session photoURL for user ${user.id}`);
      }

      res.json({ url: photoURL });
    } catch (error: any) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({ error: error.message || "Failed to upload profile image" });
    }
  });

  app.patch("/api/projects/:id/public-visual", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const { id } = req.params;
      const { imageId, renderedImageUrl } = req.body;

      if (!imageId) {
        return res.status(400).json({ error: "imageId is required" });
      }

      // Get project to verify ownership
      const project = await storage.getProject(id);
      if (!project || project.userId !== user.id) {
        return res.status(403).json({ error: "Not authorized to modify this project" });
      }

      // CRITICAL VALIDATION: Verify the image exists and has valid renderedImageUrl
      const image = await storage.getCampaignImage(imageId);
      if (!image) {
        return res.status(400).json({ error: "Image not found. Please save your images first." });
      }

      // CRITICAL FIX: Always use the provided renderedImageUrl if available
      // This ensures we always share the latest saved version
      let finalRenderedImageUrl = renderedImageUrl || image.renderedImageUrl;

      if (renderedImageUrl) {
        if (renderedImageUrl.startsWith('data:image')) {
          return res.status(400).json({ 
            error: "Cannot use base64 image. Please save the image to object storage first." 
          });
        }
        if (!renderedImageUrl.startsWith('/objects/community/')) {
          return res.status(400).json({ 
            error: "Invalid image URL. Must be an object storage URL." 
          });
        }
        // CRITICAL: Update the database with the latest renderedImageUrl
        // This locks in the latest saved version
        await storage.updateCampaignImage(imageId, { renderedImageUrl });
        console.log(`[PUBLIC VISUAL] ✅ Updated image ${imageId} with LATEST renderedImageUrl: ${renderedImageUrl}`);
        finalRenderedImageUrl = renderedImageUrl;
      } else {
        // If no renderedImageUrl provided in request, check if image already has one
        if (!image.renderedImageUrl) {
          return res.status(400).json({ 
            error: "Image must have a rendered version before sharing. Please save the image first." 
          });
        }
        if (image.renderedImageUrl.startsWith('data:image')) {
          return res.status(400).json({ 
            error: "Image has invalid base64 URL. Please re-save the image to upload it to storage." 
          });
        }
        console.log(`[PUBLIC VISUAL] Using existing renderedImageUrl: ${image.renderedImageUrl}`);
      }

      // Update the project's public visual ID
      const updatedProject = await storage.updateProject(id, { publicVisualId: imageId });
      console.log(`[PUBLIC VISUAL] ✅ Set public visual for project ${id}: ${imageId} (renderedImageUrl: ${finalRenderedImageUrl})`);
      res.json(updatedProject);
    } catch (error: any) {
      console.error("Error setting public visual:", error);
      res.status(500).json({ error: error.message || "Failed to set public visual" });
    }
  });

  app.delete("/api/projects/:id/public-visual", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const { id } = req.params;

      // Get project to verify ownership
      const project = await storage.getProject(id);
      if (!project || project.userId !== user.id) {
        return res.status(403).json({ error: "Not authorized to modify this project" });
      }

      // Storage Expiry Logic:
      // - Public images (shared to community) have permanent storage
      // - Unshared images have 60-day retention
      // - When unsharing an image, it returns to 60-day retention logic
      // - If already past 60 days, it's automatically deleted upon unsharing

      let wasDeleted = false;
      const publicVisualId = project.publicVisualId;

      // Check if the image being unshared is older than 60 days and delete if necessary
      if (publicVisualId) {
        const image = await storage.getCampaignImage(publicVisualId);
        if (image) {
          const imageAge = Date.now() - new Date(image.createdAt).getTime();
          const sixtyDaysInMs = 60 * 24 * 60 * 60 * 1000;

          if (imageAge > sixtyDaysInMs) {
            // Image is older than 60 days - delete it immediately
            await storage.deleteCampaignImage(publicVisualId);
            wasDeleted = true;
            console.log(`Deleted image ${publicVisualId} as it exceeded 60-day retention period`);
          }
        }
      }

      // Remove the public visual ID (unshare from community)
      const updatedProject = await storage.updateProject(id, { publicVisualId: null });

      // Include deletion status in response
      res.json({ 
        ...updatedProject, 
        imageDeleted: wasDeleted 
      });
    } catch (error: any) {
      console.error("Error removing public visual:", error);
      res.status(500).json({ error: error.message || "Failed to remove public visual" });
    }
  });

  app.post("/api/projects/:id/like", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const { id } = req.params;

      // Check if project exists and is public
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      if (project.isPublic !== 1) {
        return res.status(403).json({ error: "Cannot like a private project" });
      }

      const like = await storage.likeProject(id, user.id);
      res.json({ success: true, like });
    } catch (error: any) {
      console.error("Error liking project:", error);
      res.status(500).json({ error: error.message || "Failed to like project" });
    }
  });

  app.delete("/api/projects/:id/like", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const { id } = req.params;

      const success = await storage.unlikeProject(id, user.id);
      res.json({ success });
    } catch (error: any) {
      console.error("Error unliking project:", error);
      res.status(500).json({ error: error.message || "Failed to unlike project" });
    }
  });

  app.get("/api/projects/:id/likes", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = await ensureUser(req);

      const likeCount = await storage.getProjectLikeCount(id);
      const isLiked = await storage.isProjectLikedByUser(id, user.id);

      res.json({ likeCount, isLiked });
    } catch (error: any) {
      console.error("Error fetching project likes:", error);
      res.status(500).json({ error: error.message || "Failed to fetch project likes" });
    }
  });

  app.get("/api/user/liked-projects", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const likedProjectIds = await storage.getUserLikedProjects(user.id);
      res.json({ likedProjectIds });
    } catch (error: any) {
      console.error("Error fetching user liked projects:", error);
      res.status(500).json({ error: error.message || "Failed to fetch liked projects" });
    }
  });

  app.post("/api/projects/:id/view", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if project exists and is public
      const project = await storage.getProject(id);
      if (!project || project.isPublic !== 1) {
        return res.status(404).json({ error: "Project not found" });
      }

      await storage.incrementProjectViewCount(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error incrementing view count:", error);
      res.status(500).json({ error: error.message || "Failed to increment view count" });
    }
  });

  // Duplicate a Community project (for "Use This Design")
  app.post("/api/community/projects/:id/duplicate", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);
      const { id } = req.params;

      // Get the source project
      const sourceProject = await storage.getProject(id);
      if (!sourceProject) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Verify the project is public
      if (sourceProject.isPublic !== 1) {
        return res.status(403).json({ error: "Can only duplicate public projects" });
      }

      // Get campaigns for the source project
      const sourceCampaigns = await storage.getProjectCampaigns(id);

      // Get original creator information for attribution
      const originalCreator = await storage.getUser(sourceProject.userId);

      // Get the high-quality rendered image URL from the public visual
      let thumbnailUrl: string | null = null;
      if (sourceProject.publicVisualId) {
        console.log(`[DUPLICATE] Source project publicVisualId: ${sourceProject.publicVisualId}`);
        const publicImage = await storage.getCampaignImage(sourceProject.publicVisualId);
        console.log(`[DUPLICATE] Public image found:`, publicImage ? 'YES' : 'NO');
        if (publicImage) {
          console.log(`[DUPLICATE] renderedImageUrl:`, publicImage.renderedImageUrl ? 'EXISTS' : 'NULL');
          if (publicImage.renderedImageUrl) {
            thumbnailUrl = publicImage.renderedImageUrl;
            console.log(`[DUPLICATE] ✅ Using high-quality rendered image: ${thumbnailUrl.substring(0, 50)}...`);
          }
        }
      }
      // Fallback to existing thumbnail if no rendered image available
      if (!thumbnailUrl) {
        thumbnailUrl = sourceProject.thumbnailUrl;
        console.log(`[DUPLICATE] ⚠️  Fallback to source thumbnailUrl (length: ${thumbnailUrl?.length || 0})`);
      }

      // Create a new project for the current user with source tracking
      const newProject = await storage.createProject({
        userId: user.id,
        name: `${sourceProject.name} (Community Copy)`,
        description: sourceProject.description,
        size: sourceProject.size,
        language: sourceProject.language,
        category: sourceProject.category,
        brandKit: undefined, // Will apply user's Brand Kit later
        source: 'community',
        originalProjectId: id,
        originalCreatorName: originalCreator?.displayName || 'Community User',
        originalPublishDate: sourceProject.updatedAt, // When it was last published/updated
        thumbnailUrl, // Copy the high-quality rendered image from community
      });

      console.log(`[DUPLICATE] Created new project ${newProject.id} from Community project ${id} (creator: ${originalCreator?.displayName})`);

      // Copy campaigns and campaign images
      for (const campaign of sourceCampaigns) {
        const newCampaign = await storage.createCampaign({
          projectId: newProject.id,
          headline: campaign.headline,
          subheadline: campaign.subheadline,
          description: campaign.description,
          hashtags: campaign.hashtags,
        });

        console.log(`[DUPLICATE] Created campaign ${newCampaign.id}`);

        // Get campaign images from source campaign
        const campaignImages = await storage.getCampaignImages(campaign.id);

        // Copy campaign images
        for (const image of campaignImages) {
          await storage.createCampaignImage({
            campaignId: newCampaign.id,
            imageUrl: image.imageUrl, // Copy the background image
            designOverride: image.designOverride as any,
            visualAnalysis: image.visualAnalysis as any,
            editMetadata: image.editMetadata as any, // Preserve edit metadata from source
            isSaved: 0, // New duplicate starts as unsaved
          });

          console.log(`[DUPLICATE] Created campaign image for campaign ${newCampaign.id}`);
        }
      }

      // Get the user's Brand Kit if available
      const userProjects = await storage.getProjects(user.id);
      let userBrandKit = null;

      // Find first project with a Brand Kit
      for (const project of userProjects) {
        if (project.brandKit && Object.keys(project.brandKit).length > 0) {
          userBrandKit = project.brandKit;
          break;
        }
      }

      // Apply Brand Kit to the new project if available
      if (userBrandKit) {
        await storage.updateProject(newProject.id, { brandKit: userBrandKit });
        console.log(`[DUPLICATE] Applied user's Brand Kit to project ${newProject.id}`);
      }

      res.json({ 
        projectId: newProject.id,
        message: "Project duplicated successfully",
        brandKitApplied: !!userBrandKit,
      });
    } catch (error: any) {
      console.error("Error duplicating community project:", error);
      res.status(500).json({ error: error.message || "Failed to duplicate project" });
    }
  });

  app.get("/api/subscription/status", async (req: Request, res: Response) => {
    try {
      const user = await ensureUser(req);

      if (!user.stripeSubscriptionId) {
        return res.json({ 
          hasSubscription: false,
          plan: null,
          status: null,
        });
      }

      if (!stripe) {
        return res.json({
          hasSubscription: true,
          plan: user.subscriptionPlan,
          status: user.subscriptionStatus,
        });
      }

      // Get latest subscription status from Stripe
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

      // Update local database with latest status
      await storage.updateUserSubscription(
        user.id,
        user.stripeCustomerId!,
        subscription.id,
        user.subscriptionPlan || 'starter',
        subscription.status
      );

      res.json({
        hasSubscription: true,
        plan: user.subscriptionPlan,
        status: subscription.status,
      });
    } catch (error: any) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ error: error.message || "Failed to fetch subscription status" });
    }
  });

  app.post("/api/subscription/cancel", async (req: Request, res: Response) => {
    try {
      if (!stripe) {
        return res.status(503).json({ error: "Payment processing is not configured." });
      }

      const user = await ensureUser(req);

      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ error: "No active subscription found" });
      }

      // Cancel subscription at period end
      const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      // Update database
      await storage.updateUserSubscription(
        user.id,
        user.stripeCustomerId!,
        subscription.id,
        user.subscriptionPlan || 'starter',
        'canceled'
      );

      res.json({ success: true, message: "Subscription will be canceled at the end of the billing period" });
    } catch (error: any) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ error: error.message || "Failed to cancel subscription" });
    }
  });

  // Update user profile (display name, photo)
  app.post("/api/update-profile", async (req: Request, res: Response) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { displayName } = req.body;

      if (!displayName || !displayName.trim()) {
        return res.status(400).json({ error: "Display name is required" });
      }

      const updatedUser = await storage.updateUserProfile(user.id, displayName.trim(), user.photoURL);

      if (!updatedUser) {
        return res.status(500).json({ error: "Failed to update profile" });
      }

      // Sync session data for email/password authenticated users
      if (req.session.userId === user.id) {
        req.session.userName = displayName.trim();
        console.log(`✅ Synced session userName for user ${user.id}: ${displayName.trim()}`);
      }

      res.json({ success: true, user: updatedUser });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: error.message || "Failed to update profile" });
    }
  });

  // Remove profile picture
  app.post("/api/remove-profile-image", async (req: Request, res: Response) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const updatedUser = await storage.updateUserProfile(user.id, user.displayName, null);

      if (!updatedUser) {
        return res.status(500).json({ error: "Failed to remove profile image" });
      }

      // Sync session data for email/password authenticated users
      if (req.session.userId === user.id) {
        req.session.photoURL = null;
        console.log(`✅ Cleared session photoURL for user ${user.id}`);
      }

      res.json({ success: true, user: updatedUser });
    } catch (error: any) {
      console.error("Error removing profile image:", error);
      res.status(500).json({ error: error.message || "Failed to remove profile image" });
    }
  });

  // ========================================
  // PROMO VIDEO ROUTES
  // ========================================

  /**
   * Create a new promo video configuration
   * POST /api/promo-videos
   */
  app.post("/api/promo-videos", async (req: Request, res: Response) => {
    try {
      // Try to get authenticated user, fallback to anonymous user
      const user = await getCurrentUser(req);

      const {
        projectId,
        sceneCount,
        sceneDescriptions, // Legacy: array of strings
        scenes: scenesInput, // New: array of {sceneIndex, description, imageUrl?}
        language,
        voiceType,
        musicStyle,
        useExistingVisuals,
      } = req.body;

      // Validate required fields (support both old and new format)
      if (!projectId || !sceneCount || (!sceneDescriptions && !scenesInput) || !language || !voiceType || !musicStyle) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Verify project ownership (allow anonymous user to use their own projects)
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Create promo video record
      const promoVideo = await storage.createPromoVideo({
        projectId,
        userId: user.id,
        status: 'draft',
        config: {
          sceneCount,
          language,
          voiceType,
          musicStyle,
          useExistingVisuals: useExistingVisuals || false,
        },
        videoUrl: null,
        customVoiceoverUrl: null,
        generationMetadata: null,
      });

      // Create scene records (support both formats)
      let scenePromises;
      if (scenesInput && Array.isArray(scenesInput)) {
        // New format: scenes array with optional imageUrl
        scenePromises = scenesInput.map((scene: any) =>
          storage.createPromoVideoScene({
            promoVideoId: promoVideo.id,
            sceneIndex: scene.sceneIndex,
            description: scene.description,
            imageRef: scene.imageRef || null,
            imageUrl: scene.imageUrl || null,
          })
        );
      } else {
        // Legacy format: sceneDescriptions array
        scenePromises = sceneDescriptions.map((description: string, index: number) =>
          storage.createPromoVideoScene({
            promoVideoId: promoVideo.id,
            sceneIndex: index,
            description,
            imageRef: null,
            imageUrl: null,
          })
        );
      }

      const scenes = await Promise.all(scenePromises);

      res.json({
        promoVideo,
        scenes,
        message: "Promo video configuration created successfully",
      });
    } catch (error: any) {
      console.error("Error creating promo video:", error);
      res.status(500).json({ error: error.message || "Failed to create promo video" });
    }
  });

  /**
   * Get promo video details
   * GET /api/promo-videos/:id
   */
  app.get("/api/promo-videos/:id", async (req: Request, res: Response) => {
    try {
      // Try to get authenticated user, fallback to anonymous user
      const user = await getCurrentUser(req);

      const { id } = req.params;

      const promoVideo = await storage.getPromoVideo(id);
      if (!promoVideo) {
        return res.status(404).json({ error: "Promo video not found" });
      }

      // Verify ownership (allow anonymous user to access their own videos)
      if (promoVideo.userId !== user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Return just the promoVideo object (frontend expects this structure)
      res.json(promoVideo);
    } catch (error: any) {
      console.error("Error fetching promo video:", error);
      res.status(500).json({ error: error.message || "Failed to fetch promo video" });
    }
  });

  /**
   * Generate video for a single promo video scene using Runware Seedance
   * POST /api/promo-videos/:id/scenes/:sceneIndex/generate
   */
  app.post("/api/promo-videos/:id/scenes/:sceneIndex/generate", async (req: Request, res: Response) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { id, sceneIndex } = req.params;
      const sceneIdx = parseInt(sceneIndex, 10);

      if (isNaN(sceneIdx) || sceneIdx < 0) {
        return res.status(400).json({ error: "Invalid scene index" });
      }

      // Verify promo video ownership
      const promoVideo = await storage.getPromoVideo(id);
      if (!promoVideo) {
        return res.status(404).json({ error: "Promo video not found" });
      }
      if (promoVideo.userId !== user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Get the specific scene
      const scene = await storage.getPromoVideoSceneByIndex(id, sceneIdx);
      if (!scene) {
        return res.status(404).json({ error: `Scene ${sceneIdx} not found` });
      }

      // Determine image URL (from scene.imageUrl or scene.imageRef)
      let imageUrl: string | null = null;
      if (scene.imageUrl) {
        imageUrl = scene.imageUrl;
      } else if (scene.imageRef) {
        const visual = await storage.getVisual(scene.imageRef);
        if (!visual) {
          return res.status(400).json({ error: `Visual not found for scene ${sceneIdx}` });
        }
        imageUrl = visual.imageUrl;
      }

      if (!imageUrl) {
        return res.status(400).json({ error: `No image source for scene ${sceneIdx}` });
      }

      // Convert relative paths to full HTTPS URLs (respect proxy headers)
      let fullImageUrl = imageUrl;
      if (imageUrl.startsWith('/') || !imageUrl.startsWith('http')) {
        const protocol = req.get('x-forwarded-proto') || req.protocol;
        const host = req.get('host');
        fullImageUrl = `${protocol}://${host}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
      }

      // Get configuration from request body or use defaults
      const { duration = 5.0, animationPrompt, resolutionKey = '16x9_1080' } = req.body;

      // Validate duration
      if (duration < 1.2 || duration > 12) {
        return res.status(400).json({ error: "Duration must be between 1.2 and 12 seconds" });
      }

      // Validate resolution key (CRITICAL: Reject invalid keys for promo videos)
      const { QUICKCLIP_RESOLUTIONS } = await import('@shared/quickclip-utils');
      const resolution = QUICKCLIP_RESOLUTIONS.find((r: any) => r.key === resolutionKey);
      if (!resolution) {
        return res.status(400).json({ 
          error: `Invalid resolutionKey: ${resolutionKey}. Must be one of: ${QUICKCLIP_RESOLUTIONS.map((r: any) => r.key).join(', ')}` 
        });
      }

      // Use animation prompt from request, or scene description, or default
      const finalAnimationPrompt = animationPrompt || scene.description || "Smooth cinematic motion";

      console.log(`[PromoVideo Scene] Generating video for scene ${sceneIdx}...`);
      console.log(`[PromoVideo Scene] Image URL: ${fullImageUrl}`);
      console.log(`[PromoVideo Scene] Duration: ${duration}s`);
      console.log(`[PromoVideo Scene] Resolution: ${resolution.width}x${resolution.height}`);

      // Generate video using shared Seedance helper
      const { generateSeedanceVideo } = await import('./services/runwareService');
      const { taskUUID } = await generateSeedanceVideo(
        fullImageUrl,
        duration,
        finalAnimationPrompt,
        resolution.width,
        resolution.height
      );

      // Update scene with Runware tracking info
      await storage.updatePromoVideoScene(scene.id, {
        runwareTaskUUID: taskUUID,
        status: 'generating',
        resolutionKey: resolution.key,
      });

      // Update parent promo video status to reflect scene generation
      await storage.updatePromoVideo(id, { status: 'generating' });

      console.log(`[PromoVideo Scene] Video generation initiated: ${taskUUID}`);

      res.json({
        success: true,
        taskUUID,
        sceneIndex: sceneIdx,
        message: `Scene ${sceneIdx} video generation started`,
      });
    } catch (error: any) {
      console.error('[PromoVideo Scene] Generation failed:', error);
      res.status(500).json({
        error: 'Failed to start scene video generation',
        details: error.message,
      });
    }
  });

  /**
   * Generate videos for all promo video scenes (batch operation)
   * POST /api/promo-videos/:id/generate-all-scenes
   */
  app.post("/api/promo-videos/:id/generate-all-scenes", async (req: Request, res: Response) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { id } = req.params;

      // Verify promo video ownership
      const promoVideo = await storage.getPromoVideo(id);
      if (!promoVideo) {
        return res.status(404).json({ error: "Promo video not found" });
      }
      if (promoVideo.userId !== user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Get all scenes
      const scenes = await storage.getPromoVideoScenes(id);
      if (scenes.length === 0) {
        return res.status(400).json({ error: "No scenes found for this promo video" });
      }

      // Get configuration from request body or use defaults
      const { duration = 5.0, resolutionKey = '16x9_1080' } = req.body;

      // Validate resolution key (CRITICAL: Reject invalid keys for promo videos)
      const { QUICKCLIP_RESOLUTIONS } = await import('@shared/quickclip-utils');
      const resolution = QUICKCLIP_RESOLUTIONS.find((r: any) => r.key === resolutionKey);
      if (!resolution) {
        return res.status(400).json({ 
          error: `Invalid resolutionKey: ${resolutionKey}. Must be one of: ${QUICKCLIP_RESOLUTIONS.map((r: any) => r.key).join(', ')}` 
        });
      }

      // Import Seedance generator
      const { generateSeedanceVideo } = await import('./services/runwareService');

      // Update parent promo video status to generating
      await storage.updatePromoVideo(id, { status: 'generating' });

      console.log(`[PromoVideo Batch] Generating videos for ${scenes.length} scenes...`);

      // Generate video for each scene
      const results = await Promise.allSettled(
        scenes.map(async (scene) => {
          try {
            // Determine image URL
            let imageUrl: string | null = null;
            if (scene.imageUrl) {
              imageUrl = scene.imageUrl;
            } else if (scene.imageRef) {
              const visual = await storage.getVisual(scene.imageRef);
              if (visual) {
                imageUrl = visual.imageUrl;
              }
            }

            if (!imageUrl) {
              throw new Error(`No image source for scene ${scene.sceneIndex}`);
            }

            // Convert relative paths to full HTTPS URLs (respect proxy headers)
            let fullImageUrl = imageUrl;
            if (imageUrl.startsWith('/') || !imageUrl.startsWith('http')) {
              const protocol = req.get('x-forwarded-proto') || req.protocol;
              const host = req.get('host');
              fullImageUrl = `${protocol}://${host}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
            }

            const animationPrompt = scene.description || "Smooth cinematic motion";

            // Generate video
            const { taskUUID } = await generateSeedanceVideo(
              fullImageUrl,
              duration,
              animationPrompt,
              resolution.width,
              resolution.height
            );

            // Update scene
            await storage.updatePromoVideoScene(scene.id, {
              runwareTaskUUID: taskUUID,
              status: 'generating',
              resolutionKey: resolution.key,
            });

            return { sceneIndex: scene.sceneIndex, sceneId: scene.id, taskUUID };
          } catch (error: any) {
            // CRITICAL: Mark scene as failed in database so it doesn't get stuck
            await storage.updatePromoVideoScene(scene.id, {
              status: 'failed',
            });
            throw error; // Re-throw to be caught by Promise.allSettled
          }
        })
      );

      // Collect successes and failures
      const successes: any[] = [];
      const failures: any[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successes.push(result.value);
        } else {
          failures.push({
            sceneIndex: scenes[index].sceneIndex,
            sceneId: scenes[index].id,
            error: result.reason.message,
          });
        }
      });

      console.log(`[PromoVideo Batch] Generated: ${successes.length} success, ${failures.length} failed`);

      res.json({
        success: true,
        totalScenes: scenes.length,
        generated: successes.length,
        failed: failures.length,
        scenes: successes,
        errors: failures.length > 0 ? failures : undefined,
      });
    } catch (error: any) {
      console.error('[PromoVideo Batch] Generation failed:', error);
      res.status(500).json({
        error: 'Failed to start batch scene generation',
        details: error.message,
      });
    }
  });

  /**
   * Get status of all promo video scenes (unified polling endpoint with auto-save)
   * GET /api/promo-videos/:id/scenes/status
   * 
   * This endpoint actively polls Runware for completion and auto-saves finished videos
   */
  app.get("/api/promo-videos/:id/scenes/status", async (req: Request, res: Response) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { id } = req.params;

      // Verify ownership
      const promoVideo = await storage.getPromoVideo(id);
      if (!promoVideo) {
        return res.status(404).json({ error: "Promo video not found" });
      }
      if (promoVideo.userId !== user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Get all scenes
      const scenes = await storage.getPromoVideoScenes(id);

      // Check Runware status for scenes that are still generating
      const generatingScenes = scenes.filter(s => s.status === 'generating' && s.runwareTaskUUID);
      
      if (generatingScenes.length > 0) {
        const axios = (await import('axios')).default;
        const RUNWARE_API_KEY = process.env.RUNWARE_API_KEY;

        // Poll Runware for each generating scene
        await Promise.allSettled(
          generatingScenes.map(async (scene) => {
            try {
              const statusResponse = await axios.post(
                'https://api.runware.ai/v1',
                [{
                  taskType: 'getResponse',
                  taskUUID: scene.runwareTaskUUID,
                }],
                {
                  headers: {
                    'Authorization': `Bearer ${RUNWARE_API_KEY}`,
                    'Content-Type': 'application/json',
                  },
                }
              );

              const taskData = statusResponse.data?.data?.[0];
              
              // FIX: Runware returns 'status' and 'videoUUID', not 'taskStatus' and 'videoURL'
              if (taskData?.status === 'success' && taskData?.videoUUID) {
                const videoURL = `https://vm.runware.ai/video/ws/0/vi/${taskData.videoUUID}.mp4`;
                console.log(`[PromoVideo Scene] Video completed: ${videoURL}`);
                
                // Update scene with completed video
                await storage.updatePromoVideoScene(scene.id, {
                  status: 'success',
                  sceneVideoUrl: videoURL,
                  cost: taskData.cost ? Math.round(taskData.cost * 100) : null, // Convert dollars to cents
                });

                // Log API usage
                if (taskData.cost) {
                  await storage.createApiUsage({
                    userId: user.id,
                    apiProvider: 'runware',
                    endpoint: 'videoInference',
                    model: 'bytedance:2@2',
                    cost: Math.round(taskData.cost * 100),
                    metadata: JSON.stringify({
                      taskUUID: scene.runwareTaskUUID,
                      promoVideoId: id,
                      sceneIndex: scene.sceneIndex,
                    }),
                  });
                }
                
                console.log(`[PromoVideo Scene] Scene ${scene.sceneIndex} auto-saved successfully`);
              } else if (taskData?.status === 'failed') {
                console.error(`[PromoVideo Scene] Video generation failed: ${scene.runwareTaskUUID}`);
                await storage.updatePromoVideoScene(scene.id, {
                  status: 'failed',
                });
              }
            } catch (pollError: any) {
              console.error(`[PromoVideo Scene] Polling error for ${scene.runwareTaskUUID}:`, pollError.message);
              // Don't mark as failed - might be temporary network issue
            }
          })
        );

        // Re-fetch scenes after updates
        const updatedScenes = await storage.getPromoVideoScenes(id);
        
        // Map scenes to status objects
        const sceneStatuses = updatedScenes.map(scene => ({
          sceneIndex: scene.sceneIndex,
          sceneId: scene.id,
          status: scene.status || 'pending',
          taskUUID: scene.runwareTaskUUID || null,
          videoUrl: scene.sceneVideoUrl || null,
          resolutionKey: scene.resolutionKey || null,
          cost: scene.cost || null,
        }));

        // Calculate aggregate statistics
        const totalScenes = updatedScenes.length;
        const pending = sceneStatuses.filter(s => s.status === 'pending').length;
        const generating = sceneStatuses.filter(s => s.status === 'generating').length;
        const success = sceneStatuses.filter(s => s.status === 'success').length;
        const failed = sceneStatuses.filter(s => s.status === 'failed').length;

        const allComplete = (success + failed) === totalScenes;
        const allSuccess = success === totalScenes;

        return res.json({
          promoVideoId: id,
          totalScenes,
          aggregate: {
            pending,
            generating,
            success,
            failed,
            allComplete,
            allSuccess,
          },
          scenes: sceneStatuses,
        });
      }

      // No scenes generating - return current state
      const sceneStatuses = scenes.map(scene => ({
        sceneIndex: scene.sceneIndex,
        sceneId: scene.id,
        status: scene.status || 'pending',
        taskUUID: scene.runwareTaskUUID || null,
        videoUrl: scene.sceneVideoUrl || null,
        resolutionKey: scene.resolutionKey || null,
        cost: scene.cost || null,
      }));

      const totalScenes = scenes.length;
      const pending = sceneStatuses.filter(s => s.status === 'pending').length;
      const generating = sceneStatuses.filter(s => s.status === 'generating').length;
      const success = sceneStatuses.filter(s => s.status === 'success').length;
      const failed = sceneStatuses.filter(s => s.status === 'failed').length;

      const allComplete = (success + failed) === totalScenes;
      const allSuccess = success === totalScenes;

      res.json({
        promoVideoId: id,
        totalScenes,
        aggregate: {
          pending,
          generating,
          success,
          failed,
          allComplete,
          allSuccess,
        },
        scenes: sceneStatuses,
      });
    } catch (error: any) {
      console.error('[PromoVideo Scene Status] Query failed:', error);
      res.status(500).json({
        error: 'Failed to fetch scene statuses',
        details: error.message,
      });
    }
  });

  /**
   * Generate promotional video (Option A: Runware → FFmpeg)
   * POST /api/promo-videos/:id/generate
   * 
   * Flow:
   * 1. Generate each scene video using Runware Seedance API
   * 2. Poll until all scene videos are complete
   * 3. Concatenate scene videos using FFmpeg
   * 4. Add voiceover/music if configured
   * 5. Return final promotional video
   */
  app.post("/api/promo-videos/:id/generate", async (req: Request, res: Response) => {
    let tempFiles: string[] = []; // Track temp files for cleanup

    try {
      // Authenticate user
      const user = await getCurrentUser(req);

      const { id } = req.params;

      // Get promo video configuration
      const promoVideo = await storage.getPromoVideo(id);
      if (!promoVideo) {
        return res.status(404).json({ error: "Promo video not found" });
      }

      // Verify ownership
      if (promoVideo.userId !== user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Get scenes
      const scenes = await storage.getPromoVideoScenes(id);
      if (scenes.length === 0) {
        return res.status(400).json({ error: "No scenes found for this promo video" });
      }

      // Update status to generating
      await storage.updatePromoVideo(id, { status: 'generating' });

      console.log(`[PromoVideo Unified] Starting generation for video ${id} with ${scenes.length} scenes`);
      const startTime = Date.now();

      // ═══════════════════════════════════════════════════════════
      // STEP 1: Generate scene videos using Runware Seedance
      // ═══════════════════════════════════════════════════════════
      console.log(`[PromoVideo Unified] Step 1: Generating scene videos with Runware...`);
      
      // Get resolution from promo video config (default to 3:4 720p if not set)
      // Note: videoResolution not yet in schema, will use default
      const videoResolution = '3x4_480'; // Optimized for faster generation (was 720p)
      const sceneDuration = 3.0; // 3 seconds per scene (optimized for faster generation)
      
      // Import Runware video generation helper
      const { generateSeedanceVideo } = await import('./services/runwareService');
      const axios = (await import('axios')).default;
      
      // Generate videos for all scenes in parallel
      const sceneGenerationResults = await Promise.allSettled(
        scenes.map(async (scene) => {
          try {
            // Determine image URL
            let imageUrl: string | null = null;
            if (scene.imageUrl) {
              imageUrl = scene.imageUrl;
            } else if (scene.imageRef) {
              const visual = await storage.getVisual(scene.imageRef);
              if (visual) {
                imageUrl = visual.imageUrl;
              }
            }

            if (!imageUrl) {
              throw new Error(`No image source for scene ${scene.sceneIndex}`);
            }

            // Convert relative paths to full HTTPS URLs
            let fullImageUrl = imageUrl;
            if (imageUrl.startsWith('/') || !imageUrl.startsWith('http')) {
              const protocol = req.get('x-forwarded-proto') || req.protocol;
              const host = req.get('host');
              fullImageUrl = `${protocol}://${host}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
            }

            // Get resolution mapping
            const { QUICKCLIP_RESOLUTIONS } = await import('@shared/quickclip-utils');
            const resolution = QUICKCLIP_RESOLUTIONS.find((r: any) => r.key === videoResolution);
            if (!resolution) {
              throw new Error(`Invalid resolution: ${videoResolution}`);
            }

            const animationPrompt = scene.description || "Smooth cinematic motion";

            // Generate video using Runware
            const { taskUUID } = await generateSeedanceVideo(
              fullImageUrl,
              sceneDuration,
              animationPrompt,
              resolution.width,
              resolution.height
            );

            // Update scene with task UUID
            await storage.updatePromoVideoScene(scene.id, {
              runwareTaskUUID: taskUUID,
              status: 'generating',
              resolutionKey: videoResolution,
            });

            console.log(`[PromoVideo Unified] Scene ${scene.sceneIndex} generation started: ${taskUUID}`);
            return { sceneIndex: scene.sceneIndex, sceneId: scene.id, taskUUID };
          } catch (error: any) {
            // Mark scene as failed
            await storage.updatePromoVideoScene(scene.id, { status: 'failed' });
            throw error;
          }
        })
      );

      // Check for failures
      const failures = sceneGenerationResults.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        throw new Error(`Failed to generate ${failures.length} scene(s): ${failures.map((f: any) => f.reason?.message).join(', ')}`);
      }

      console.log(`[PromoVideo Unified] All scene generation tasks initiated`);

      // 🎯 CREATE VISUAL RECORD IMMEDIATELY (for placeholder display)
      const visual = await storage.createVisual({
        projectId: promoVideo.projectId,
        type: 'promovideo',
        mediaType: 'video',
        status: 'generating',
        prompt: null,
        imageUrl: null,
        videoUrl: null,
        metadata: {
          promoVideoId: id,
          sceneCount: scenes.length,
          videoResolution,
        },
      });

      console.log(`[PromoVideo Unified] Visual record created: ${visual.id}`);

      // 🚀 RETURN IMMEDIATELY - Background polling will continue asynchronously
      res.json({
        promoVideo: {
          ...promoVideo,
          status: 'generating',
        },
        visualId: visual.id,
        message: 'Video generation started. Poll /api/promo-videos/:id for status updates.',
      });

      // ═══════════════════════════════════════════════════════════
      // STEP 2: Poll for scene video completion (ASYNC - non-blocking)
      // ═══════════════════════════════════════════════════════════
      (async () => {
        try {
          console.log(`[PromoVideo Unified] Step 2: Polling for scene completion (background)...`);
          
          const RUNWARE_API_KEY = process.env.RUNWARE_API_KEY;
          const MAX_POLL_TIME = 600000; // 10 minutes max (increased from 5)
          const POLL_INTERVAL = 3000; // Poll every 3 seconds
          const pollStartTime = Date.now();
          
          let allComplete = false;
          let completedScenes: any[] = [];

          while (!allComplete && (Date.now() - pollStartTime) < MAX_POLL_TIME) {
            // Re-fetch scenes from database
            const updatedScenes = await storage.getPromoVideoScenes(id);
            const generatingScenes = updatedScenes.filter(s => s.status === 'generating' && s.runwareTaskUUID);

            const elapsedSeconds = Math.floor((Date.now() - pollStartTime) / 1000);
            console.log(`[PromoVideo Poll] ${elapsedSeconds}s elapsed - ${generatingScenes.length}/${updatedScenes.length} scenes still generating`);

            if (generatingScenes.length === 0) {
              // All scenes are done (either success or failed)
              allComplete = true;
              completedScenes = updatedScenes;
              console.log(`[PromoVideo Poll] All scenes complete! Moving to video concatenation...`);
              break;
            }

            // Poll Runware for each generating scene
            await Promise.allSettled(
              generatingScenes.map(async (scene) => {
                try {
                  const statusResponse = await axios.post(
                    'https://api.runware.ai/v1',
                    [{
                      taskType: 'getResponse',
                      taskUUID: scene.runwareTaskUUID,
                    }],
                    {
                      headers: {
                        'Authorization': `Bearer ${RUNWARE_API_KEY}`,
                        'Content-Type': 'application/json',
                      },
                    }
                  );

                  const taskData = statusResponse.data?.data?.[0];
                  
                  // Enhanced logging to debug Runware responses
                  if (elapsedSeconds === 6 || elapsedSeconds === 30 || elapsedSeconds === 60 || elapsedSeconds === 120) {
                    console.log(`[PromoVideo Debug] Scene ${scene.sceneIndex} status check:`, {
                      status: taskData?.status,
                      hasVideoUUID: !!taskData?.videoUUID,
                      taskUUID: scene.runwareTaskUUID,
                      fullResponse: JSON.stringify(statusResponse.data).substring(0, 300)
                    });
                  }
                  
                  // FIX: Runware returns 'status' and 'videoUUID', not 'taskStatus' and 'videoURL'
                  if (taskData?.status === 'success' && taskData?.videoUUID) {
                    // Update scene with completed video (convert videoUUID to full URL)
                    const videoURL = `https://vm.runware.ai/video/ws/0/vi/${taskData.videoUUID}.mp4`;
                    await storage.updatePromoVideoScene(scene.id, {
                      status: 'success',
                      sceneVideoUrl: videoURL,
                      cost: taskData.cost ? Math.round(taskData.cost * 100) : null,
                    });

                    // Log API usage
                    if (taskData.cost) {
                      await storage.createApiUsage({
                        userId: user.id,
                        apiProvider: 'runware',
                        endpoint: 'videoInference',
                        model: 'bytedance:2@2',
                        cost: Math.round(taskData.cost * 100),
                        metadata: JSON.stringify({
                          taskUUID: scene.runwareTaskUUID,
                          promoVideoId: id,
                          sceneIndex: scene.sceneIndex,
                        }),
                      });
                    }
                    
                    console.log(`[PromoVideo Unified] ✅ Scene ${scene.sceneIndex} completed: ${videoURL}`);
                  } else if (taskData?.status === 'failed') {
                    await storage.updatePromoVideoScene(scene.id, { status: 'failed' });
                    console.error(`[PromoVideo Unified] ❌ Scene ${scene.sceneIndex} failed`);
                  } else if (taskData?.status === 'processing' || taskData?.status === 'pending') {
                    // Still processing - this is expected
                    if (elapsedSeconds % 30 === 0) {
                      console.log(`[PromoVideo Poll] Scene ${scene.sceneIndex} still ${taskData.status}...`);
                    }
                  } else {
                    // Unexpected status
                    if (elapsedSeconds % 60 === 0) {
                      console.warn(`[PromoVideo Poll] Scene ${scene.sceneIndex} unexpected status:`, taskData?.status);
                    }
                  }
                } catch (pollError: any) {
                  console.error(`[PromoVideo Unified] Polling error for scene ${scene.sceneIndex}:`, pollError.message);
                }
              })
            );

            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
          }

          if (!allComplete) {
            // Timeout - mark as failed
            await storage.updatePromoVideo(id, { 
              status: 'failed',
              generationMetadata: JSON.stringify({ errorMessage: 'Scene generation timeout - videos did not complete within 10 minutes' }),
            });
            await storage.updateVisual(visual.id, { status: 'failed' });
            console.error(`[PromoVideo Unified] Generation timeout after ${MAX_POLL_TIME}ms`);
            return;
          }

          // Check if all scenes succeeded
          const successfulScenes = completedScenes.filter(s => s.status === 'success');
          const failedScenes = completedScenes.filter(s => s.status === 'failed');

          if (failedScenes.length > 0) {
            await storage.updatePromoVideo(id, { 
              status: 'failed',
              generationMetadata: JSON.stringify({ errorMessage: `${failedScenes.length} scene(s) failed to generate` }),
            });
            await storage.updateVisual(visual.id, { status: 'failed' });
            console.error(`[PromoVideo Unified] ${failedScenes.length} scenes failed`);
            return;
          }

          if (successfulScenes.length !== scenes.length) {
            await storage.updatePromoVideo(id, { 
              status: 'failed',
              generationMetadata: JSON.stringify({ errorMessage: `Only ${successfulScenes.length}/${scenes.length} scenes completed successfully` }),
            });
            await storage.updateVisual(visual.id, { status: 'failed' });
            console.error(`[PromoVideo Unified] Only ${successfulScenes.length}/${scenes.length} scenes completed`);
            return;
          }

          console.log(`[PromoVideo Unified] All ${successfulScenes.length} scene videos generated successfully`);

      // ═══════════════════════════════════════════════════════════
      // STEP 3: Generate voiceover (if needed)
      // ═══════════════════════════════════════════════════════════
      console.log(`[PromoVideo Unified] Step 3: Preparing voiceover...`);
      
      let voiceoverPath: string | undefined;
      if (!promoVideo.customVoiceoverUrl) {
        try {
          const fullScript = completedScenes.map((s: any, idx: number) => `Scene ${idx + 1}: ${s.description}`).join('. ');
          voiceoverPath = await ttsService.generateVoiceover(
            fullScript,
            promoVideo.config.language,
            promoVideo.config.voiceType
          );
          console.log(`[PromoVideo Unified] Voiceover generated: ${voiceoverPath}`);
        } catch (error) {
          console.error('[PromoVideo Unified] Voiceover generation failed:', error);
          // Continue without voiceover if TTS fails
        }
      } else {
        voiceoverPath = promoVideo.customVoiceoverUrl;
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 4: Download scene videos and concatenate with FFmpeg
      // ═══════════════════════════════════════════════════════════
      console.log(`[PromoVideo Unified] Step 4: Downloading scene videos and concatenating...`);
      
      // Download scene videos to temp files
      const fs = await import('fs/promises');
      const path = await import('path');
      
      // Defensive check: ensure all scenes have video URLs
      const missingVideos = completedScenes.filter((s: any) => !s.sceneVideoUrl);
      if (missingVideos.length > 0) {
        throw new Error(`${missingVideos.length} scene(s) are missing video URLs`);
      }
      
      const sceneVideoPaths: string[] = await Promise.all(
        completedScenes.map(async (scene) => {
          const videoUrl = scene.sceneVideoUrl!; // Safe after defensive check

          // Download video to temp file
          const tempPath = path.join(process.cwd(), 'uploads', `temp-scene-video-${scene.sceneIndex}-${Date.now()}.mp4`);
          
          const response = await axios.get(videoUrl, { responseType: 'arraybuffer' });
          await fs.writeFile(tempPath, response.data);
          
          tempFiles.push(tempPath); // Track for cleanup
          console.log(`[PromoVideo Unified] Downloaded scene ${scene.sceneIndex} video: ${tempPath}`);
          
          return tempPath;
        })
      );

      // Prepare output paths
      const videoOnlyPath = path.join(
        process.cwd(),
        'uploads',
        `promo-video-no-audio-${id}-${Date.now()}.mp4`
      );
      const finalOutputPath = path.join(
        process.cwd(),
        'uploads',
        `promo-video-${id}-${Date.now()}.mp4`
      );

      // Concatenate videos with crossfade transitions using new function
      console.log(`[PromoVideo Unified] Concatenating ${sceneVideoPaths.length} scene videos with transitions...`);
      await videoService.concatenateVideosWithTransitions(
        sceneVideoPaths,
        videoOnlyPath,
        0.5 // 0.5 second crossfade transition
      );
      tempFiles.push(videoOnlyPath); // Track for cleanup

      console.log(`[PromoVideo Unified] Videos concatenated successfully`);

      // ═══════════════════════════════════════════════════════════
      // STEP 5: Generate background music using Runware audioInference
      // ═══════════════════════════════════════════════════════════
      console.log(`[PromoVideo Unified] Step 5: Generating background music...`);
      
      let musicPath: string | null = null;
      const totalDuration = completedScenes.length * sceneDuration;
      
      try {
        const { generateBackgroundMusic, pollMusicGenerationStatus } = await import('./services/runwareService');
        
        // Convert music style to prompt (e.g., "calm" -> "calm ambient music")
        const musicPrompts: Record<string, string> = {
          calm: 'calm ambient music',
          modern: 'modern upbeat music',
          corporate: 'inspiring corporate music',
          soft: 'soft gentle music',
          energetic: 'energetic upbeat music',
        };
        const musicPrompt = musicPrompts[promoVideo.config.musicStyle] || 'calm ambient music';

        console.log(`[PromoVideo Unified] Music prompt: "${musicPrompt}", Duration: ${totalDuration}s`);
        
        const { taskUUID: musicTaskUUID } = await generateBackgroundMusic(
          musicPrompt,
          totalDuration
        );

        // Poll for music generation completion (max 2 minutes)
        const musicPollStart = Date.now();
        const MUSIC_POLL_MAX_TIME = 120000; // 2 minutes
        const MUSIC_POLL_INTERVAL = 3000; // 3 seconds

        while (Date.now() - musicPollStart < MUSIC_POLL_MAX_TIME) {
          const musicStatus = await pollMusicGenerationStatus(musicTaskUUID);
          
          if (musicStatus.status === 'success' && musicStatus.audioURL) {
            console.log(`[PromoVideo Unified] Music generated successfully: ${musicStatus.audioURL}`);
            
            // Download music to temp file
            const tempMusicPath = path.join(process.cwd(), 'uploads', `temp-music-${id}-${Date.now()}.mp3`);
            const musicResponse = await axios.get(musicStatus.audioURL, { responseType: 'arraybuffer' });
            await fs.writeFile(tempMusicPath, musicResponse.data);
            tempFiles.push(tempMusicPath);
            musicPath = tempMusicPath;
            
            // Log API usage for music
            if (musicStatus.cost) {
              await storage.createApiUsage({
                userId: user.id,
                apiProvider: 'runware',
                endpoint: 'audioInference',
                model: 'elevenlabs:1@1',
                cost: Math.round(musicStatus.cost * 100),
                metadata: JSON.stringify({
                  taskUUID: musicTaskUUID,
                  promoVideoId: id,
                  duration: totalDuration,
                }),
              });
            }
            break;
          } else if (musicStatus.status === 'failed') {
            console.error(`[PromoVideo Unified] Music generation failed:`, musicStatus.error);
            break;
          }
          
          await new Promise(resolve => setTimeout(resolve, MUSIC_POLL_INTERVAL));
        }

        if (!musicPath) {
          console.warn('[PromoVideo Unified] Music generation timeout or failed - continuing without music');
        }
      } catch (musicError: any) {
        console.error('[PromoVideo Unified] Music generation error:', musicError.message);
        // Continue without music if generation fails
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 6: Add audio tracks (voiceover + music) to final video
      // ═══════════════════════════════════════════════════════════
      console.log(`[PromoVideo Unified] Step 6: Adding audio tracks...`);
      
      await videoService.addAudioTracksToVideo(
        videoOnlyPath,
        voiceoverPath || null,
        musicPath,
        finalOutputPath
      );

      console.log(`[PromoVideo Unified] Final video generated: ${finalOutputPath}`);

      // ═══════════════════════════════════════════════════════════
      // STEP 7: Upload to object storage
      // ═══════════════════════════════════════════════════════════
      console.log(`[PromoVideo Unified] Step 7: Uploading final video to object storage...`);
      const videoBuffer = await fs.readFile(finalOutputPath);
      
      const localStorageService = new LocalFileStorageService();
      const videoUrl = await localStorageService.uploadPromoVideo(videoBuffer, id);
      
      const sizeInMB = (videoBuffer.length / (1024 * 1024)).toFixed(2);
      console.log(`[PromoVideo Unified] ✅ Uploaded final video: ${videoUrl} (${sizeInMB} MB)`);
      
      // Clean up local file
      await fs.unlink(finalOutputPath);
      tempFiles = tempFiles.filter(f => f !== finalOutputPath); // Remove from cleanup list
      
      // ═══════════════════════════════════════════════════════════
      // STEP 8: Finalize and update database
      // ═══════════════════════════════════════════════════════════
      const generationTime = (Date.now() - startTime) / 1000;
      
      // Calculate total cost from all scenes (music cost already logged to API usage)
      const totalCost = completedScenes.reduce((sum: number, scene: any) => {
        return sum + (scene.cost || 0);
      }, 0);

      await storage.updatePromoVideo(id, {
        status: 'completed',
        videoUrl,
        generationMetadata: {
          duration: completedScenes.length * sceneDuration,
          resolution: videoResolution,
          cost: totalCost,
          apiProvider: 'runware+ffmpeg+audio',
        },
      });

      console.log(`[PromoVideo Unified] ✅ Generation completed in ${generationTime}s (Total cost: ${totalCost} cents)`);

      // ═══════════════════════════════════════════════════════════
      // STEP 9: Update Visual placeholder to completed
      // ═══════════════════════════════════════════════════════════
      try {
        await storage.updateVisual(visual.id, {
          status: 'completed',
          videoUrl,
          prompt: completedScenes.map((s: any) => s.description).join(' | '),
          metadata: {
            promoVideoId: id,
            sceneCount: completedScenes.length,
            duration: completedScenes.length * sceneDuration,
            cost: totalCost,
            hasMusic: !!musicPath,
            hasVoiceover: !!voiceoverPath,
          },
        });
        console.log(`[PromoVideo Unified] ✅ Visual placeholder updated to completed: ${visual.id}`);
      } catch (visualError: any) {
        console.error(`[PromoVideo Unified] Failed to update visual record:`, visualError.message);
        // Don't fail the whole request if visual update fails
      }

          // Cleanup temp files
          const tempFilesLocal: string[] = []; // Track in async context
          for (const tempFile of tempFilesLocal) {
            try {
              const fs = await import('fs/promises');
              await fs.unlink(tempFile);
              console.log(`[PromoVideo] Cleaned up temp file: ${tempFile}`);
            } catch (cleanupError) {
              console.warn(`[PromoVideo] Failed to cleanup temp file ${tempFile}:`, cleanupError);
            }
          }

          // Update visual record to completed
          await storage.updatePromoVideo(id, {
            status: 'completed',
            videoUrl,
          });
          
          console.log(`[PromoVideo Unified] ✅ Background generation completed`);
        } catch (bgError: any) {
          console.error("[PromoVideo Unified] ❌ Background generation failed:", bgError);

          // Update visual placeholder to failed status
          try {
            await storage.updateVisual(visual.id, {
              status: 'failed',
              metadata: {
                promoVideoId: id,
                sceneCount: scenes.length,
                errorMessage: bgError.message,
              },
            });
            await storage.updatePromoVideo(id, {
              status: 'failed',
              generationMetadata: {
                errorMessage: bgError.message,
              },
            });
            console.log(`[PromoVideo Unified] Updated visual and video to failed status`);
          } catch (updateError) {
            console.error("[PromoVideo Unified] Failed to update failed status:", updateError);
          }
        }
      })(); // End async IIFE - runs in background
      
    } catch (error: any) {
      console.error("[PromoVideo Unified] ❌ Initial generation failed:", error);

      // Update status to failed
      try {
        await storage.updatePromoVideo(req.params.id, {
          status: 'failed',
          generationMetadata: JSON.stringify({
            errorMessage: error.message,
          }),
        });
      } catch (updateError) {
        console.error("[PromoVideo Unified] Failed to update video status:", updateError);
      }

      res.status(500).json({ error: error.message || "Failed to start promo video generation" });
    }
  });

  /**
   * List promo videos for a project
   * GET /api/projects/:projectId/promo-videos
   */
  app.get("/api/projects/:projectId/promo-videos", async (req: Request, res: Response) => {
    try {
      // Try to get authenticated user, fallback to anonymous user
      const user = await getCurrentUser(req);

      const { projectId } = req.params;

      // Verify project ownership (allow anonymous user to list their own videos)
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const promoVideos = await storage.getPromoVideosByProject(projectId);

      res.json({ promoVideos });
    } catch (error: any) {
      console.error("Error fetching promo videos:", error);
      res.status(500).json({ error: error.message || "Failed to fetch promo videos" });
    }
  });

  /**
   * Upload custom voiceover audio
   * POST /api/upload/voiceover
   */
  app.post("/api/upload/voiceover", upload.single('voiceover'), async (req: Request, res: Response) => {
    try {
      // Try to get authenticated user, fallback to anonymous user
      const user = await getCurrentUser(req);

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { promoVideoId } = req.body;
      if (!promoVideoId) {
        return res.status(400).json({ error: "Missing promoVideoId" });
      }

      // Verify ownership (allow anonymous user to upload to their own videos)
      const promoVideo = await storage.getPromoVideo(promoVideoId);
      if (!promoVideo || promoVideo.userId !== user.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Use local file path for voiceover
      // TODO: Implement voiceover upload to object storage when needed
      let voiceoverUrl = req.file.path;

      // Update promo video with custom voiceover URL
      await storage.updatePromoVideo(promoVideoId, {
        customVoiceoverUrl: voiceoverUrl,
      });

      res.json({
        success: true,
        voiceoverUrl,
        message: "Voiceover uploaded successfully",
      });
    } catch (error: any) {
      console.error("Error uploading voiceover:", error);
      res.status(500).json({ error: error.message || "Failed to upload voiceover" });
    }
  });

  /**
   * POST /api/upload/promo-scene-images
   * Upload custom images for promo video scenes
   */
  app.post("/api/upload/promo-scene-images", upload.array('images', 10), async (req: Request, res: Response) => {
    try {
      // Try to get authenticated user, fallback to anonymous user
      const user = await getCurrentUser(req);

      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      // Validate file types (only images)
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      for (const file of req.files) {
        if (!validTypes.includes(file.mimetype)) {
          return res.status(400).json({ 
            error: `Invalid file type: ${file.filename}. Only JPG, PNG, and WebP are allowed.` 
          });
        }
      }

      const localStorageService = new LocalFileStorageService();

      // Upload files to object storage
      const uploadResults = await Promise.all(
        req.files.map(async (file, index) => {
          try {
            // Read file buffer for object storage
            const fs = await import('fs/promises');
            const fileBuffer = await fs.readFile(file.path);

            // Upload to object storage
            const localFileStorageService = new LocalFileStorageService();
            const imageUrl = await localFileStorageService.uploadCommunityImage(fileBuffer);

            // Clean up temp file
            await fs.unlink(file.path);

            return {
              sceneIndex: index,
              url: imageUrl,
              success: true,
            };
          } catch (uploadError) {
            console.error(`Error uploading file ${file.filename}:`, uploadError);
            return {
              sceneIndex: index,
              error: uploadError instanceof Error ? uploadError.message : 'Upload failed',
              success: false,
            };
          }
        })
      );

      // Check if any uploads failed
      const failures = uploadResults.filter(r => !r.success);
      if (failures.length > 0) {
        return res.status(500).json({ 
          error: "Some uploads failed", 
          failures,
          results: uploadResults 
        });
      }

      res.json({
        success: true,
        images: uploadResults.map(r => ({ sceneIndex: r.sceneIndex, url: r.url })),
        message: `${uploadResults.length} image(s) uploaded successfully`,
      });
    } catch (error: any) {
      console.error("Error uploading promo scene images:", error);
      res.status(500).json({ error: error.message || "Failed to upload scene images" });
    }
  });

  // ========================================
  // CAMPAIGN IMAGES EDIT METADATA ROUTE
  // ========================================

  /**
   * Update edit metadata for a campaign image
   * PATCH /api/campaign-images/:id/edit-metadata
   */
  app.patch("/api/campaign-images/:id/edit-metadata", async (req: Request, res: Response) => {
    try {
      // Ensure user is authenticated
      const user = await ensureUser(req);

      const { id } = req.params;
      const { editMetadata } = req.body;

      if (!editMetadata) {
        return res.status(400).json({ error: "Missing editMetadata in request body" });
      }

      // Validate editMetadata structure
      if (typeof editMetadata !== 'object') {
        return res.status(400).json({ error: "editMetadata must be an object" });
      }

      // Load the campaign image to verify it exists
      const image = await storage.getCampaignImage(id);
      if (!image) {
        return res.status(404).json({ error: "Campaign image not found" });
      }

      // Load the campaign to get the project ID
      const campaign = await storage.getCampaign(image.campaignId);
      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      // Load the project to verify ownership
      const project = await storage.getProject(campaign.projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // Verify the authenticated user owns this project
      if (project.userId !== user.id) {
        return res.status(403).json({ error: "Unauthorized to modify this campaign image" });
      }

      // Update the campaign image edit metadata using storage interface
      await storage.updateCampaignImageEditMetadata(id, editMetadata);

      res.json({ success: true });
    } catch (error: any) {
      // Handle authentication errors specifically
      if (error.message && error.message.startsWith('Unauthorized')) {
        return res.status(401).json({ error: "Authentication required" });
      }
      console.error('Error updating edit metadata:', error);
      res.status(500).json({ error: error.message || "Failed to update edit metadata" });
    }
  });

  // ========================================
  // QUICKCLIP VIDEO ROUTES
  // ========================================

  /**
   * Generate animation prompt from uploaded image
   * POST /api/quickclip/generate-animation-prompt
   */
  app.post("/api/quickclip/generate-animation-prompt", async (req: Request, res: Response) => {
    try {
      const { imageUrl, variation } = req.body;

      if (!imageUrl) {
        return res.status(400).json({ error: "Missing required field: imageUrl" });
      }

      // Convert relative paths to full HTTPS URLs
      let fullImageUrl = imageUrl;
      if (imageUrl.startsWith('/') || !imageUrl.startsWith('http')) {
        // Get the protocol and host from the request
        const protocol = req.protocol; // 'http' or 'https'
        const host = req.get('host'); // e.g., 'example.replit.dev'
        fullImageUrl = `${protocol}://${host}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
      }

      console.log(`[QuickClip] Generating animation prompt for image: ${fullImageUrl}`);
      console.log(`[QuickClip] Original URL: ${imageUrl}`);
      console.log(`[QuickClip] Variation: ${variation || 0}`);

      // Call Gemini Vision API to generate animation prompt
      const { generateAnimationPromptFromImage } = await import('./gemini');
      const animationPrompt = await generateAnimationPromptFromImage(fullImageUrl, variation || 0);

      console.log(`[QuickClip] Animation prompt generated successfully`);

      res.json({
        success: true,
        animationPrompt,
      });
    } catch (error: any) {
      console.error('[QuickClip] Animation prompt generation failed:', error);
      res.status(500).json({ 
        error: 'Failed to generate animation prompt',
        details: error.message 
      });
    }
  });

  /**
   * Generate a QuickClip video
   * POST /api/quickclip/generate
   */
  app.post("/api/quickclip/generate", async (req: Request, res: Response) => {
    try {
      // Try to get authenticated user, fallback to anonymous user
      const user = await getCurrentUser(req);

      if (!user) {
        console.error('[QuickClip] ERROR: getCurrentUser returned null/undefined');
        return res.status(401).json({ error: "Authentication required" });
      }

      const { 
        imageUrl, 
        duration, 
        animationPrompt,
        enableMusic = false,
        resolutionKey = '3x4_720', 
        numberOfVideos = 1 
      } = req.body;

      // Validate required fields
      if (!imageUrl || !duration) {
        return res.status(400).json({ error: "Missing required fields: imageUrl and duration are required" });
      }

      // Validate duration (1.2 to 12 seconds allowed)
      if (duration < 1.2 || duration > 12) {
        return res.status(400).json({ error: "Duration must be between 1.2 and 12 seconds" });
      }

      // Validate numberOfVideos
      if (numberOfVideos < 1 || numberOfVideos > 4) {
        return res.status(400).json({ error: "numberOfVideos must be between 1 and 4" });
      }

      // Validate resolutionKey
      const resolution = QUICKCLIP_RESOLUTIONS.find(r => r.key === resolutionKey);
      if (!resolution) {
        return res.status(400).json({ error: "Invalid resolutionKey. Must be one of the supported resolutions." });
      }

      // Convert relative paths to full HTTPS URLs
      let fullImageUrl = imageUrl;
      if (imageUrl.startsWith('/') || !imageUrl.startsWith('http')) {
        const protocol = req.protocol;
        const host = req.get('host');
        fullImageUrl = `${protocol}://${host}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
      }

      // Get video dimensions from selected resolution
      const imageWidth = resolution.width;
      const imageHeight = resolution.height;

      console.log(`[QuickClip] Starting video generation for user ${user.id}`);
      console.log(`[QuickClip] Image URL: ${fullImageUrl}`);
      console.log(`[QuickClip] Resolution: ${resolution.label} (${imageWidth}x${imageHeight})`);
      console.log(`[QuickClip] Duration: ${duration}s`);
      console.log(`[QuickClip] Animation Prompt: ${animationPrompt || 'auto-generated'}`);
      console.log(`[QuickClip] Number of Videos: ${numberOfVideos}`);
      console.log(`[QuickClip] Enable Music: ${enableMusic}`);

      // Generate multiple videos with controlled parallelism
      const { 
        generateQuickClipVideo,
        detectMusicMoodFromPrompt,
        generateBackgroundMusic
      } = await import('./services/runwareService');

      // Use p-limit to control concurrent API requests (max 2 at a time)
      const limit = pLimit(2);

      // Create array of video generation tasks
      const videoTasks = Array.from({ length: numberOfVideos }, (_, index) => 
        limit(async () => {
          console.log(`[QuickClip] Generating video ${index + 1}/${numberOfVideos}`);
          const result = await generateQuickClipVideo(
            fullImageUrl, 
            duration, 
            animationPrompt, 
            imageWidth, 
            imageHeight
          );
          console.log(`[QuickClip] Video ${index + 1}/${numberOfVideos} task submitted: ${result.taskUUID}`);
          return result;
        })
      );

      // Execute all video generation tasks in parallel (with limit)
      const results = await Promise.all(videoTasks);
      const taskUUIDs = results.map(r => r.taskUUID);

      console.log(`[QuickClip] All ${numberOfVideos} video generation tasks submitted`);

      // Generate background music if enabled
      let musicTaskUUID: string | undefined = undefined;
      if (enableMusic && animationPrompt) {
        try {
          console.log(`[QuickClip] 🎵 Generating background music...`);
          const musicMood = detectMusicMoodFromPrompt(animationPrompt);
          console.log(`[QuickClip] 🎼 Detected music mood: ${musicMood}`);
          
          const musicResult = await generateBackgroundMusic(musicMood, duration);
          musicTaskUUID = musicResult.taskUUID;
          console.log(`[QuickClip] 🎶 Music generation task submitted: ${musicTaskUUID}`);
        } catch (error: any) {
          console.error('[QuickClip] Music generation failed:', error);
          console.log('[QuickClip] Continuing without music...');
        }
      }

      // Create quickclips record to track this batch
      const quickclip = await storage.createQuickclip({
        projectId: req.body.projectId || 'unknown',
        userId: user.id,
        status: 'pending',
        resolutionKey,
        width: imageWidth,
        height: imageHeight,
        aspectRatio: resolution.aspectRatio,
        videoCount: numberOfVideos,
        completedCount: 0,
        config: {
          imageUrl: fullImageUrl,
          animationPrompt,
          duration,
          enableMusic,
        },
        metadata: {
          taskUUIDs,
          musicTaskUUID,
        },
      });

      console.log(`[QuickClip] Created quickclips record: ${quickclip.id}`);

      // 🎯 CREATE VISUAL RECORDS IMMEDIATELY (for placeholder display in MyProject)
      const createdVisuals = [];
      for (let i = 0; i < numberOfVideos; i++) {
        const visual = await storage.createVisual({
          projectId: req.body.projectId || 'unknown',
          type: 'quickclip',
          mediaType: 'video',
          status: 'generating',
          prompt: animationPrompt || null,
          imageUrl: null,
          videoUrl: null,
          metadata: {
            taskUUID: taskUUIDs[i],
            quickclipId: quickclip.id,
            resolutionKey,
            duration,
            videoIndex: i + 1,
            totalVideos: numberOfVideos,
          },
        });
        createdVisuals.push(visual);
        console.log(`[QuickClip] Created visual placeholder ${i + 1}/${numberOfVideos}: ${visual.id}`);
      }

      res.json({
        success: true,
        quickclipId: quickclip.id,
        taskUUIDs,
        visuals: createdVisuals,
        message: `${numberOfVideos} QuickClip video${numberOfVideos > 1 ? 's' : ''} generation started. Use the taskUUIDs to poll for status.`,
      });
    } catch (error: any) {
      console.error("[QuickClip] Video generation failed:", error);
      res.status(500).json({ error: error.message || "Failed to generate QuickClip video" });
    }
  });

  /**
   * Poll QuickClip video generation status
   * GET /api/quickclip/status/:taskUUID
   */
  app.get("/api/quickclip/status/:taskUUID", async (req: Request, res: Response) => {
    try {
      console.log(`[QuickClip Poll] ===== POLL REQUEST START =====`);

      // Try to get authenticated user, fallback to anonymous user
      const user = await getCurrentUser(req);
      console.log(`[QuickClip Poll] User ID: ${user?.id || 'NONE'}`);

      const { taskUUID } = req.params;
      console.log(`[QuickClip Poll] Task UUID: ${taskUUID}`);

      if (!taskUUID) {
        console.error(`[QuickClip Poll] ERROR: Missing taskUUID`);
        return res.status(400).json({ error: "Missing taskUUID parameter" });
      }

      console.log(`[QuickClip Poll] Calling pollQuickClipVideoStatus...`);

      // Poll Runware API for video status
      const { pollQuickClipVideoStatus } = await import('./services/runwareService');
      const status = await pollQuickClipVideoStatus(taskUUID);

      console.log(`[QuickClip Poll] ===== RESPONSE FROM SERVICE =====`);
      console.log(`[QuickClip Poll] Status object keys: ${Object.keys(status).join(', ')}`);
      console.log(`[QuickClip Poll] status.status: ${status.status}`);
      console.log(`[QuickClip Poll] status.videoURL: ${status.videoURL || 'UNDEFINED'}`);
      console.log(`[QuickClip Poll] Full status object:`, JSON.stringify(status, null, 2));

      // If video generation succeeded, check for music and combine if needed
      if (status.status === 'success' && status.videoURL && user) {
        console.log(`[QuickClip Poll] Video successful! Checking for music...`);

        // Find the quickclip record
        const { db } = await import('./db');
        const { quickclips } = await import('@shared/schema');
        const { sql } = await import('drizzle-orm');

        const [quickclipRecord] = await db
          .select()
          .from(quickclips)
          .where(sql`metadata @> jsonb_build_object('taskUUIDs', jsonb_build_array(${taskUUID}::text))`);

        if (quickclipRecord) {
          const projectId = quickclipRecord.projectId;
          console.log(`[QuickClip Poll] Found quickclip record for project: ${projectId}`);
          
          let finalVideoURL = status.videoURL;
          let totalCost = status.cost || 0;

          // Check if music generation is enabled
          const musicTaskUUID = quickclipRecord.metadata?.musicTaskUUID;
          const enableMusic = quickclipRecord.config?.enableMusic;
          
          if (enableMusic && musicTaskUUID) {
            console.log(`[QuickClip Poll] 🎵 Music enabled! Checking music status for UUID: ${musicTaskUUID}`);
            
            const { pollMusicGenerationStatus } = await import('./services/runwareService');
            const musicStatus = await pollMusicGenerationStatus(musicTaskUUID);
            
            console.log(`[QuickClip Poll] 🎶 Music status: ${musicStatus.status}`);
            
            if (musicStatus.status === 'processing') {
              console.log(`[QuickClip Poll] ⏳ Music still generating, returning processing status...`);
              return res.json({ status: 'processing', message: 'Generating background music...' });
            } else if (musicStatus.status === 'success' && musicStatus.audioURL) {
              console.log(`[QuickClip Poll] ✅ Music ready! Combining video + music...`);
              
              try {
                // Combine video and music using FFmpeg
                const { videoService } = await import('./services/videoService');
                const path = await import('path');
                const fs = await import('fs/promises');
                
                // Create temp output path
                const tempDir = '/tmp/quickclip';
                await fs.mkdir(tempDir, { recursive: true });
                const combinedVideoPath = path.join(tempDir, `combined_${taskUUID}.mp4`);
                
                // Combine using FFmpeg
                await videoService.combineVideoWithMusic(
                  status.videoURL,
                  musicStatus.audioURL,
                  combinedVideoPath
                );
                
                console.log(`[QuickClip Poll] 🎬 Video + music combined successfully!`);
                
                // Upload combined video to object storage
                const { objectStorageClient } = await import('./objectStorage');
                const { randomUUID: uuidGen } = await import('crypto');
                
                const privateObjectDir = process.env.PRIVATE_OBJECT_DIR || '/.private';
                const videoId = uuidGen();
                const fullPath = `${privateObjectDir}/quickclip/${quickclipRecord.id}/${videoId}.mp4`;
                
                // Parse object path (inline helper)
                const pathParts = fullPath.split('/').filter(p => p);
                const bucketName = pathParts[0];
                const objectName = pathParts.slice(1).join('/');
                
                const bucket = objectStorageClient.bucket(bucketName);
                const file = bucket.file(objectName);
                
                // Read video file and upload
                const videoBuffer = await fs.readFile(combinedVideoPath);
                await file.save(videoBuffer, {
                  metadata: {
                    contentType: 'video/mp4',
                    cacheControl: 'public, max-age=31536000',
                  },
                });
                
                const uploadedUrl = `/objects/quickclip/${quickclipRecord.id}/${videoId}.mp4`;
                console.log(`[QuickClip Poll] ☁️ Combined video uploaded: ${uploadedUrl}`);
                
                // Clean up temp file
                await fs.unlink(combinedVideoPath);
                
                finalVideoURL = uploadedUrl;
                totalCost += (musicStatus.cost || 0);
              } catch (error: any) {
                console.error('[QuickClip Poll] ❌ Failed to combine video + music:', error);
                console.log('[QuickClip Poll] Falling back to video-only...');
              }
            } else if (musicStatus.status === 'failed') {
              console.log(`[QuickClip Poll] ❌ Music generation failed, using video-only`);
            }
          }

          // Find existing visual placeholder and update it
          const existingVisuals = await storage.getProjectVisuals(projectId);
          const existingVisual = existingVisuals.find(v => 
            v.metadata && 
            typeof v.metadata === 'object' && 
            'taskUUID' in v.metadata && 
            v.metadata.taskUUID === taskUUID
          );

          if (existingVisual) {
            console.log(`[QuickClip Poll] Updating existing visual placeholder: ${existingVisual.id}`);

            // Update visual record with final video URL
            await storage.updateVisual(existingVisual.id, {
              status: 'completed',
              videoUrl: finalVideoURL,
              metadata: {
                ...existingVisual.metadata,
                taskUUID,
                quickclipId: quickclipRecord.id,
                resolutionKey: quickclipRecord.resolutionKey,
                duration: quickclipRecord.config.duration,
                cost: Math.round(totalCost * 100),
                hasMusic: enableMusic && musicTaskUUID ? true : false,
              },
            });

            // Increment completedCount
            await storage.updateQuickclip(quickclipRecord.id, {
              completedCount: quickclipRecord.completedCount + 1,
              status: quickclipRecord.completedCount + 1 >= quickclipRecord.videoCount ? 'completed' : 'pending',
            });

            console.log(`[QuickClip Poll] Visual updated successfully! Completed: ${quickclipRecord.completedCount + 1}/${quickclipRecord.videoCount}`);
            
            // Update status to return final video URL
            status.videoURL = finalVideoURL;
          } else {
            console.log(`[QuickClip Poll] WARNING: Could not find visual placeholder for taskUUID: ${taskUUID}`);
          }
        } else {
          console.log(`[QuickClip Poll] WARNING: Could not find quickclip record for taskUUID: ${taskUUID}`);
        }
      }

      console.log(`[QuickClip Poll] ===== SENDING TO FRONTEND =====`);

      res.json(status);
    } catch (error: any) {
      console.error("[QuickClip Poll] ERROR: Status polling failed:", error);
      console.error("[QuickClip Poll] ERROR Stack:", error.stack);
      res.status(500).json({ error: error.message || "Failed to poll QuickClip video status" });
    }
  });

  // 🗑️ Admin endpoint to manually trigger cleanup of expired visuals
  app.post("/api/admin/cleanup-expired", async (req: Request, res: Response) => {
    try {
      console.log('[CLEANUP] Manual cleanup triggered');
      
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      // Import db and schema directly
      const { db } = await import('./db');
      const { visuals, campaignImages } = await import('@shared/schema');
      const { lt } = await import('drizzle-orm');
      
      // Delete expired visuals
      const deletedVisuals = await db
        .delete(visuals)
        .where(lt(visuals.createdAt, sixtyDaysAgo))
        .returning();
      
      // Delete expired campaign images
      const deletedImages = await db
        .delete(campaignImages)
        .where(lt(campaignImages.createdAt, sixtyDaysAgo))
        .returning();
      
      console.log(`[CLEANUP] Deleted ${deletedVisuals.length} expired visuals`);
      console.log(`[CLEANUP] Deleted ${deletedImages.length} expired campaign images`);
      
      res.json({
        success: true,
        deletedVisuals: deletedVisuals.length,
        deletedImages: deletedImages.length,
        message: `Cleanup completed: ${deletedVisuals.length} visuals and ${deletedImages.length} images deleted`,
      });
    } catch (error: any) {
      console.error('[CLEANUP] Error during cleanup:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 🕒 Schedule daily cleanup of expired visuals
  const cleanupExpiredVisuals = async () => {
    console.log('[CLEANUP] Running scheduled cleanup...');
    
    try {
      // Trigger cleanup via internal call
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      const { db } = await import('./db');
      const { visuals, campaignImages } = await import('@shared/schema');
      const { lt } = await import('drizzle-orm');
      
      const deletedVisuals = await db
        .delete(visuals)
        .where(lt(visuals.createdAt, sixtyDaysAgo))
        .returning();
      
      const deletedImages = await db
        .delete(campaignImages)
        .where(lt(campaignImages.createdAt, sixtyDaysAgo))
        .returning();
      
      console.log(`[CLEANUP] Scheduled cleanup completed: ${deletedVisuals.length} visuals, ${deletedImages.length} images deleted`);
    } catch (error) {
      console.error('[CLEANUP] Scheduled cleanup error:', error);
    }
  };

  // Run cleanup daily (every 24 hours)
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  setInterval(cleanupExpiredVisuals, TWENTY_FOUR_HOURS);
  
  // Also run cleanup on server start (after 30 seconds to allow DB to initialize)
  setTimeout(cleanupExpiredVisuals, 30000);

  return createServer(app);
}