import "./config/env";
import express, { Express } from "express";
import Database from "better-sqlite3";
import path from "node:path";
import { existsSync } from "node:fs";
import { initializeDatabase } from "./plugins/database";
import rootRoutes from "./routes/root";
import apiRoutes from "./routes/api";
import { SseHub } from "./services/sse-hub";
import { CardsSyncOrchestrator } from "./services/cards-sync-orchestrator";
import { FsWatcherService } from "./services/fs-watcher";

export interface AppOptions {
  dbPath?: string;
}

/**
 * Создает и настраивает Express приложение
 * @param opts Опции для инициализации приложения
 * @returns Настроенное Express приложение и экземпляр базы данных
 */
export async function createApp(
  opts?: AppOptions
): Promise<{ app: Express; db: Database.Database }> {
  const app = express();

  // Middleware для парсинга JSON
  app.use(express.json());

  // Инициализация базы данных
  const db = await initializeDatabase({ dbPath: opts?.dbPath });
  app.locals.db = db;
  const sseHub = new SseHub();
  app.locals.sseHub = sseHub;

  const cardsSyncOrchestrator = new CardsSyncOrchestrator(db, sseHub);
  app.locals.cardsSyncOrchestrator = cardsSyncOrchestrator;

  const fsWatcher = new FsWatcherService(cardsSyncOrchestrator);
  app.locals.fsWatcher = fsWatcher;

  // Служебные маршруты
  app.use("/", rootRoutes);

  // API должно иметь приоритет и не попадать под SPA fallback
  app.use("/api", apiRoutes);

  // Раздача сбилженного фронтенда: client/dist
  const clientDistPath = path.resolve(__dirname, "../../client/dist");
  if (existsSync(clientDistPath)) {
    app.use(
      express.static(clientDistPath, {
        setHeaders(res, filePath) {
          // Чтобы браузер не "залипал" на старом index.html и не тянул старые чанки
          if (filePath.endsWith("index.html")) {
            res.setHeader("Cache-Control", "no-cache");
          }
        },
      })
    );

    // SPA fallback (для роутов фронта вроде /cards/123)
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  }

  return { app, db };
}

export default createApp;
