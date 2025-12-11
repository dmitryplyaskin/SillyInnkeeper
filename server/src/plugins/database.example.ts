/**
 * ПРИМЕР ИСПОЛЬЗОВАНИЯ better-sqlite3
 *
 * Этот файл демонстрирует, как использовать базу данных SQLite в вашем приложении.
 * База данных доступна через req.app.locals.db в Express маршрутах
 */

import { Request, Response } from "express";
import Database from "better-sqlite3";
import { createDatabaseService } from "../services/database";

// Пример использования в роуте или сервисе
export function exampleUsage(req: Request, res: Response) {
  // Доступ к базе данных из app.locals
  const db = req.app.locals.db as Database.Database;

  // Пример 1: Простой запрос
  // const users = db.prepare('SELECT * FROM users WHERE id = ?').all(1)

  // Пример 2: Использование DatabaseService для удобной работы
  const dbService = createDatabaseService(db);

  // Запрос с возвратом всех строк
  // const allSettings = dbService.query<{ key: string; value: string }>(
  //   'SELECT * FROM settings'
  // )

  // Запрос с возвратом одной строки
  // const setting = dbService.queryOne<{ key: string; value: string }>(
  //   'SELECT * FROM settings WHERE key = ?',
  //   ['cardsFolderPath']
  // )

  // Выполнение INSERT/UPDATE/DELETE
  const result = dbService.execute(
    "INSERT INTO settings (key, value) VALUES (?, ?)",
    ["newKey", "newValue"]
  );
  console.log(
    `Вставлено строк: ${result.changes}, последний ID: ${result.lastInsertRowid}`
  );

  // Использование транзакций
  dbService.transaction((db) => {
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(
      "key1",
      "value1"
    );
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(
      "key2",
      "value2"
    );
    // Если произойдет ошибка, все изменения откатятся
  });

  // Пример использования в роуте
  const settings = dbService.query("SELECT * FROM settings");
  res.json({ settings });
}
