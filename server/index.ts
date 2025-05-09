import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Daha detaylı hata loglaması
    console.error(`Hata: ${status} - ${message}`);
    console.error(`URL: ${req.method} ${req.url}`);
    console.error(`Hata stack: ${err.stack}`);

    // Yanıt gönder (throw err yapmayarak uygulamanın çökmesini engelliyoruz)
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

  // Serve the app on the configured port
  // Replit'te 5000, yerel ortamda 3000 portunu kullanacak şekilde ayarla
  const isReplit = process.env.REPL_ID !== undefined;
  const defaultPort = isReplit ? 5000 : 3000;
  const port = process.env.PORT ? parseInt(process.env.PORT) : defaultPort;
  
  server.listen({
    port,
    host: "0.0.0.0", // Uzak bağlantılara izin vermek için 0.0.0.0 kullanıyoruz
  }, () => {
    log(`serving on port ${port}`);
  });
})();
