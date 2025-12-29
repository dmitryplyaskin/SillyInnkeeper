import { Router, Request, Response } from "express";
import Database from "better-sqlite3";
import {
  getSettings,
  updateSettings,
  Settings,
  validateLanguage,
} from "../../services/settings";
import { getOrCreateLibraryId } from "../../services/libraries";
import { logger } from "../../utils/logger";
import type { CardsSyncOrchestrator } from "../../services/cards-sync-orchestrator";
import type { FsWatcherService } from "../../services/fs-watcher";
import { setCurrentLanguage } from "../../i18n/language";
import { AppError } from "../../errors/app-error";
import { sendError } from "../../errors/http";

const router = Router();

// Middleware для получения базы данных из app.locals
function getDb(req: Request): Database.Database {
  return req.app.locals.db as Database.Database;
}

function getOrchestrator(req: Request): CardsSyncOrchestrator {
  const o = (req.app.locals as any).cardsSyncOrchestrator as
    | CardsSyncOrchestrator
    | undefined;
  if (!o) throw new Error("CardsSyncOrchestrator is not initialized");
  return o;
}

function getFsWatcher(req: Request): FsWatcherService {
  const w = (req.app.locals as any).fsWatcher as FsWatcherService | undefined;
  if (!w) throw new Error("FsWatcherService is not initialized");
  return w;
}

// GET /api/settings - получение текущих настроек
router.get("/settings", async (req: Request, res: Response) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (error) {
    logger.errorKey(error, "api.settings.get_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.settings.get_failed",
    });
  }
});

// PUT /api/settings - обновление настроек (полное обновление)
router.put("/settings", async (req: Request, res: Response) => {
  try {
    const newSettings = req.body as Partial<Settings>;

    // Валидация структуры данных
    if (
      typeof newSettings !== "object" ||
      newSettings === null ||
      !("cardsFolderPath" in newSettings) ||
      !("sillytavenrPath" in newSettings)
    ) {
      throw new AppError({
        status: 400,
        code: "api.settings.invalid_format",
      });
    }

    // language — опционально для обратной совместимости
    if ("language" in newSettings && (newSettings as any).language != null) {
      validateLanguage((newSettings as any).language);
    }

    const prevSettings = await getSettings();

    // Полное обновление настроек (валидация путей происходит внутри updateSettings)
    const savedSettings = await updateSettings(newSettings as Settings);
    // Обновляем язык в рантайме, чтобы логи/ошибки переключались сразу
    setCurrentLanguage(savedSettings.language);

    const prevPath = prevSettings.cardsFolderPath;
    const nextPath = savedSettings.cardsFolderPath;
    const prevStPath = prevSettings.sillytavenrPath;
    const nextStPath = savedSettings.sillytavenrPath;
    const db = getDb(req);

    // Перезапускаем watcher, если путь изменился
    if (prevPath !== nextPath) {
      try {
        if (nextPath) {
          const libraryId = getOrCreateLibraryId(db, nextPath);
          getFsWatcher(req).restart(nextPath, libraryId);
        } else {
          getFsWatcher(req).restart(null);
        }
      } catch (error) {
        logger.errorKey(error, "error.settings.restartFsWatcherFailed");
      }
    }

    // Запускаем scan через orchestrator (мгновенно, без debounce)
    if (nextPath !== null) {
      try {
        const libraryId = getOrCreateLibraryId(db, nextPath);
        getOrchestrator(req).requestScan("app", nextPath, libraryId);
      } catch (error) {
        logger.errorKey(error, "error.settings.postSettingsSyncFailed");
      }
    }

    // Запускаем SillyTavern scan, если путь изменился (или был установлен)
    if (prevStPath !== nextStPath && nextStPath !== null) {
      try {
        const libraryId = getOrCreateLibraryId(db, nextStPath);
        getOrchestrator(req).requestScan(
          "app",
          nextStPath,
          libraryId,
          "sillytavern"
        );
      } catch (error) {
        logger.errorKey(error, "error.settings.postSettingsSyncFailed");
      }
    }

    res.json(savedSettings);
  } catch (error) {
    logger.errorKey(error, "api.settings.update_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.settings.update_failed",
    });
  }
});

export default router;
