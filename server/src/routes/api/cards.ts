import { Router, Request, Response } from "express";
import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createCardsService } from "../../services/cards";
import { logger } from "../../utils/logger";
import type {
  CardsSort,
  SearchCardsParams,
  TriState,
} from "../../services/cards";
import { createCardsFiltersService } from "../../services/cards-filters";
import { getSettings } from "../../services/settings";
import { getOrCreateLibraryId } from "../../services/libraries";
import { AppError } from "../../errors/app-error";
import { sendError } from "../../errors/http";
import { buildPngWithCcv3TextChunk } from "../../services/png-export";
import {
  makeAttachmentContentDisposition,
  sanitizeWindowsFilenameBase,
} from "../../utils/filename";

const router = Router();

// Middleware для получения базы данных из app.locals
function getDb(req: Request): Database.Database {
  return req.app.locals.db as Database.Database;
}

function safeJsonParse<T = unknown>(value: unknown): T | null {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v : String(v)))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  return v.length > 0 ? v : undefined;
}

function parseStringArray(query: Request["query"], key: string): string[] {
  const raw = (query as any)[key] ?? (query as any)[`${key}[]`];
  const values = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  return values
    .map((v) => (typeof v === "string" ? v.trim() : String(v).trim()))
    .filter((v) => v.length > 0);
}

function parseTriState(value: unknown): TriState {
  if (typeof value !== "string") return "any";
  if (value === "1" || value === "0" || value === "any") return value;
  return "any";
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === "number")
    return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function parseLocalDayStartMs(dateStr: string): number | undefined {
  // YYYY-MM-DD -> local start of day
  const d = new Date(`${dateStr}T00:00:00`);
  const t = d.getTime();
  return Number.isFinite(t) ? t : undefined;
}

function parseLocalDayEndMs(dateStr: string): number | undefined {
  // YYYY-MM-DD -> local end of day
  const d = new Date(`${dateStr}T23:59:59.999`);
  const t = d.getTime();
  return Number.isFinite(t) ? t : undefined;
}

// GET /api/cards - получение списка карточек
router.get("/cards", async (req: Request, res: Response) => {
  try {
    const db = getDb(req);
    const cardsService = createCardsService(db);
    const settings = await getSettings();

    if (!settings.cardsFolderPath) {
      res.json([]);
      return;
    }

    const libraryId = getOrCreateLibraryId(db, settings.cardsFolderPath);

    const sortRaw = parseString(req.query.sort);
    const sort: CardsSort | undefined =
      sortRaw === "created_at_desc" ||
      sortRaw === "created_at_asc" ||
      sortRaw === "name_asc" ||
      sortRaw === "name_desc"
        ? sortRaw
        : undefined;

    const name = parseString(req.query.name);
    const creators = parseStringArray(req.query, "creator");
    const spec_versions = parseStringArray(req.query, "spec_version");
    const tags = parseStringArray(req.query, "tags").map((t) =>
      t.trim().toLowerCase()
    );

    const createdFromMsDirect = parseNumber((req.query as any).created_from_ms);
    const createdToMsDirect = parseNumber((req.query as any).created_to_ms);

    let created_from_ms = createdFromMsDirect;
    let created_to_ms = createdToMsDirect;

    if (created_from_ms == null) {
      const createdFrom = parseString((req.query as any).created_from);
      if (createdFrom) {
        const ms = parseLocalDayStartMs(createdFrom);
        if (ms == null) {
          throw new AppError({
            status: 400,
            code: "api.cards.invalid_created_from",
          });
        }
        created_from_ms = ms;
      }
    }

    if (created_to_ms == null) {
      const createdTo = parseString((req.query as any).created_to);
      if (createdTo) {
        const ms = parseLocalDayEndMs(createdTo);
        if (ms == null) {
          throw new AppError({
            status: 400,
            code: "api.cards.invalid_created_to",
          });
        }
        created_to_ms = ms;
      }
    }

    const alternateGreetingsMin = parseNumber(
      (req.query as any).alternate_greetings_min
    );

    const promptTokensMin = parseNumber((req.query as any).prompt_tokens_min);
    const promptTokensMax = parseNumber((req.query as any).prompt_tokens_max);

    const params: SearchCardsParams = {
      library_id: libraryId,
      sort,
      name,
      creators: creators.length > 0 ? creators : undefined,
      spec_versions: spec_versions.length > 0 ? spec_versions : undefined,
      tags: tags.length > 0 ? tags : undefined,
      created_from_ms,
      created_to_ms,
      has_creator_notes: parseTriState((req.query as any).has_creator_notes),
      has_system_prompt: parseTriState((req.query as any).has_system_prompt),
      has_post_history_instructions: parseTriState(
        (req.query as any).has_post_history_instructions
      ),
      has_personality: parseTriState((req.query as any).has_personality),
      has_scenario: parseTriState((req.query as any).has_scenario),
      has_mes_example: parseTriState((req.query as any).has_mes_example),
      has_character_book: parseTriState((req.query as any).has_character_book),
      has_alternate_greetings: parseTriState(
        (req.query as any).has_alternate_greetings
      ),
      alternate_greetings_min:
        typeof alternateGreetingsMin === "number" && alternateGreetingsMin >= 0
          ? alternateGreetingsMin
          : undefined,
      prompt_tokens_min:
        typeof promptTokensMin === "number" && promptTokensMin >= 0
          ? promptTokensMin
          : undefined,
      prompt_tokens_max:
        typeof promptTokensMax === "number" && promptTokensMax >= 0
          ? promptTokensMax
          : undefined,
    };

    const cardsList = cardsService.searchCards(params);
    res.json(cardsList);
  } catch (error) {
    logger.errorKey(error, "api.cards.list_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.cards.list_failed",
    });
  }
});

// GET /api/cards/:id/export.png - канонический экспорт PNG с CCv3 метаданными
router.get("/cards/:id/export.png", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb(req);

    const row = db
      .prepare(
        `
        SELECT
          c.id,
          c.name,
          c.data_json,
          (
            SELECT cf.file_path
            FROM card_files cf
            WHERE cf.card_id = c.id
            LIMIT 1
          ) AS file_path
        FROM cards c
        WHERE c.id = ?
        LIMIT 1
      `
      )
      .get(id) as
      | {
          id: string;
          name: string | null;
          data_json: string;
          file_path: string | null;
        }
      | undefined;

    if (!row) {
      throw new AppError({ status: 404, code: "api.cards.not_found" });
    }
    if (!row.file_path) {
      throw new AppError({ status: 404, code: "api.image.not_found" });
    }
    if (!existsSync(row.file_path)) {
      throw new AppError({ status: 404, code: "api.image.file_not_found" });
    }

    const ccv3Object = safeJsonParse<unknown>(row.data_json);
    if (!ccv3Object) {
      throw new AppError({ status: 500, code: "api.export.invalid_data_json" });
    }

    const originalPng = await readFile(row.file_path);
    const outPng = buildPngWithCcv3TextChunk({
      inputPng: originalPng,
      ccv3Object,
    });

    // filename rules
    const queryFilenameRaw =
      typeof req.query.filename === "string" ? req.query.filename : undefined;
    const baseCandidate = (queryFilenameRaw ?? row.name ?? "").trim();
    const baseWithoutExt = baseCandidate.replace(/\.png$/i, "");
    const base = sanitizeWindowsFilenameBase(baseWithoutExt, `card-${id}`);
    const filename = `${base}.png`;

    res.status(200);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store");

    if (String(req.query.download ?? "") === "1") {
      res.setHeader(
        "Content-Disposition",
        makeAttachmentContentDisposition(filename)
      );
    }

    res.send(outPng);
  } catch (error) {
    logger.errorKey(error, "api.cards.export_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.cards.export_failed",
    });
  }
});

// GET /api/cards/filters - значения для селектов фильтров
router.get("/cards/filters", async (req: Request, res: Response) => {
  try {
    const db = getDb(req);
    const filtersService = createCardsFiltersService(db);
    const settings = await getSettings();

    if (!settings.cardsFolderPath) {
      res.json({ creators: [], spec_versions: [], tags: [] });
      return;
    }

    const libraryId = getOrCreateLibraryId(db, settings.cardsFolderPath);
    res.json(filtersService.getFilters(libraryId));
  } catch (error) {
    logger.errorKey(error, "api.cards.filters_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.cards.filters_failed",
    });
  }
});

// GET /api/cards/:id - получение полной информации о карточке
router.get("/cards/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb(req);

    const row = db
      .prepare(
        `
        SELECT
          c.id,
          c.name,
          c.description,
          c.tags,
          c.creator,
          c.spec_version,
          c.created_at,
          c.avatar_path,
          c.data_json,
          c.personality,
          c.scenario,
          c.first_mes,
          c.mes_example,
          c.creator_notes,
          c.system_prompt,
          c.post_history_instructions,
          c.alternate_greetings_count,
          c.has_creator_notes,
          c.has_system_prompt,
          c.has_post_history_instructions,
          c.has_personality,
          c.has_scenario,
          c.has_mes_example,
          c.has_character_book,
          c.prompt_tokens_est,
          (
            SELECT cf.file_path
            FROM card_files cf
            WHERE cf.card_id = c.id
            LIMIT 1
          ) AS file_path
        FROM cards c
        WHERE c.id = ?
        LIMIT 1
      `
      )
      .get(id) as
      | {
          id: string;
          name: string | null;
          description: string | null;
          tags: string | null;
          creator: string | null;
          spec_version: string | null;
          created_at: number;
          avatar_path: string | null;
          data_json: string;
          personality: string | null;
          scenario: string | null;
          first_mes: string | null;
          mes_example: string | null;
          creator_notes: string | null;
          system_prompt: string | null;
          post_history_instructions: string | null;
          alternate_greetings_count: number;
          has_creator_notes: number;
          has_system_prompt: number;
          has_post_history_instructions: number;
          has_personality: number;
          has_scenario: number;
          has_mes_example: number;
          has_character_book: number;
          prompt_tokens_est: number;
          file_path: string | null;
        }
      | undefined;

    if (!row) {
      throw new AppError({ status: 404, code: "api.cards.not_found" });
    }

    const tags = row.tags ? safeJsonParse<string[]>(row.tags) : null;
    const data_json = safeJsonParse<unknown>(row.data_json);

    // Extract greetings from data_json (V2/V3)
    const dataNode =
      data_json && typeof data_json === "object" && "data" in (data_json as any)
        ? (data_json as any).data
        : null;
    const alternate_greetings = normalizeStringArray(
      dataNode && typeof dataNode === "object"
        ? (dataNode as any).alternate_greetings
        : undefined
    );
    const group_only_greetings_raw =
      dataNode && typeof dataNode === "object"
        ? (dataNode as any).group_only_greetings
        : undefined;
    const group_only_greetings =
      row.spec_version === "3.0"
        ? normalizeStringArray(group_only_greetings_raw)
        : undefined;

    const avatar_url = row.avatar_path
      ? `/api/thumbnail/${row.id}`
      : "/api/thumbnail/default";

    res.json({
      id: row.id,
      name: row.name,
      creator: row.creator,
      tags: tags ?? null,
      spec_version: row.spec_version,
      created_at: row.created_at,
      file_path: row.file_path,
      avatar_url,

      // normalized content
      description: row.description,
      personality: row.personality,
      scenario: row.scenario,
      first_mes: row.first_mes,
      mes_example: row.mes_example,
      creator_notes: row.creator_notes,
      system_prompt: row.system_prompt,
      post_history_instructions: row.post_history_instructions,

      // meta helpers
      prompt_tokens_est: Number.isFinite(row.prompt_tokens_est)
        ? row.prompt_tokens_est
        : 0,
      alternate_greetings_count: Number.isFinite(row.alternate_greetings_count)
        ? row.alternate_greetings_count
        : 0,
      has_creator_notes: row.has_creator_notes === 1,
      has_system_prompt: row.has_system_prompt === 1,
      has_post_history_instructions: row.has_post_history_instructions === 1,
      has_personality: row.has_personality === 1,
      has_scenario: row.has_scenario === 1,
      has_mes_example: row.has_mes_example === 1,
      has_character_book: row.has_character_book === 1,

      // extracted arrays (server-side)
      alternate_greetings,
      group_only_greetings,

      // raw original object (for Raw tab / future export)
      data_json,
    });
  } catch (error) {
    logger.errorKey(error, "api.cards.get_failed");
    return sendError(res, error, { status: 500, code: "api.cards.get_failed" });
  }
});

export default router;
