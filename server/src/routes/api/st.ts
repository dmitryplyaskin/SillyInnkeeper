import { Router, type Request, type Response } from "express";
import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { AppError } from "../../errors/app-error";
import { sendError } from "../../errors/http";
import type { SseHub } from "../../services/sse-hub";
import { logger } from "../../utils/logger";
import { sanitizeWindowsFilenameBase } from "../../utils/filename";

const router = Router();

function getDb(req: Request): Database.Database {
  return req.app.locals.db as Database.Database;
}

function getHub(req: Request): SseHub {
  const hub = (req.app.locals as any).sseHub as SseHub | undefined;
  if (!hub) throw new Error("SSE hub is not initialized");
  return hub;
}

type StCardPlayPayload = {
  type: "st:card_play";
  ts: number;
  cardId: string;
  exportUrl: string;
  filename: string;
};

type StImportResultPayload = {
  type: "st:import_result";
  ts: number;
  cardId: string;
  ok: boolean;
  message?: string;
  stCharacterId?: string;
};

// POST /api/st/play
router.post("/st/play", (req: Request, res: Response) => {
  try {
    const cardId = (req.body as any)?.cardId;
    if (typeof cardId !== "string" || cardId.trim().length === 0) {
      throw new AppError({ status: 400, code: "api.st.invalid_cardId" });
    }

    const db = getDb(req);
    const row = db
      .prepare(
        `
        SELECT
          c.id,
          c.name,
          (
            SELECT cf.file_path
            FROM card_files cf
            WHERE cf.card_id = c.id
            LIMIT 1
          ) AS file_path
        FROM cards c
        WHERE c.id = ?
        LIMIT 1
      `
      )
      .get(cardId) as
      | {
          id: string;
          name: string | null;
          file_path: string | null;
        }
      | undefined;

    if (!row) {
      throw new AppError({ status: 404, code: "api.cards.not_found" });
    }
    if (!row.file_path) {
      throw new AppError({ status: 404, code: "api.image.not_found" });
    }
    if (!existsSync(row.file_path)) {
      throw new AppError({ status: 404, code: "api.image.file_not_found" });
    }

    const base = sanitizeWindowsFilenameBase(row.name, `card-${row.id}`);
    const filename = `${base}.png`;

    const payload: StCardPlayPayload = {
      type: "st:card_play",
      ts: Date.now(),
      cardId: row.id,
      exportUrl: `/api/cards/${encodeURIComponent(row.id)}/export.png`,
      filename,
    };

    logger.infoKey("log.st.playRequested", { cardId: row.id });
    getHub(req).broadcast("st:card_play", payload, { id: payload.ts });
    logger.infoKey("log.st.playBroadcasted", { cardId: row.id });

    res.json({ ok: true });
  } catch (error) {
    logger.errorKey(error, "api.st.play_failed");
    return sendError(res, error, { status: 500, code: "api.st.play_failed" });
  }
});

// POST /api/st/import-result
router.post("/st/import-result", (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as any;
    const cardId = body.cardId;
    const ok = body.ok;

    if (typeof cardId !== "string" || cardId.trim().length === 0) {
      throw new AppError({ status: 400, code: "api.st.invalid_cardId" });
    }
    if (typeof ok !== "boolean") {
      throw new AppError({ status: 400, code: "api.st.invalid_ok" });
    }

    const message =
      typeof body.message === "string" ? body.message.trim() : undefined;
    const shortMessage =
      message && message.length > 0 ? message.slice(0, 500) : undefined;

    const stCharacterId =
      typeof body.stCharacterId === "string" && body.stCharacterId.trim().length
        ? body.stCharacterId.trim()
        : undefined;

    const payload: StImportResultPayload = {
      type: "st:import_result",
      ts: Date.now(),
      cardId: cardId.trim(),
      ok,
      ...(shortMessage ? { message: shortMessage } : {}),
      ...(stCharacterId ? { stCharacterId } : {}),
    };

    logger.infoKey("log.st.importResultReceived", {
      cardId: payload.cardId,
      ok: payload.ok,
    });
    getHub(req).broadcast("st:import_result", payload, { id: payload.ts });

    res.json({ ok: true });
  } catch (error) {
    logger.errorKey(error, "api.st.import_result_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.st.import_result_failed",
    });
  }
});

export default router;
