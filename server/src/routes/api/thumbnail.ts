import { Router, Request, Response } from "express";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { logger } from "../../utils/logger";
import { AppError } from "../../errors/app-error";
import { sendError } from "../../errors/http";
import type { ThumbnailQueue } from "../../services/thumbnail-queue";

const router = Router();

function getThumbnailQueue(req: Request): ThumbnailQueue {
  const q = (req.app.locals as any).thumbnailQueue as
    | ThumbnailQueue
    | undefined;
  if (!q) throw new Error("thumbnailQueue is not initialized");
  return q;
}

function getWaitTimeoutMs(): number {
  const raw = process.env.THUMB_WAIT_TIMEOUT_MS;
  const n = raw != null ? Number(raw) : 15000;
  if (!Number.isFinite(n)) return 15000;
  return Math.max(1000, Math.floor(n));
}

async function withTimeout<T>(p: Promise<T>, timeoutMs: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) => {
      const t = setTimeout(() => {
        clearTimeout(t);
        reject(new Error("thumbnail_wait_timeout"));
      }, timeoutMs);
    }),
  ]);
}

// GET /api/thumbnail/:id - получение миниатюры карточки
router.get("/thumbnail/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Построим путь к файлу миниатюры
    const thumbnailPath = join(
      process.cwd(),
      "data",
      "cache",
      "thumbnails",
      `${id}.webp`
    );

    // Проверяем существование файла
    if (!existsSync(thumbnailPath)) {
      const queue = getThumbnailQueue(req);
      const timeoutMs = getWaitTimeoutMs();
      const startedAt = Date.now();

      try {
        const result = await withTimeout(queue.ensureThumbnail(id), timeoutMs);
        if (result.ok && existsSync(result.absPath)) {
          // Отправляем файл с правильным Content-Type
          res.setHeader("Content-Type", "image/webp");
          res.sendFile(result.absPath);
          return;
        }
        throw new AppError({ status: 404, code: "api.thumbnail.not_found" });
      } catch (e) {
        const durationMs = Date.now() - startedAt;
        if (e instanceof Error && e.message === "thumbnail_wait_timeout") {
          logger.warn(
            `[thumbnail] wait timeout id=${id} timeoutMs=${timeoutMs} durationMs=${durationMs} inflight=${queue.getInFlightCount()}`
          );
          // Return 503 so the client can retry if needed.
          res.status(503).end();
          return;
        }
        throw e;
      }
    }

    // Отправляем файл с правильным Content-Type
    res.setHeader("Content-Type", "image/webp");
    res.sendFile(thumbnailPath);
  } catch (error) {
    logger.errorKey(error, "api.thumbnail.get_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.thumbnail.get_failed",
    });
  }
});

export default router;
