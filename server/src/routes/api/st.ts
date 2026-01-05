import { Router, type Request, type Response } from "express";
import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { basename } from "node:path";
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

type StCardOpenPayload = {
  type: "st:card_open";
  ts: number;
  cardId: string;
  stProfileHandle: string;
  stAvatarFile: string;
  stAvatarBase: string;
};

type StImportResultPayload = {
  type: "st:import_result";
  ts: number;
  cardId: string;
  ok: boolean;
  action?: "import" | "open";
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
          c.is_sillytavern,
          c.primary_file_path,
          (
            SELECT cf.file_path
            FROM card_files cf
            WHERE cf.card_id = c.id
            ORDER BY cf.file_birthtime ASC, cf.file_path ASC
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
          is_sillytavern: number;
          primary_file_path: string | null;
          file_path: string | null;
        }
      | undefined;

    if (!row) {
      throw new AppError({ status: 404, code: "api.cards.not_found" });
    }
    const mainFilePath = row.primary_file_path ?? row.file_path;
    if (!mainFilePath) {
      throw new AppError({ status: 404, code: "api.image.not_found" });
    }
    if (!existsSync(mainFilePath)) {
      throw new AppError({ status: 404, code: "api.image.file_not_found" });
    }

    // If this is a SillyTavern-origin card, do NOT export+import.
    // Instead, ask the ST extension to open an existing character by avatar file.
    if (row.is_sillytavern === 1) {
      const meta = db
        .prepare(
          `
          SELECT st_profile_handle, st_avatar_file, st_avatar_base
          FROM card_files
          WHERE file_path = ?
          LIMIT 1
        `
        )
        .get(mainFilePath) as
        | {
            st_profile_handle: string | null;
            st_avatar_file: string | null;
            st_avatar_base: string | null;
          }
        | undefined;

      const stProfileHandle = meta?.st_profile_handle?.trim() ?? "";
      const stAvatarFile = meta?.st_avatar_file?.trim() ?? basename(mainFilePath);
      const stAvatarBase =
        meta?.st_avatar_base?.trim() ??
        stAvatarFile.replace(/\.png$/i, "");

      if (!stProfileHandle) {
        throw new AppError({ status: 409, code: "api.st.missing_st_profile" });
      }
      if (!stAvatarFile) {
        throw new AppError({ status: 409, code: "api.st.missing_st_avatar" });
      }

      const payload: StCardOpenPayload = {
        type: "st:card_open",
        ts: Date.now(),
        cardId: row.id,
        stProfileHandle,
        stAvatarFile,
        stAvatarBase,
      };

      logger.infoKey("log.st.playRequested", { cardId: row.id });
      getHub(req).broadcast("st:card_open", payload, { id: payload.ts });
      logger.infoKey("log.st.playBroadcasted", { cardId: row.id });

      res.json({ ok: true });
      return;
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

    const actionRaw = typeof body.action === "string" ? body.action.trim() : "";
    const action =
      actionRaw === "import" || actionRaw === "open"
        ? (actionRaw as "import" | "open")
        : undefined;

    const payload: StImportResultPayload = {
      type: "st:import_result",
      ts: Date.now(),
      cardId: cardId.trim(),
      ok,
      ...(action ? { action } : {}),
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
