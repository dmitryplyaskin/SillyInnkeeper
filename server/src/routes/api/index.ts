import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import settings from "./settings";
import viewSettings from "./view-settings";
import cards from "./cards";
import tags from "./tags";
import thumbnail from "./thumbnail";
import image from "./image";
import events from "./events";
import st from "./st";
import explorer from "./explorer";

const router = Router();

function readPort(raw: string | undefined, fallback: number): number {
  const v = Number.parseInt(String(raw ?? "").trim(), 10);
  if (Number.isFinite(v) && v > 0 && v <= 65535) return v;
  return fallback;
}

const stPort = readPort(process.env.ST_PORT, 8000);

const DEFAULT_ALLOWED_ORIGINS = [
  // default SillyTavern origins (port can be customized)
  `http://localhost:${stPort}`,
  `http://127.0.0.1:${stPort}`,
];

const allowedOrigins = new Set<string>([
  ...DEFAULT_ALLOWED_ORIGINS,
  ...String(process.env.CORS_ALLOW_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
]);

function isStCorsRoute(path: string): boolean {
  if (path === "/events") return true;
  if (path === "/st/play") return true;
  if (path === "/st/import-result") return true;
  if (/^\/cards\/[^/]+\/export\.png$/i.test(path)) return true;
  return false;
}

function stCorsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const origin = req.headers.origin;
  if (!origin || !isStCorsRoute(req.path)) return next();

  const allowed = allowedOrigins.has(origin);
  if (allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }

  if (req.method === "OPTIONS") {
    res.status(allowed ? 204 : 403).end();
    return;
  }

  next();
}

// Подключаем дочерние роутеры
router.use(stCorsMiddleware);
router.use(settings);
router.use(viewSettings);
router.use(cards);
router.use(tags);
router.use(thumbnail);
router.use(image);
router.use(events);
router.use(st);
router.use(explorer);

export default router;
