import { Router, type Request, type Response } from "express";
import type Database from "better-sqlite3";
import type { SseHub } from "../../services/sse-hub";
import type { CardsSyncOrchestrator } from "../../services/cards-sync-orchestrator";
import { CardsImportService } from "../../services/cards-import";
import { AppError } from "../../errors/app-error";
import { sendError } from "../../errors/http";
import { logger } from "../../utils/logger";
import { getSettings } from "../../services/settings";
import { getOrCreateLibraryId } from "../../services/libraries";
import { existsSync, statSync } from "node:fs";

const router = Router();

function getDb(req: Request): Database.Database {
  return req.app.locals.db as Database.Database;
}

function getHub(req: Request): SseHub {
  const hub = (req.app.locals as any).sseHub as SseHub | undefined;
  if (!hub) throw new Error("SSE hub is not initialized");
  return hub;
}

function getOrchestrator(req: Request): CardsSyncOrchestrator {
  const o = (req.app.locals as any).cardsSyncOrchestrator as
    | CardsSyncOrchestrator
    | undefined;
  if (!o) throw new Error("CardsSyncOrchestrator is not initialized");
  return o;
}

type ImportRunState = { running: boolean };

function getState(req: Request): ImportRunState {
  const locals = req.app.locals as any;
  if (!locals.cardsImportState) locals.cardsImportState = { running: false };
  return locals.cardsImportState as ImportRunState;
}

function ensureDirectory(path: string): void {
  if (!existsSync(path)) {
    throw new AppError({
      status: 400,
      code: "api.cardsImport.path_not_exists",
      params: { path },
    });
  }
  const st = statSync(path);
  if (!st.isDirectory()) {
    throw new AppError({
      status: 400,
      code: "api.cardsImport.not_a_directory",
      params: { path },
    });
  }
}

router.post("/cards/import", async (req: Request, res: Response) => {
  const state = getState(req);
  if (state.running) {
    return sendError(res, new AppError({ status: 409, code: "api.cardsImport.already_running" }));
  }

  try {
    const body = req.body as any;
    const sourceFolderPath =
      typeof body?.sourceFolderPath === "string"
        ? body.sourceFolderPath.trim()
        : "";
    const importModeRaw = typeof body?.importMode === "string" ? body.importMode : "copy";
    const duplicatesModeRaw =
      typeof body?.duplicatesMode === "string" ? body.duplicatesMode : "skip";

    const importMode =
      importModeRaw === "copy" || importModeRaw === "move"
        ? importModeRaw
        : null;
    const duplicatesMode =
      duplicatesModeRaw === "skip" || duplicatesModeRaw === "copy"
        ? duplicatesModeRaw
        : null;

    if (!sourceFolderPath || !importMode || !duplicatesMode) {
      throw new AppError({ status: 400, code: "api.cardsImport.invalid_format" });
    }

    ensureDirectory(sourceFolderPath);

    const settings = await getSettings();
    const targetFolderPath = settings.cardsFolderPath;
    if (!targetFolderPath) {
      throw new AppError({ status: 400, code: "api.cardsImport.cardsFolderPath_not_set" });
    }
    ensureDirectory(targetFolderPath);

    const db = getDb(req);
    const hub = getHub(req);
    const orchestrator = getOrchestrator(req);
    const libraryId = getOrCreateLibraryId(db, targetFolderPath);
    const service = new CardsImportService(db, hub, orchestrator);

    state.running = true;
    void service
      .runImport({
        sourceFolderPath,
        targetFolderPath,
        libraryId,
        importMode,
        duplicatesMode,
      })
      .catch((error) => {
        logger.errorKey(error, "error.cardsImport.failed");
      })
      .finally(() => {
        state.running = false;
      });

    res.status(202).json({ ok: true, started: true });
  } catch (error) {
    state.running = false;
    logger.errorKey(error, "api.cardsImport.start_failed");
    return sendError(res, error, { status: 500, code: "api.cardsImport.start_failed" });
  }
});

export default router;


