import express, { type Request, Response, NextFunction } from "express";
// Force restart: route fix verification
import path from "path";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { errorCaptureMiddleware, responseInterceptor } from "./middleware/realTimeErrorCapture";
// rbacPermissionsRoutes will be imported dynamically
// import transactionRoutes from "./routes/transactionRoutes.js";

const app = express();

// Add CORS middleware to fix frontend connection issues
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Basic root routes to avoid 404 on GET / - removed to allow Vite to handle client-side routing
app.get('/api', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'API root', uptime: process.uptime() });
});

// Performance optimizations
// IMPORTANT: Order matters! JSON parser must come before text parser
app.use(express.json({ limit: '5mb' })); // Parse application/json
app.use(express.urlencoded({ extended: false, limit: '5mb' })); // Parse application/x-www-form-urlencoded
// Only parse text/plain content types (not application/json)
app.use(express.text({ type: 'text/plain', limit: '5mb' }));

// WORKAROUND: Force parse JSON for AP routes even if Content-Type is wrong
// This must come AFTER express.text() so the body is already a string
// Force parse JSON for ANY api route if body is string (e.g. text/plain from some clients)
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
  if ((req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT') && typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
      console.log(`✅ Force-parsed JSON (global) from text/plain Content-Type for ${req.method} ${req.url}`);
    } catch (e) {
      console.error('❌ Failed to parse JSON from string body:', e);
    }
  }
  next();
});

// Serve static files from uploads directory for screenshots
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Add real-time error capture
app.use(responseInterceptor);

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

// Reduce frequent monitoring logs that consume CPU
const originalConsoleLog = console.log;
console.log = (...args) => {
  const message = args.join(' ');
  if (message.includes('Analyzing agent activities') || message.includes('Monitoring business domain logs')) {
    // Only log every 5 minutes instead of constantly
    if (Date.now() % 300000 < 10000) {
      originalConsoleLog(...args);
    }
  } else {
    originalConsoleLog(...args);
  }
};

(async () => {
  const server = await registerRoutes(app);

  // Test simple routes
  const { default: testSimpleRoutes } = await import('./routes/test-simple-routes');
  app.use('/api/test', testSimpleRoutes);

  // Test action routes for debugging AI agent actions
  const testActionRoutes = await import('./routes/testActionRoutes.js');
  app.use('/api', testActionRoutes.default);

  // Jr. Assistant smart data operations routes
  const jrActionsRoutes = await import('./routes/jrActionsRoutes.js');
  app.use('/api/jr-actions', jrActionsRoutes.default);

  // Enhanced AI routes for fully AI-powered capabilities
  const enhancedAIRoutes = await import('./routes/enhancedAIRoutes.js');
  console.log('Enhanced AI routes loaded:', enhancedAIRoutes.default ? 'SUCCESS' : 'FAILED');
  app.use('/api/ai/enhanced', enhancedAIRoutes.default);

  // Comprehensive customer management routes
  const comprehensiveCustomersRoutes = await import('./routes/comprehensiveCustomersRoutes.js');
  app.use('/api', comprehensiveCustomersRoutes.default);

  // Comprehensive inventory management routes
  const comprehensiveInventoryRoutes = await import('./routes/comprehensiveInventoryRoutes.js');
  app.use('/api', comprehensiveInventoryRoutes.default);

  // Simple Real AI routes for actual database operations
  const simpleRealAIRoutes = await import('./routes/simple-real-ai.js');
  app.use('/api/simple-real-ai', simpleRealAIRoutes.default);

  // Pricing-related routes are now mounted in server/routes.ts to avoid 404 handler precedence issues

  // RBAC routes are handled in main routes.ts
  // app.use("/api/transactions", transactionRoutes);

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    // Capture error immediately with enhanced logging
    errorCaptureMiddleware(err, req, res, next);

    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on configurable port (default 5001) and auto-retry if in use
  const desiredPort = Number(process.env.PORT) || 5001;
  let currentPort = desiredPort;

  const startServer = (portToUse: number) => {
    server.listen(portToUse, "0.0.0.0", () => {
      log(`Server running on port ${portToUse}`);
    });
  };

  server.on('error', (err: any) => {
    if (err && err.code === 'EADDRINUSE') {
      const fallbackPort = (currentPort === desiredPort) ? desiredPort + 1 : currentPort + 1;
      console.warn(`Port ${currentPort} in use. Retrying on ${fallbackPort}...`);
      currentPort = fallbackPort;
      setTimeout(() => startServer(currentPort), 250);
    }
  });

  startServer(currentPort);
})();
