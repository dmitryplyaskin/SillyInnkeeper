import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { getSettings } from "../services/settings";
import { createScanService } from "../services/scan";
import { logger } from "../utils/logger";

/**
 * Инициализирует автоматическое сканирование при старте сервера
 * @param db Экземпляр базы данных
 */
export async function initializeScanner(db: Database.Database): Promise<void> {
  // Читаем настройки
  try {
    const settings = await getSettings();

    // Если cardsFolderPath указан и папка существует, запускаем сканирование
    if (
      settings.cardsFolderPath !== null &&
      existsSync(settings.cardsFolderPath)
    ) {
      logger.info(`Автозапуск сканирования папки: ${settings.cardsFolderPath}`);

      const scanService = createScanService(db);

      // Запускаем сканирование асинхронно, не блокируя старт сервера
      scanService.scanFolder(settings.cardsFolderPath).catch((error) => {
        logger.error(error, "Ошибка при автозапуске сканирования");
      });
    } else {
      logger.info(
        "cardsFolderPath не указан или папка не существует, сканирование не запущено"
      );
    }
  } catch (error) {
    logger.error(
      error,
      "Ошибка при чтении настроек для автозапуска сканирования"
    );
  }
}
