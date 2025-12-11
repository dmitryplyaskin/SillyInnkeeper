import { Router, Request, Response } from "express";
import Database from "better-sqlite3";
import { getSettings, updateSettings, Settings } from "../../services/settings";
import { createScanService } from "../../services/scan";
import { logger } from "../../utils/logger";

const router = Router();

// Middleware для получения базы данных из app.locals
function getDb(req: Request): Database.Database {
  return req.app.locals.db as Database.Database;
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
    const newSettings = req.body as Settings;

    // Валидация структуры данных
    if (
      typeof newSettings !== "object" ||
      newSettings === null ||
      !("cardsFolderPath" in newSettings) ||
      !("sillytavenrPath" in newSettings)
    ) {
      res.status(400).json({
        error:
          "Неверный формат данных. Ожидается объект с полями cardsFolderPath и sillytavenrPath",
      });
      return;
    }

    // Полное обновление настроек (валидация путей происходит внутри updateSettings)
    const savedSettings = await updateSettings(newSettings);

    // Если обновлен cardsFolderPath и путь валиден, запускаем сканирование
    if (savedSettings.cardsFolderPath !== null) {
      try {
        const db = getDb(req);
        const scanService = createScanService(db);
        // Запускаем сканирование асинхронно, не блокируя ответ
        scanService.scanFolder(savedSettings.cardsFolderPath).catch((error) => {
          logger.error(
            error,
            "Ошибка при сканировании после обновления настроек"
          );
        });
      } catch (error) {
        logger.error(error, "Ошибка при запуске сканирования");
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
