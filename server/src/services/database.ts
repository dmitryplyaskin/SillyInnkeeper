import Database from "better-sqlite3";

/**
 * Утилиты для работы с базой данных SQLite
 */
export class DatabaseService {
  constructor(private db: Database.Database) {}

  /**
   * Выполняет SQL запрос и возвращает результат
   * @param sql SQL запрос
   * @param params Параметры для запроса
   * @returns Результат выполнения запроса
   */
  query<T = unknown>(sql: string, params: unknown[] = []): T[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  /**
   * Выполняет SQL запрос и возвращает первую строку результата
   * @param sql SQL запрос
   * @param params Параметры для запроса
   * @returns Первая строка результата или undefined
   */
  queryOne<T = unknown>(sql: string, params: unknown[] = []): T | undefined {
    const stmt = this.db.prepare(sql);
    return stmt.get(...params) as T | undefined;
  }

  /**
   * Выполняет SQL запрос (INSERT, UPDATE, DELETE) и возвращает информацию об изменениях
   * @param sql SQL запрос
   * @param params Параметры для запроса
   * @returns Информация об изменениях
   */
  execute(sql: string, params: unknown[] = []): Database.RunResult {
    const stmt = this.db.prepare(sql);
    return stmt.run(...params);
  }

  /**
   * Выполняет несколько SQL запросов в транзакции
   * @param callback Функция, которая выполняет запросы
   * @returns Результат выполнения callback
   */
  transaction<T>(callback: (db: Database.Database) => T): T {
    return this.db.transaction(callback)(this.db);
  }

  /**
   * Выполняет SQL запрос без параметров (для DDL операций)
   * @param sql SQL запрос
   */
  exec(sql: string): void {
    this.db.exec(sql);
  }

  /**
   * Подготавливает SQL запрос для многократного использования
   * @param sql SQL запрос
   * @returns Подготовленный statement
   */
  prepare(sql: string): Database.Statement {
    return this.db.prepare(sql);
  }
}

/**
 * Создает экземпляр DatabaseService из экземпляра Database
 */
export function createDatabaseService(db: Database.Database): DatabaseService {
  return new DatabaseService(db);
}
