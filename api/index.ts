// Debug-versie: vangt startup-fouten op zodat we ze in de HTTP response zien.
import type { Request, Response, NextFunction } from "express";

let startupError: unknown = null;
let app: any = null;
let routesReady: Promise<void> | null = null;

async function bootstrap() {
  const express = (await import("express")).default;
  const { createServer } = await import("node:http");
  const { registerRoutes } = await import("../server/routes");

  app = express();
  app.use(
    express.json({
      limit: "10mb",
      verify: (req: any, _res: any, buf: Buffer) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: false, limit: "10mb" }));

  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Route error:", err);
    if (res.headersSent) return next(err);
    return res
      .status(status)
      .json({ message, stack: err.stack, name: err.name });
  });
}

async function ensureRoutes() {
  if (!routesReady) {
    routesReady = bootstrap().catch((err) => {
      startupError = err;
      throw err;
    });
  }
  return routesReady;
}

export default async function handler(req: Request, res: Response) {
  try {
    await ensureRoutes();
    return app(req, res);
  } catch (err: any) {
    console.error("Startup crash:", err);
    return res.status(500).json({
      error: "startup_failed",
      message: err?.message || String(err),
      name: err?.name || null,
      stack: err?.stack || null,
      code: err?.code || null,
      cause: err?.cause ? String(err.cause) : null,
    });
  }
}
