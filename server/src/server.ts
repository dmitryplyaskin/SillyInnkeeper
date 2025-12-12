import "dotenv/config";
import { createApp } from "./app";
import { initializeScannerWithOrchestrator } from "./plugins/scanner";
import { logger } from "./utils/logger";
import Database from "better-sqlite3";
import { getSettings } from "./services/settings";
import { existsSync } from "node:fs";
import type { SseHub } from "./services/sse-hub";
import type { FsWatcherService } from "./services/fs-watcher";
import type { CardsSyncOrchestrator } from "./services/cards-sync-orchestrator";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer(): Promise<void> {
  try {
    // Создаем Express приложение и инициализируем базу данных
    const { app, db } = await createApp();
    const sseHub = (app.locals as any).sseHub as SseHub;
    const fsWatcher = (app.locals as any).fsWatcher as FsWatcherService;
    const orchestrator = (app.locals as any)
      .cardsSyncOrchestrator as CardsSyncOrchestrator;

    // Запускаем сервер
    const server = app.listen(PORT, () => {
      logger.info(`Сервер запущен на порту ${PORT}`);

      // Инициализируем сканер после запуска сервера
      initializeScannerWithOrchestrator(orchestrator).catch((error) => {
        logger.error(error, "Ошибка при инициализации сканера");
      });

      // Запускаем FS watcher (если cardsFolderPath указан)
      getSettings()
        .then((settings) => {
          const p = settings.cardsFolderPath;
          if (p && existsSync(p)) {
            fsWatcher.start(p);
          }
        })
        .catch((error) => {
          logger.error(error, "Ошибка при запуске FS watcher");
        });
    });

    // Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`Получен сигнал ${signal}, начинаем graceful shutdown...`);

      server.close(() => {
        logger.info("HTTP сервер закрыт");

        // Закрываем SSE и watcher
        try {
          fsWatcher.stop();
          sseHub.closeAll();
        } catch (error) {
          logger.error(error, "Ошибка при закрытии SSE/watcher");
        }

        // Закрываем базу данных
        try {
          db.close();
          logger.info("База данных закрыта");
          process.exit(0);
        } catch (error) {
          logger.error(error, "Ошибка при закрытии базы данных");
          process.exit(1);
        }
      });

      // Принудительное завершение через 10 секунд
      setTimeout(() => {
        logger.error(
          new Error("Принудительное завершение"),
          "Graceful shutdown не завершился вовремя"
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
    logger.error(error, "Ошибка при запуске сервера");
    process.exit(1);
  }
}

// Запускаем сервер
startServer();
