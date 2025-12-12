import "dotenv/config";
import express, { Express } from "express";
import Database from "better-sqlite3";
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

  // Подключение маршрутов
  app.use("/", rootRoutes);
  app.use("/api", apiRoutes);

  return { app, db };
}

export default createApp;
