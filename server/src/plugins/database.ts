import Database from "better-sqlite3";
import { join } from "node:path";
import { ensureDir } from "fs-extra";

export interface DatabasePluginOptions {
  // Опции для плагина базы данных
  dbPath?: string;
}

/**
 * Инициализирует подключение к базе данных
 * @param opts Опции для инициализации базы данных
 * @returns Экземпляр Database
 */
export async function initializeDatabase(
  opts?: DatabasePluginOptions
): Promise<Database.Database> {
  // Путь к базе данных (по умолчанию в папке data)
  const dbPath = opts?.dbPath || join(process.cwd(), "data", "database.db");

  // Убеждаемся, что папка data существует
  await ensureDir(join(process.cwd(), "data"));

  // Создаем подключение к базе данных
  const db = new Database(dbPath);

  // Включаем WAL режим для лучшей производительности
  db.pragma("journal_mode = WAL");

  // Включаем foreign keys
  db.pragma("foreign_keys = ON");

  // Инициализируем схему базы данных (если нужно)
  initializeSchema(db);

  return db;
}

/**
 * Инициализирует схему базы данных
 * Создает необходимые таблицы, если они не существуют
 */
function initializeSchema(db: Database.Database): void {
  // Пример создания таблицы настроек
  // Можно расширить по необходимости
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
    
    -- Таблица карточек (метаданные)
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      tags TEXT,
      creator TEXT,
      spec_version TEXT,
      avatar_path TEXT,
      created_at INTEGER NOT NULL,
      data_json TEXT NOT NULL
    );
    
    -- Таблица физических файлов карточек
    CREATE TABLE IF NOT EXISTS card_files (
      file_path TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      file_mtime INTEGER NOT NULL,
      file_size INTEGER NOT NULL,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    );
    
    -- Индексы для производительности
    CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name);
    CREATE INDEX IF NOT EXISTS idx_cards_created_at ON cards(created_at);
    CREATE INDEX IF NOT EXISTS idx_card_files_card_id ON card_files(card_id);
  `);
}
