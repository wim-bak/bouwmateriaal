import express, { Response, NextFunction } from "express";
import type { Request } from "express";
import { registerRoutes } from "../server/routes";
import { createServer } from "node:http";

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

// Registreer routes eenmalig; Vercel hergebruikt de warme instance.
let routesReady: Promise<void> | null = null;
async function ensureRoutes() {
  if (!routesReady) {
    const httpServer = createServer(app);
    routesReady = registerRoutes(httpServer, app).then(() => {
      app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        console.error("Internal Server Error:", err);
        if (res.headersSent) return next(err);
        return res.status(status).json({ message });
      });
    });
  }
  return routesReady;
}

export default async function handler(req: Request, res: Response) {
  await ensureRoutes();
  return app(req, res);
}
