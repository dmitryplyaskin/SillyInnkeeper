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
      file_birthtime INTEGER NOT NULL,
      file_size INTEGER NOT NULL,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    );
    
    -- Индексы для производительности
    CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name);
    CREATE INDEX IF NOT EXISTS idx_cards_created_at ON cards(created_at);
    CREATE INDEX IF NOT EXISTS idx_card_files_card_id ON card_files(card_id);
    
    -- Таблица тегов
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      rawName TEXT NOT NULL UNIQUE
    );
    
    -- Индексы для тегов
    CREATE INDEX IF NOT EXISTS idx_tags_rawName ON tags(rawName);
    CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
  `);

  // Расширения схемы для поиска/фильтрации (безопасно для уже существующей БД)
  // ALTER TABLE ADD COLUMN в SQLite не поддерживает IF NOT EXISTS, поэтому проверяем PRAGMA table_info.
  const addColumnIfMissing = (
    tableName: string,
    columnName: string,
    columnDefSql: string
  ) => {
    const columns = db
      .prepare(`PRAGMA table_info(${tableName})`)
      .all() as Array<{ name: string }>;
    const exists = columns.some((c) => c.name === columnName);
    if (exists) return;
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefSql};`);
  };

  // cards: дополнительные поля + флаги наличия + счётчики
  addColumnIfMissing("cards", "personality", "personality TEXT");
  addColumnIfMissing("cards", "scenario", "scenario TEXT");
  addColumnIfMissing("cards", "first_mes", "first_mes TEXT");
  addColumnIfMissing("cards", "mes_example", "mes_example TEXT");
  addColumnIfMissing("cards", "creator_notes", "creator_notes TEXT");
  addColumnIfMissing("cards", "system_prompt", "system_prompt TEXT");
  addColumnIfMissing(
    "cards",
    "post_history_instructions",
    "post_history_instructions TEXT"
  );
  addColumnIfMissing(
    "cards",
    "alternate_greetings_count",
    "alternate_greetings_count INTEGER NOT NULL DEFAULT 0"
  );
  addColumnIfMissing(
    "cards",
    "has_creator_notes",
    "has_creator_notes INTEGER NOT NULL DEFAULT 0"
  );
  addColumnIfMissing(
    "cards",
    "has_system_prompt",
    "has_system_prompt INTEGER NOT NULL DEFAULT 0"
  );
  addColumnIfMissing(
    "cards",
    "has_post_history_instructions",
    "has_post_history_instructions INTEGER NOT NULL DEFAULT 0"
  );
  addColumnIfMissing(
    "cards",
    "has_personality",
    "has_personality INTEGER NOT NULL DEFAULT 0"
  );
  addColumnIfMissing(
    "cards",
    "has_scenario",
    "has_scenario INTEGER NOT NULL DEFAULT 0"
  );
  addColumnIfMissing(
    "cards",
    "has_mes_example",
    "has_mes_example INTEGER NOT NULL DEFAULT 0"
  );
  addColumnIfMissing(
    "cards",
    "has_character_book",
    "has_character_book INTEGER NOT NULL DEFAULT 0"
  );
  addColumnIfMissing(
    "cards",
    "prompt_tokens_est",
    "prompt_tokens_est INTEGER NOT NULL DEFAULT 0"
  );

  // Индексы для часто используемых фильтров
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_cards_creator ON cards(creator);
    CREATE INDEX IF NOT EXISTS idx_cards_spec_version ON cards(spec_version);
    CREATE INDEX IF NOT EXISTS idx_cards_has_creator_notes ON cards(has_creator_notes);
    CREATE INDEX IF NOT EXISTS idx_cards_has_system_prompt ON cards(has_system_prompt);
    CREATE INDEX IF NOT EXISTS idx_cards_has_post_history_instructions ON cards(has_post_history_instructions);
    CREATE INDEX IF NOT EXISTS idx_cards_has_personality ON cards(has_personality);
    CREATE INDEX IF NOT EXISTS idx_cards_has_scenario ON cards(has_scenario);
    CREATE INDEX IF NOT EXISTS idx_cards_has_mes_example ON cards(has_mes_example);
    CREATE INDEX IF NOT EXISTS idx_cards_has_character_book ON cards(has_character_book);
    CREATE INDEX IF NOT EXISTS idx_cards_alternate_greetings_count ON cards(alternate_greetings_count);
    CREATE INDEX IF NOT EXISTS idx_cards_prompt_tokens_est ON cards(prompt_tokens_est);
  `);

  // card_files: folder_path для фильтрации/группировки по папкам
  addColumnIfMissing("card_files", "folder_path", "folder_path TEXT");
  // card_files: file_birthtime — время создания файла (нужно для корректного created_at карточки)
  // NOT NULL + DEFAULT нужен для старых БД.
  addColumnIfMissing(
    "card_files",
    "file_birthtime",
    "file_birthtime INTEGER NOT NULL DEFAULT 0"
  );
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_card_files_folder_path ON card_files(folder_path);
  `);

  // Связь карточек и тегов для точной фильтрации
  db.exec(`
    CREATE TABLE IF NOT EXISTS card_tags (
      card_id TEXT NOT NULL,
      tag_rawName TEXT NOT NULL,
      PRIMARY KEY (card_id, tag_rawName),
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_rawName) REFERENCES tags(rawName) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_card_tags_tag_rawName ON card_tags(tag_rawName);
    CREATE INDEX IF NOT EXISTS idx_card_tags_card_id ON card_tags(card_id);
  `);
}
