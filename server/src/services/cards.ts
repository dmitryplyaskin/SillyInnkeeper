import Database from "better-sqlite3";
import { createDatabaseService, DatabaseService } from "./database";
import { AppError } from "../errors/app-error";

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
  | "name_desc"
  | "prompt_tokens_desc"
  | "prompt_tokens_asc"
  | "relevance";

export type CardsFtsField =
  | "description"
  | "personality"
  | "scenario"
  | "first_mes"
  | "mes_example"
  | "creator_notes"
  | "system_prompt"
  | "post_history_instructions"
  | "alternate_greetings"
  | "group_only_greetings";

export type CardsTextSearchMode = "like" | "fts";

export interface SearchCardsParams {
  library_id?: string;
  sort?: CardsSort;
  name?: string;
  q?: string;
  q_mode?: CardsTextSearchMode;
  q_fields?: CardsFtsField[];
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
  patterns?: TriState;
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

    const qRaw = typeof params.q === "string" ? params.q.trim() : "";
    const hasQ = qRaw.length > 0;
    const qMode: CardsTextSearchMode =
      params.q_mode === "fts" ? "fts" : "like";

    const sort = params.sort ?? "created_at_desc";
    const effectiveSort: Exclude<CardsSort, "relevance"> | "relevance" =
      sort === "relevance" && (!hasQ || qMode !== "fts") ? "created_at_desc" : sort;

    if (params.library_id && params.library_id.trim().length > 0) {
      where.push(`c.library_id = ?`);
      sqlParams.push(params.library_id.trim());
    }

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

    // pattern matches filter (cached)
    const patterns = params.patterns ?? "any";
    if (patterns !== "any") {
      const lastReady = this.dbService.queryOne<{ rules_hash: string }>(
        `
        SELECT rules_hash
        FROM pattern_rules_cache
        WHERE status = 'ready'
        ORDER BY created_at DESC
        LIMIT 1
      `
      );
      const rulesHash =
        typeof lastReady?.rules_hash === "string" && lastReady.rules_hash.trim().length > 0
          ? lastReady.rules_hash.trim()
          : null;

      if (!rulesHash) {
        if (patterns === "1") return [];
        // patterns === "0": if no cache exists yet, treat as "no matches known" and return all.
      } else if (patterns === "1") {
        where.push(
          `EXISTS (SELECT 1 FROM pattern_matches pm WHERE pm.rules_hash = ? AND pm.card_id = c.id)`
        );
        sqlParams.push(rulesHash);
      } else if (patterns === "0") {
        where.push(
          `NOT EXISTS (SELECT 1 FROM pattern_matches pm WHERE pm.rules_hash = ? AND pm.card_id = c.id)`
        );
        sqlParams.push(rulesHash);
      }
    }

    const joinSql = (() => {
      if (!hasQ || qMode !== "fts") return "";
      const exists = this.dbService.queryOne<{ ok: number }>(
        `SELECT 1 as ok FROM sqlite_master WHERE type='table' AND name='cards_fts' LIMIT 1`
      );
      if (!exists?.ok) {
        throw new AppError({ status: 500, code: "api.db.fts5_not_available" });
      }
      return `JOIN cards_fts ON cards_fts.rowid = c.rowid`;
    })();

    if (hasQ) {
      const requestedFields = Array.isArray(params.q_fields)
        ? (params.q_fields as CardsFtsField[]).filter((f) => typeof f === "string")
        : [];

      const fieldToColumn = (f: CardsFtsField): string => {
        if (f === "alternate_greetings") return "alternate_greetings_text";
        if (f === "group_only_greetings") return "group_only_greetings_text";
        return f;
      };

      if (qMode === "fts") {
        const maxLen = 200;
        if (qRaw.length > maxLen) {
          throw new AppError({
            status: 400,
            code: "api.cards.invalid_search_query",
          });
        }

        const extractSearchTokens = (input: string): string[] => {
          return input
            .trim()
            .split(/[^\p{L}\p{N}]+/gu)
            .map((t) => t.trim())
            .filter((t) => t.length > 0);
        };

        const tokens = extractSearchTokens(qRaw).slice(0, 12);

        if (tokens.length === 0) {
          throw new AppError({
            status: 400,
            code: "api.cards.invalid_search_query",
          });
        }

        // Quote each token to avoid treating keywords like OR/NOT as operators
        // and reduce "fts syntax error" surface.
        const terms = tokens.map((t) => `"${t}*"`).join(" ");

        const matchQuery = (() => {
          if (!requestedFields || requestedFields.length === 0) {
            return terms;
          }
          const cols = requestedFields.map((f) => fieldToColumn(f));
          return cols.map((c) => `${c}:(${terms})`).join(" OR ");
        })();

        where.push(`cards_fts MATCH ?`);
        sqlParams.push(matchQuery);
      } else {
        // LIKE mode: literal substring search across selected columns
        const maxLen = 1000;
        if (qRaw.length > maxLen) {
          throw new AppError({
            status: 400,
            code: "api.cards.invalid_search_query",
          });
        }

        const escapeLike = (input: string): string => {
          // Escape order matters: backslash first.
          return input.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
        };

        const allColumns: string[] = [
          "description",
          "personality",
          "scenario",
          "first_mes",
          "mes_example",
          "creator_notes",
          "system_prompt",
          "post_history_instructions",
          "alternate_greetings_text",
          "group_only_greetings_text",
        ];

        const cols = (() => {
          if (!requestedFields || requestedFields.length === 0) return allColumns;
          const mapped = requestedFields.map((f) => fieldToColumn(f));
          // Keep unique and stable order.
          const seen = new Set<string>();
          const out: string[] = [];
          for (const c of mapped) {
            if (seen.has(c)) continue;
            seen.add(c);
            out.push(c);
          }
          return out.length > 0 ? out : allColumns;
        })();

        const pattern = `%${escapeLike(qRaw)}%`;
        const orSql = cols
          .map((c) => `c.${c} LIKE ? ESCAPE '\\' COLLATE NOCASE`)
          .join(" OR ");
        where.push(`(${orSql})`);
        for (let i = 0; i < cols.length; i++) sqlParams.push(pattern);
      }
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const orderBy = (() => {
      if (
        qMode === "fts" &&
        hasQ &&
        (effectiveSort === "relevance" || params.sort == null)
      ) {
        return `ORDER BY bm25(cards_fts) ASC`;
      }

      switch (effectiveSort) {
        case "created_at_asc":
          return `ORDER BY c.created_at ASC`;
        case "name_asc":
          return `ORDER BY c.name COLLATE NOCASE ASC, c.created_at DESC`;
        case "name_desc":
          return `ORDER BY c.name COLLATE NOCASE DESC, c.created_at DESC`;
        case "prompt_tokens_asc":
          return `ORDER BY c.prompt_tokens_est ASC, c.created_at DESC`;
        case "prompt_tokens_desc":
          return `ORDER BY c.prompt_tokens_est DESC, c.created_at DESC`;
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
          SELECT COALESCE(
            c.primary_file_path,
            (
              SELECT cf.file_path
              FROM card_files cf
              WHERE cf.card_id = c.id
              ORDER BY cf.file_birthtime ASC, cf.file_path ASC
              LIMIT 1
            )
          )
        ) as file_path
      FROM cards c
      ${joinSql}
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
        alternate_greetings_count: Number.isFinite(
          row.alternate_greetings_count
        )
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
