import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist/public");

  if (!fs.existsSync(distPath)) {
    log(`Warning: Build directory not found at ${distPath}`);
    log("Attempting to serve from development mode...");
    // Fallback - don't crash, just log warning
    app.get("*", (_req, res) => {
      res.status(503).send("Application is building. Please refresh in a moment.");
    });
    return;
  }

  log(`Serving static files from: ${distPath}`);

  // Serve static assets with NO caching for JS/CSS to ensure updates load immediately
  app.use(express.static(distPath, {
    maxAge: '1d',
    etag: false, // Disable etag to prevent 304 responses
    index: false, // Don't serve index.html automatically
    setHeaders: (res, filepath) => {
      // Set correct MIME types for JavaScript modules
      if (filepath.endsWith('.js') || filepath.endsWith('.mjs')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        // Disable caching for JS files
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else if (filepath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
        // Disable caching for CSS files
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else if (filepath.endsWith('.html')) {
        // Disable caching for HTML files
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    },
  }));

  // SPA fallback - serve index.html for all non-API routes
  // This must be AFTER express.static so static files are served first
  app.use("*", (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api') || req.path.startsWith('/objects')) {
      return res.status(404).json({ error: 'Not found' });
    }
    log(`[SPA Fallback] Serving index.html for: ${req.path}`);
    // Set no-cache headers for index.html to prevent browser caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}