import { Router, Request, Response } from "express";
import Database from "better-sqlite3";
import {
  getSettings,
  updateSettings,
  Settings,
  validateLanguage,
} from "../../services/settings";
import { logger } from "../../utils/logger";
import type { CardsSyncOrchestrator } from "../../services/cards-sync-orchestrator";
import type { FsWatcherService } from "../../services/fs-watcher";

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
    logger.error(error, "Ошибка при получении настроек");
    res.status(500).json({ error: "Не удалось получить настройки" });
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
      res.status(400).json({
        error:
          "Неверный формат данных. Ожидается объект с полями cardsFolderPath, sillytavenrPath и (опционально) language",
      });
      return;
    }

    // language — опционально для обратной совместимости
    if ("language" in newSettings && (newSettings as any).language != null) {
      try {
        validateLanguage((newSettings as any).language);
      } catch (error) {
        res.status(400).json({
          error:
            error instanceof Error
              ? error.message
              : "Неверное значение language",
        });
        return;
      }
    }

    const prevSettings = await getSettings();

    // Полное обновление настроек (валидация путей происходит внутри updateSettings)
    const savedSettings = await updateSettings(newSettings as Settings);

    const prevPath = prevSettings.cardsFolderPath;
    const nextPath = savedSettings.cardsFolderPath;

    // Перезапускаем watcher, если путь изменился
    if (prevPath !== nextPath) {
      try {
        getFsWatcher(req).restart(nextPath);
      } catch (error) {
        logger.error(error, "Ошибка при перезапуске FS watcher");
      }
    }

    // Запускаем scan через orchestrator (мгновенно, без debounce)
    if (nextPath !== null) {
      try {
        void getDb(req);
        getOrchestrator(req).requestScan("app", nextPath, "cards");
      } catch (error) {
        logger.error(error, "Ошибка при запуске синхронизации после settings");
      }
    }

    res.json(savedSettings);
  } catch (error) {
    logger.error(error, "Ошибка при обновлении настроек");

    // Если ошибка валидации пути, возвращаем подробную ошибку
    if (
      error instanceof Error &&
      error.message.includes("Путь не существует")
    ) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: "Не удалось обновить настройки" });
  }
});

export default router;
