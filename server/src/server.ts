import "./config/env";
import { createApp } from "./app";
import { initializeScannerWithOrchestrator } from "./plugins/scanner";
import { logger } from "./utils/logger";
import Database from "better-sqlite3";
import { getSettings } from "./services/settings";
import { existsSync } from "node:fs";
import { getOrCreateLibraryId } from "./services/libraries";
import type { SseHub } from "./services/sse-hub";
import type { FsWatcherService } from "./services/fs-watcher";
import type { CardsSyncOrchestrator } from "./services/cards-sync-orchestrator";
import { setCurrentLanguage } from "./i18n/language";

function readPort(
  ...candidates: Array<string | undefined>
): number | undefined {
  for (const c of candidates) {
    const raw = typeof c === "string" ? c.trim() : "";
    if (!raw) continue;
    const v = Number.parseInt(raw, 10);
    if (Number.isFinite(v) && v > 0 && v <= 65535) return v;
  }
  return undefined;
}

// Порт/хост SillyInnkeeper
// - INNKEEPER_PORT: предпочитаемый вариант
// - PORT: совместимость (например, для хостингов/общих практик)
const PORT = readPort(process.env.INNKEEPER_PORT, process.env.PORT) ?? 48912;
const HOST =
  String(process.env.INNKEEPER_HOST ?? "127.0.0.1").trim() || "127.0.0.1";

async function startServer(): Promise<void> {
  try {
    // Создаем Express приложение и инициализируем базу данных
    const { app, db } = await createApp();
    const sseHub = (app.locals as any).sseHub as SseHub;
    const fsWatcher = (app.locals as any).fsWatcher as FsWatcherService;
    const orchestrator = (app.locals as any)
      .cardsSyncOrchestrator as CardsSyncOrchestrator;

    // Инициализируем язык (для локализации логов/ошибок)
    try {
      const settings = await getSettings();
      setCurrentLanguage(settings.language);
    } catch (error) {
      logger.errorKey(error, "log.server.readLanguageSettingsFailed");
    }

    // Запускаем сервер
    const server = app.listen(PORT, HOST, () => {
      logger.infoKey("log.server.started", { port: PORT, host: HOST });

      // Инициализируем сканер после запуска сервера
      initializeScannerWithOrchestrator(orchestrator, db).catch((error) => {
        logger.errorKey(error, "log.server.initScannerFailed");
      });

      // Запускаем FS watcher (если cardsFolderPath указан)
      getSettings()
        .then((settings) => {
          const p = settings.cardsFolderPath;
          if (p && existsSync(p)) {
            const libraryId = getOrCreateLibraryId(db, p);
            fsWatcher.start(p, libraryId);
          }
        })
        .catch((error) => {
          logger.errorKey(error, "log.server.startFsWatcherFailed");
        });
    });

    // Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      logger.infoKey("log.server.signalReceived", { signal });

      server.close(() => {
        logger.infoKey("log.server.httpClosed");

        // Закрываем SSE и watcher
        try {
          fsWatcher.stop();
          sseHub.closeAll();
        } catch (error) {
          logger.errorKey(error, "log.server.closeSseWatcherFailed");
        }

        // Закрываем базу данных
        try {
          db.close();
          logger.infoKey("log.server.dbClosed");
          process.exit(0);
        } catch (error) {
          logger.errorKey(error, "log.server.dbCloseFailed");
          process.exit(1);
        }
      });

      // Принудительное завершение через 10 секунд
      setTimeout(() => {
        logger.errorKey(
          new Error("Force shutdown"),
          "log.server.forceShutdown"
        );
        process.exit(1);
      }, 10000);
    };

    // Обработка сигналов завершения
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    // Обработка необработанных ошибок
    process.on("unhandledRejection", (reason, promise) => {
      logger.error(
        reason instanceof Error ? reason : new Error(String(reason)),
        "Unhandled Rejection"
      );
    });

    process.on("uncaughtException", (error) => {
      logger.error(error, "Uncaught Exception");
      shutdown("uncaughtException");
    });
  } catch (error) {
    logger.errorKey(error, "log.server.startFailed");
    process.exit(1);
  }
}

// Запускаем сервер
startServer();
