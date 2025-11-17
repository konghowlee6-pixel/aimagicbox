import 'dotenv/config';
import express from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import cors from "cors";
import { registerRoutes } from "./routes";
import authRoutes from "./authRoutes";
import simpleAuthRoutes from "./simpleAuth";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";

const app = express();

// Trust proxy - required for session cookies to work behind reverse proxy
app.set('trust proxy', 1);

// Health check endpoint - MUST be first for fast deployment response
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// CORS configuration - Allow production and development origins
const allowedOrigins = [
  'https://aimagicbox.ai',
  'https://www.aimagicbox.ai',
  process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      console.log('[CORS] Allowing request with no origin');
      return callback(null, true);
    }
    
    console.log('[CORS] Checking origin:', origin);
    
    // Allow localhost, 127.0.0.1, and manus-asia.computer for development and testing
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('manus-asia.computer')) {
      console.log('[CORS] ✅ Allowing origin:', origin);
      return callback(null, true);
    }
    
    // Check if origin is in allowed list or is a Replit dev domain
    if (allowedOrigins.includes(origin) || origin.includes('.replit.dev')) {
      console.log('[CORS] ✅ Allowing origin:', origin);
      return callback(null, true);
    }
    
    console.warn('[CORS] ❌ Blocked origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies and authentication headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: "50mb" })); // Increased limit for base64 images
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

// Session middleware for anonymous user tracking
const MemoryStoreSession = MemoryStore(session);
const isProduction = process.env.NODE_ENV === "production";

app.use(
  session({
    secret: process.env.SESSION_SECRET || "aimagicbox-fixed-session-secret-key-2025",
    resave: true,
    saveUninitialized: true,
    proxy: true,
    store: new MemoryStoreSession({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: true, // Required for SameSite=None
      sameSite: "none", // Required for cross-origin cookies
      path: '/',
    },
  })
);

// Serve uploaded files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Register auth routes
  app.use("/api/auth", authRoutes);
  app.use("/api/simple-auth", simpleAuthRoutes);
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
