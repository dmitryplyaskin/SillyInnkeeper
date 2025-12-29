import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { getSettings } from "../services/settings";
import { logger } from "../utils/logger";
import type { CardsSyncOrchestrator } from "../services/cards-sync-orchestrator";
import { getOrCreateLibraryId } from "../services/libraries";

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
      logger.infoKey("log.scanner.autoStart", {
        folderPath: settings.cardsFolderPath,
      });

      // db параметр оставлен для обратной совместимости сигнатуры старого вызова,
      // но фактический запуск идёт через orchestrator.
      void db;
      logger.warnKey("warn.scanner.deprecatedInitializeScanner");
    } else {
      logger.infoKey("log.scanner.skipNoPath");
    }
  } catch (error) {
    logger.errorKey(error, "error.scanner.readSettingsFailed");
  }
}

export async function initializeScannerWithOrchestrator(
  orchestrator: CardsSyncOrchestrator,
  db: Database.Database
): Promise<void> {
  try {
    const settings = await getSettings();
    if (
      settings.cardsFolderPath !== null &&
      existsSync(settings.cardsFolderPath)
    ) {
      logger.infoKey("log.scanner.autoStart", {
        folderPath: settings.cardsFolderPath,
      });
      const libraryId = getOrCreateLibraryId(db, settings.cardsFolderPath);
      orchestrator.requestScan("app", settings.cardsFolderPath, libraryId);
    }

    if (settings.sillytavenrPath !== null && existsSync(settings.sillytavenrPath)) {
      logger.infoKey("log.scanner.autoStart", {
        folderPath: settings.sillytavenrPath,
      });
      const libraryId = getOrCreateLibraryId(db, settings.sillytavenrPath);
      orchestrator.requestScan(
        "app",
        settings.sillytavenrPath,
        libraryId,
        "sillytavern"
      );
    }
  } catch (error) {
    logger.errorKey(error, "error.scanner.readSettingsFailed");
  }
}
