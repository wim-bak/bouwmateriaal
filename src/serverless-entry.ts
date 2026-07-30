import express from "express";
import type { Request, Response, NextFunction } from "express";
import { createServer } from "node:http";
import { registerRoutes } from "../server/routes";

const app = express();

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: "10mb" }));

let routesReady: Promise<void> | null = null;
async function ensureRoutes() {
  if (!routesReady) {
    const httpServer = createServer(app);
    routesReady = registerRoutes(httpServer, app).then(() => {
      app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        console.error("Route error:", err);
        if (res.headersSent) return next(err);
        return res.status(status).json({ message });
      });
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
      stack: err?.stack || null,
    });
  }
}
