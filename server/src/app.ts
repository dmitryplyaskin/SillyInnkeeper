import "dotenv/config";
import express, { Express } from "express";
import Database from "better-sqlite3";
import { initializeDatabase } from "./plugins/database";
import rootRoutes from "./routes/root";
import apiRoutes from "./routes/api";

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

  // Подключение маршрутов
  app.use("/", rootRoutes);
  app.use("/api", apiRoutes);

  return { app, db };
}

export default createApp;
