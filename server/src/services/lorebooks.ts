import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { createDatabaseService, DatabaseService } from "./database";
import { computeLorebookHash } from "./card-hash";

export interface LorebookRow {
  id: string;
  content_hash: string;
  name: string | null;
  description: string | null;
  spec: string;
  data_json: string;
  created_at: number;
  updated_at: number;
}

export interface LorebookSummary {
  id: string;
  name: string | null;
  description: string | null;
  spec: string;
  created_at: number;
  updated_at: number;
  cards_count?: number;
}

export interface ListLorebooksParams {
  limit?: number;
  offset?: number;
  name?: string;
  card_id?: string;
}

export class LorebooksService {
  constructor(private dbService: DatabaseService) {}

  /**
   * Получает или создаёт лорабук на основе character_book из карточки
   * и привязывает его к cardId.
   */
  upsertFromCharacterBook(opts: {
    cardId: string;
    characterBook: unknown;
    now: number;
  }): string | null {
    const { cardId, characterBook, now } = opts;

    if (!characterBook || typeof characterBook !== "object") {
      // Нет валидного character_book — не создаём связей.
      this.dbService.execute("DELETE FROM card_lorebooks WHERE card_id = ?", [
        cardId,
      ]);
      return null;
    }

    const hash = computeLorebookHash(characterBook);

    // Пытаемся найти существующий лорабук по content_hash
    const existing = this.dbService.queryOne<LorebookRow>(
      `
      SELECT id, content_hash, name, description, spec, data_json, created_at, updated_at
      FROM lorebooks
      WHERE content_hash = ?
      LIMIT 1
    `,
      [hash]
    );

    let lorebookId: string;

    if (existing) {
      lorebookId = existing.id;

      // Опционально обновляем updated_at для статистики
      this.dbService.execute(
        "UPDATE lorebooks SET updated_at = ? WHERE id = ?",
        [now, lorebookId]
      );
    } else {
      lorebookId = randomUUID();

      // Имя/описание берём из самого объекта, если есть
      const src = characterBook as Record<string, unknown>;
      const name =
        typeof src.name === "string" && src.name.trim().length > 0
          ? src.name.trim()
          : null;
      const description =
        typeof src.description === "string" && src.description.trim().length > 0
          ? src.description.trim()
          : null;

      const dataJson = JSON.stringify(characterBook);

      try {
        this.dbService.execute(
          `
          INSERT INTO lorebooks (
            id,
            content_hash,
            name,
            description,
            spec,
            data_json,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
          [lorebookId, hash, name, description, "inline", dataJson, now, now]
        );
      } catch (e) {
        // Гонка: другой поток мог вставить тот же content_hash между SELECT и INSERT.
        const dup = this.dbService.queryOne<LorebookRow>(
          `
          SELECT id, content_hash, name, description, spec, data_json, created_at, updated_at
          FROM lorebooks
          WHERE content_hash = ?
          LIMIT 1
        `,
          [hash]
        );
        if (!dup) throw e;
        lorebookId = dup.id;
      }
    }

    // В проекте пока предполагается максимум один лорабук на карточку,
    // поэтому перед привязкой очищаем старые связи.
    this.dbService.execute("DELETE FROM card_lorebooks WHERE card_id = ?", [
      cardId,
    ]);

    // Привязываем карточку к лорабуку (idempotent)
    this.dbService.execute(
      `
      INSERT OR IGNORE INTO card_lorebooks (card_id, lorebook_id)
      VALUES (?, ?)
    `,
      [cardId, lorebookId]
    );

    return lorebookId;
  }

  /**
   * Удаляет все связи card_lorebooks для карточки (используется,
   * если character_book был удалён из карточки).
   */
  detachCard(cardId: string): void {
    this.dbService.execute("DELETE FROM card_lorebooks WHERE card_id = ?", [
      cardId,
    ]);
  }

  list(params: ListLorebooksParams = {}): LorebookSummary[] {
    const where: string[] = [];
    const sqlParams: unknown[] = [];

    if (params.name && params.name.trim().length > 0) {
      where.push("l.name LIKE ? COLLATE NOCASE");
      sqlParams.push(`%${params.name.trim()}%`);
    }

    if (params.card_id && params.card_id.trim().length > 0) {
      where.push(
        "EXISTS (SELECT 1 FROM card_lorebooks cl WHERE cl.lorebook_id = l.id AND cl.card_id = ?)"
      );
      sqlParams.push(params.card_id.trim());
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const limit =
      typeof params.limit === "number" && Number.isFinite(params.limit)
        ? Math.max(1, Math.floor(params.limit))
        : undefined;
    const offset =
      typeof params.offset === "number" && Number.isFinite(params.offset)
        ? Math.max(0, Math.floor(params.offset))
        : undefined;

    // Если limit не передан — отдаём все строки (без LIMIT).
    // Если offset передан без limit — используем "LIMIT -1 OFFSET N" (SQLite).
    const limitSql =
      typeof limit === "number"
        ? "LIMIT ? OFFSET ?"
        : typeof offset === "number"
        ? "LIMIT -1 OFFSET ?"
        : "";

    const sql = `
      SELECT
        l.id,
        l.name,
        l.description,
        l.spec,
        l.created_at,
        l.updated_at,
        (
          SELECT COUNT(*) FROM card_lorebooks cl WHERE cl.lorebook_id = l.id
        ) as cards_count
      FROM lorebooks l
      ${whereSql}
      ORDER BY l.created_at DESC
      ${limitSql}
    `;

    const rows = this.dbService.query<{
      id: string;
      name: string | null;
      description: string | null;
      spec: string;
      created_at: number;
      updated_at: number;
      cards_count: number;
    }>(
      sql,
      typeof limit === "number"
        ? [...sqlParams, limit, typeof offset === "number" ? offset : 0]
        : typeof offset === "number"
        ? [...sqlParams, offset]
        : sqlParams
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      spec: row.spec,
      created_at: row.created_at,
      updated_at: row.updated_at,
      cards_count: Number.isFinite(row.cards_count) ? row.cards_count : 0,
    }));
  }

  getById(
    id: string
  ):
    | (LorebookRow & { cards: Array<{ id: string; name: string | null }> })
    | null {
    const lorebook = this.dbService.queryOne<LorebookRow>(
      `
      SELECT id, content_hash, name, description, spec, data_json, created_at, updated_at
      FROM lorebooks
      WHERE id = ?
      LIMIT 1
    `,
      [id]
    );

    if (!lorebook) return null;

    const cards = this.dbService.query<{ id: string; name: string | null }>(
      `
      SELECT c.id, c.name
      FROM cards c
      JOIN card_lorebooks cl ON cl.card_id = c.id
      WHERE cl.lorebook_id = ?
      ORDER BY c.created_at DESC
    `,
      [id]
    );

    return {
      ...lorebook,
      cards,
    };
  }

  createFromData(
    data: unknown,
    now: number
  ): { row: LorebookRow; is_duplicate: boolean } {
    if (!data || typeof data !== "object") {
      throw new Error("Lorebook data must be an object");
    }

    const hash = computeLorebookHash(data);

    const existing = this.dbService.queryOne<LorebookRow>(
      `
      SELECT id, content_hash, name, description, spec, data_json, created_at, updated_at
      FROM lorebooks
      WHERE content_hash = ?
      LIMIT 1
    `,
      [hash]
    );

    if (existing) {
      return { row: existing, is_duplicate: true };
    }

    const src = data as Record<string, unknown>;
    const name =
      typeof src.name === "string" && src.name.trim().length > 0
        ? src.name.trim()
        : null;
    const description =
      typeof src.description === "string" && src.description.trim().length > 0
        ? src.description.trim()
        : null;

    const dataJson = JSON.stringify(data);
    const id = randomUUID();

    try {
      this.dbService.execute(
        `
        INSERT INTO lorebooks (
          id,
          content_hash,
          name,
          description,
          spec,
          data_json,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [id, hash, name, description, "lorebook_v3", dataJson, now, now]
      );
    } catch (e) {
      // Гонка: другой запрос мог вставить тот же content_hash между SELECT и INSERT.
      const dup = this.dbService.queryOne<LorebookRow>(
        `
        SELECT id, content_hash, name, description, spec, data_json, created_at, updated_at
        FROM lorebooks
        WHERE content_hash = ?
        LIMIT 1
      `,
        [hash]
      );
      if (!dup) throw e;
      return { row: dup, is_duplicate: true };
    }

    return {
      row: {
        id,
        content_hash: hash,
        name,
        description,
        spec: "lorebook_v3",
        data_json: dataJson,
        created_at: now,
        updated_at: now,
      },
      is_duplicate: false,
    };
  }

  update(id: string, data: unknown, now: number): LorebookRow {
    if (!data || typeof data !== "object") {
      throw new Error("Lorebook data must be an object");
    }

    const existing = this.dbService.queryOne<LorebookRow>(
      `
      SELECT id, content_hash, name, description, spec, data_json, created_at, updated_at
      FROM lorebooks
      WHERE id = ?
      LIMIT 1
    `,
      [id]
    );

    if (!existing) {
      throw new Error("Lorebook not found");
    }

    const newHash = computeLorebookHash(data);

    if (newHash !== existing.content_hash) {
      const dup = this.dbService.queryOne<LorebookRow>(
        `
        SELECT id, content_hash, name, description, spec, data_json, created_at, updated_at
        FROM lorebooks
        WHERE content_hash = ?
        AND id <> ?
        LIMIT 1
      `,
        [newHash, id]
      );

      if (dup) {
        const err: any = new Error("Lorebook with same content already exists");
        err.code = "LOREBOOK_DUPLICATE";
        err.existingId = dup.id;
        throw err;
      }
    }

    const src = data as Record<string, unknown>;
    const name =
      typeof src.name === "string" && src.name.trim().length > 0
        ? src.name.trim()
        : null;
    const description =
      typeof src.description === "string" && src.description.trim().length > 0
        ? src.description.trim()
        : null;

    const dataJson = JSON.stringify(data);

    this.dbService.execute(
      `
      UPDATE lorebooks
      SET
        content_hash = ?,
        name = ?,
        description = ?,
        data_json = ?,
        updated_at = ?
      WHERE id = ?
    `,
      [newHash, name, description, dataJson, now, id]
    );

    return {
      id,
      content_hash: newHash,
      name,
      description,
      spec: existing.spec,
      data_json: dataJson,
      created_at: existing.created_at,
      updated_at: now,
    };
  }

  delete(id: string, opts?: { force?: boolean }): void {
    const exists = this.dbService.queryOne<{ id: string }>(
      `SELECT id FROM lorebooks WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!exists) {
      throw new Error("Lorebook not found");
    }

    const hasCards = this.dbService.queryOne<{ count: number }>(
      `
      SELECT COUNT(*) as count
      FROM card_lorebooks
      WHERE lorebook_id = ?
    `,
      [id]
    );

    const usedCount = hasCards?.count ?? 0;

    if (usedCount > 0 && !opts?.force) {
      const err: any = new Error(
        "Cannot delete lorebook: it is still linked to cards"
      );
      err.code = "LOREBOOK_IN_USE";
      err.cardsCount = usedCount;
      throw err;
    }

    this.dbService.transaction((db) => {
      const svc = createDatabaseService(db);
      svc.execute("DELETE FROM card_lorebooks WHERE lorebook_id = ?", [id]);
      svc.execute("DELETE FROM lorebooks WHERE id = ?", [id]);
    });
  }
}

export function createLorebooksService(
  db: Database.Database
): LorebooksService {
  const dbService = createDatabaseService(db);
  return new LorebooksService(dbService);
}
