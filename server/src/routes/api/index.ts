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

const router = Router();

const DEFAULT_ALLOWED_ORIGINS = [
  // default SillyTavern origins
  "http://localhost:8000",
  "http://127.0.0.1:8000",
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

export default router;
