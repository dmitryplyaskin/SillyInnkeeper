import Database from "better-sqlite3";
import { createDatabaseService, DatabaseService } from "./database";

export interface CardListItem {
  id: string;
  name: string | null;
  tags: string[] | null;
  creator: string | null;
  avatar_url: string;
  file_path: string | null;
  spec_version: string | null;
  created_at: number;
  alternate_greetings_count: number;
  has_character_book: boolean;
  prompt_tokens_est: number;
}

export type TriState = "any" | "1" | "0";

export type CardsSort =
  | "created_at_desc"
  | "created_at_asc"
  | "name_asc"
  | "name_desc";

export interface SearchCardsParams {
  sort?: CardsSort;
  name?: string;
  creators?: string[];
  spec_versions?: string[];
  tags?: string[]; // rawName (normalized)
  created_from_ms?: number;
  created_to_ms?: number;
  has_creator_notes?: TriState;
  has_system_prompt?: TriState;
  has_post_history_instructions?: TriState;
  has_personality?: TriState;
  has_scenario?: TriState;
  has_mes_example?: TriState;
  has_character_book?: TriState;
  has_alternate_greetings?: TriState;
  alternate_greetings_min?: number;
  prompt_tokens_min?: number;
  prompt_tokens_max?: number;
}

/**
 * Сервис для работы с карточками
 */
export class CardsService {
  constructor(private dbService: DatabaseService) {}

  /**
   * Получает список всех карточек (без data_json для производительности)
   * @returns Массив карточек с основными полями
   */
  getCardsList(): CardListItem[] {
    return this.searchCards({ sort: "created_at_desc" });
  }

  /**
   * Поиск/фильтрация карточек (v1, без пагинации)
   */
  searchCards(params: SearchCardsParams = {}): CardListItem[] {
    const where: string[] = [];
    const sqlParams: unknown[] = [];

    const sort = params.sort ?? "created_at_desc";

    if (params.name && params.name.trim().length > 0) {
      where.push(`c.name LIKE ? COLLATE NOCASE`);
      sqlParams.push(`%${params.name.trim()}%`);
    }

    if (params.creators && params.creators.length > 0) {
      const placeholders = params.creators.map(() => "?").join(", ");
      where.push(`c.creator IN (${placeholders})`);
      sqlParams.push(...params.creators);
    }

    if (params.spec_versions && params.spec_versions.length > 0) {
      const placeholders = params.spec_versions.map(() => "?").join(", ");
      where.push(`c.spec_version IN (${placeholders})`);
      sqlParams.push(...params.spec_versions);
    }

    if (params.tags && params.tags.length > 0) {
      for (const tagRawName of params.tags) {
        where.push(
          `EXISTS (SELECT 1 FROM card_tags ct WHERE ct.card_id = c.id AND ct.tag_rawName = ?)`
        );
        sqlParams.push(tagRawName);
      }
    }

    if (
      typeof params.created_from_ms === "number" &&
      Number.isFinite(params.created_from_ms)
    ) {
      where.push(`c.created_at >= ?`);
      sqlParams.push(params.created_from_ms);
    }

    if (
      typeof params.created_to_ms === "number" &&
      Number.isFinite(params.created_to_ms)
    ) {
      where.push(`c.created_at <= ?`);
      sqlParams.push(params.created_to_ms);
    }

    const addTriState = (column: string, value: TriState | undefined) => {
      if (!value || value === "any") return;
      where.push(`${column} = ?`);
      sqlParams.push(value === "1" ? 1 : 0);
    };

    addTriState("c.has_creator_notes", params.has_creator_notes);
    addTriState("c.has_system_prompt", params.has_system_prompt);
    addTriState(
      "c.has_post_history_instructions",
      params.has_post_history_instructions
    );
    addTriState("c.has_personality", params.has_personality);
    addTriState("c.has_scenario", params.has_scenario);
    addTriState("c.has_mes_example", params.has_mes_example);
    addTriState("c.has_character_book", params.has_character_book);

    if (
      params.has_alternate_greetings &&
      params.has_alternate_greetings !== "any"
    ) {
      if (params.has_alternate_greetings === "1") {
        where.push(`c.alternate_greetings_count >= 1`);
      } else {
        where.push(`c.alternate_greetings_count = 0`);
      }
    }

    if (
      typeof params.alternate_greetings_min === "number" &&
      Number.isFinite(params.alternate_greetings_min) &&
      params.alternate_greetings_min > 0
    ) {
      where.push(`c.alternate_greetings_count >= ?`);
      sqlParams.push(params.alternate_greetings_min);
    }

    // prompt_tokens_est range (0 => ignore)
    const tokensMinRaw = params.prompt_tokens_min;
    const tokensMaxRaw = params.prompt_tokens_max;
    const tokensMin =
      typeof tokensMinRaw === "number" && Number.isFinite(tokensMinRaw)
        ? Math.max(0, Math.floor(tokensMinRaw))
        : 0;
    let tokensMax =
      typeof tokensMaxRaw === "number" && Number.isFinite(tokensMaxRaw)
        ? Math.max(0, Math.floor(tokensMaxRaw))
        : 0;

    if (tokensMin > 0 && tokensMax > 0 && tokensMax < tokensMin) {
      tokensMax = tokensMin;
    }

    if (tokensMin > 0) {
      where.push(`c.prompt_tokens_est >= ?`);
      sqlParams.push(tokensMin);
    }
    if (tokensMax > 0) {
      where.push(`c.prompt_tokens_est <= ?`);
      sqlParams.push(tokensMax);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const orderBy = (() => {
      switch (sort) {
        case "created_at_asc":
          return `ORDER BY c.created_at ASC`;
        case "name_asc":
          return `ORDER BY c.name COLLATE NOCASE ASC, c.created_at DESC`;
        case "name_desc":
          return `ORDER BY c.name COLLATE NOCASE DESC, c.created_at DESC`;
        case "created_at_desc":
        default:
          return `ORDER BY c.created_at DESC`;
      }
    })();

    // SQL запрос выбирает только легкие колонки, без data_json
    // Подзапрос для получения первого file_path из card_files
    const sql = `
      SELECT 
        c.id,
        c.name,
        c.tags,
        c.creator,
        c.spec_version,
        c.created_at,
        c.alternate_greetings_count,
        c.has_character_book,
        c.prompt_tokens_est,
        c.avatar_path,
        (
          SELECT cf.file_path 
          FROM card_files cf 
          WHERE cf.card_id = c.id 
          LIMIT 1
        ) as file_path
      FROM cards c
      ${whereSql}
      ${orderBy}
    `;

    const rows = this.dbService.query<{
      id: string;
      name: string | null;
      tags: string | null;
      creator: string | null;
      spec_version: string | null;
      created_at: number;
      alternate_greetings_count: number;
      has_character_book: number;
      prompt_tokens_est: number;
      avatar_path: string | null;
      file_path: string | null;
    }>(sql, sqlParams);

    return rows.map((row) => {
      let tags: string[] | null = null;
      if (row.tags) {
        try {
          tags = JSON.parse(row.tags) as string[];
        } catch {
          tags = null;
        }
      }

      const avatarUrl = row.avatar_path
        ? `/api/thumbnail/${row.id}`
        : "/api/thumbnail/default";

      return {
        id: row.id,
        name: row.name,
        tags,
        creator: row.creator,
        avatar_url: avatarUrl,
        file_path: row.file_path,
        spec_version: row.spec_version,
        created_at: row.created_at,
        alternate_greetings_count: Number.isFinite(row.alternate_greetings_count)
          ? row.alternate_greetings_count
          : 0,
        has_character_book: row.has_character_book === 1,
        prompt_tokens_est: Number.isFinite(row.prompt_tokens_est)
          ? row.prompt_tokens_est
          : 0,
      };
    });
  }
}

/**
 * Создает экземпляр CardsService из экземпляра Database
 */
export function createCardsService(db: Database.Database): CardsService {
  const dbService = createDatabaseService(db);
  return new CardsService(dbService);
}
