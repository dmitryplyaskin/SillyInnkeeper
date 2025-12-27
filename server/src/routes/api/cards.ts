import { Router, Request, Response } from "express";
import Database from "better-sqlite3";
import { existsSync, statSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { rename, unlink } from "fs-extra";
import { dirname, join } from "node:path";
import { createCardsService } from "../../services/cards";
import { logger } from "../../utils/logger";
import type {
  CardsFtsField,
  CardsSort,
  SearchCardsParams,
  TriState,
} from "../../services/cards";
import { createCardsFiltersService } from "../../services/cards-filters";
import { getSettings } from "../../services/settings";
import { getOrCreateLibraryId } from "../../services/libraries";
import { createScanService } from "../../services/scan";
import { createTagService } from "../../services/tags";
import { computeContentHash } from "../../services/card-hash";
import { AppError } from "../../errors/app-error";
import { sendError } from "../../errors/http";
import { buildPngWithCcv3TextChunk } from "../../services/png-export";
import { deleteThumbnail } from "../../services/thumbnail";
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
      sortRaw === "name_desc" ||
      sortRaw === "prompt_tokens_desc" ||
      sortRaw === "prompt_tokens_asc" ||
      sortRaw === "relevance"
        ? sortRaw
        : undefined;

    const name = parseString(req.query.name);
    const q = parseString((req.query as any).q);

    const qModeRaw = parseString((req.query as any).q_mode);
    if (qModeRaw && qModeRaw !== "like" && qModeRaw !== "fts") {
      throw new AppError({
        status: 400,
        code: "api.cards.invalid_search_query",
      });
    }
    const q_mode: "like" | "fts" = qModeRaw === "fts" ? "fts" : "like";

    const qFieldsRaw = parseStringArray(req.query, "q_fields");

    let q_fields: CardsFtsField[] | undefined;
    if (q) {
      const allowed: ReadonlySet<string> = new Set([
        "description",
        "personality",
        "scenario",
        "first_mes",
        "mes_example",
        "creator_notes",
        "system_prompt",
        "post_history_instructions",
        "alternate_greetings",
        "group_only_greetings",
      ]);

      if (q_mode === "fts") {
        if (q.length > 200) {
          throw new AppError({
            status: 400,
            code: "api.cards.invalid_search_query",
          });
        }

        const extractSearchTokens = (input: string): string[] => {
          // Split by any non-letter/non-number to align with FTS tokenization (unicode61).
          // Example: "18-year-old" -> ["18", "year", "old"]
          return input
            .trim()
            .split(/[^\p{L}\p{N}]+/gu)
            .map((t) => t.trim())
            .filter((t) => t.length > 0);
        };

        const tokens = extractSearchTokens(q);
        if (tokens.length === 0) {
          throw new AppError({
            status: 400,
            code: "api.cards.invalid_search_query",
          });
        }
      } else {
        // LIKE mode: allow longer literal strings (e.g. full sentence / template)
        if (q.length > 1000) {
          throw new AppError({
            status: 400,
            code: "api.cards.invalid_search_query",
          });
        }
      }

      const normalizedFields = qFieldsRaw
        .map((f) => f.trim())
        .filter((f) => f.length > 0);

      if (normalizedFields.length > 0) {
        for (const f of normalizedFields) {
          if (!allowed.has(f)) {
            throw new AppError({
              status: 400,
              code: "api.cards.invalid_search_query",
            });
          }
        }
        q_fields = normalizedFields as CardsFtsField[];
      } else {
        q_fields = undefined; // means \"all\"
      }
    }
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
      q,
      q_mode,
      q_fields,
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
      patterns: parseTriState((req.query as any).patterns),
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
          c.primary_file_path,
          (
            SELECT cf.file_path
            FROM card_files cf
            WHERE cf.card_id = c.id
            ORDER BY cf.file_birthtime ASC, cf.file_path ASC
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
          primary_file_path: string | null;
          file_path: string | null;
        }
      | undefined;

    if (!row) {
      throw new AppError({ status: 404, code: "api.cards.not_found" });
    }
    const mainFilePath = row.primary_file_path ?? row.file_path;
    if (!mainFilePath) {
      throw new AppError({ status: 404, code: "api.image.not_found" });
    }
    if (!existsSync(mainFilePath)) {
      throw new AppError({ status: 404, code: "api.image.file_not_found" });
    }

    const ccv3Object = safeJsonParse<unknown>(row.data_json);
    if (!ccv3Object) {
      throw new AppError({ status: 500, code: "api.export.invalid_data_json" });
    }

    const originalPng = await readFile(mainFilePath);
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
          c.primary_file_path,
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
            ORDER BY cf.file_birthtime ASC, cf.file_path ASC
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
          primary_file_path: string | null;
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

    const fileRows = db
      .prepare(
        `
        SELECT cf.file_path
        FROM card_files cf
        WHERE cf.card_id = ?
        ORDER BY cf.file_birthtime ASC, cf.file_path ASC
      `
      )
      .all(id) as Array<{ file_path: string }>;

    const file_paths = fileRows
      .map((r) => r.file_path)
      .filter((p) => typeof p === "string" && p.trim().length > 0);
    const primary = row.primary_file_path?.trim()
      ? row.primary_file_path.trim()
      : null;
    const main_file_path =
      primary && file_paths.includes(primary)
        ? primary
        : file_paths.length > 0
        ? file_paths[0]
        : row.file_path ?? null;
    const duplicates = main_file_path
      ? file_paths.filter((p) => p !== main_file_path)
      : file_paths.slice(1);

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
      file_path: main_file_path,
      file_paths,
      duplicates,
      primary_file_path: primary,
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

type SaveCardMode =
  | "overwrite_main"
  | "overwrite_all_files"
  | "save_new"
  | "save_new_delete_old_main";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeToCcv3(cardJson: unknown): any {
  if (!isPlainObject(cardJson)) return null;
  const base: any = cardJson;
  const baseData: any = isPlainObject(base.data) ? base.data : {};

  // CCv3 requires `data.extensions` (Record<string, any>)
  const baseExtensions: any = isPlainObject(baseData.extensions)
    ? baseData.extensions
    : {};

  return {
    ...base,
    spec: "chara_card_v3",
    spec_version: "3.0",
    data: {
      ...baseData,
      // keep existing multilingual notes, but we will keep creator_notes in sync below
      extensions: baseExtensions,
      // required arrays in v3
      alternate_greetings: Array.isArray(baseData.alternate_greetings)
        ? baseData.alternate_greetings
        : [],
      group_only_greetings: Array.isArray(baseData.group_only_greetings)
        ? baseData.group_only_greetings
        : [],
    },
  };
}

// POST /api/cards/:id/save - сохранение (перезапись / сохранить как новую) с дедуп-логикой
router.post("/cards/:id/save", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const modeRaw = (req.body as any)?.mode;
    const cardJsonRaw = (req.body as any)?.card_json;

    const mode: SaveCardMode =
      modeRaw === "overwrite_main" ||
      modeRaw === "overwrite_all_files" ||
      modeRaw === "save_new" ||
      modeRaw === "save_new_delete_old_main"
        ? modeRaw
        : "overwrite_main";

    const normalized = normalizeToCcv3(cardJsonRaw);
    if (!normalized || !isPlainObject(normalized.data)) {
      throw new AppError({ status: 400, code: "api.cards.invalid_card_json" });
    }

    const db = getDb(req);

    const cardRow = db
      .prepare(
        `
        SELECT id, library_id, content_hash, avatar_path, data_json, primary_file_path
        FROM cards
        WHERE id = ?
        LIMIT 1
      `
      )
      .get(id) as
      | {
          id: string;
          library_id: string | null;
          content_hash: string | null;
          avatar_path: string | null;
          data_json: string;
          primary_file_path: string | null;
        }
      | undefined;

    if (!cardRow) {
      throw new AppError({ status: 404, code: "api.cards.not_found" });
    }

    const fileRows = db
      .prepare(
        `
        SELECT cf.file_path, cf.file_birthtime
        FROM card_files cf
        WHERE cf.card_id = ?
        ORDER BY cf.file_birthtime ASC, cf.file_path ASC
      `
      )
      .all(id) as Array<{ file_path: string; file_birthtime: number }>;

    const file_paths = fileRows
      .map((r) => r.file_path)
      .filter((p) => typeof p === "string" && p.trim().length > 0);

    const primary = cardRow.primary_file_path?.trim()
      ? cardRow.primary_file_path.trim()
      : null;
    const main_file_path =
      primary && file_paths.includes(primary)
        ? primary
        : file_paths.length > 0
        ? file_paths[0]
        : null;

    if (!main_file_path) {
      throw new AppError({ status: 404, code: "api.image.not_found" });
    }
    if (!existsSync(main_file_path)) {
      throw new AppError({ status: 404, code: "api.image.file_not_found" });
    }

    // --- No-changes short-circuit (compare by the same hash as dedup) ---
    const currentParsed = safeJsonParse<unknown>(cardRow.data_json);
    const currentHash =
      (cardRow.content_hash ?? "").trim().length > 0
        ? (cardRow.content_hash as string)
        : computeContentHash(currentParsed);
    const nextHash = computeContentHash(normalized);

    if (currentHash === nextHash) {
      res.json({ ok: true, changed: false, card_id: id });
      return;
    }

    // --- Ensure tags exist ONLY on save ---
    const tagsValue = (normalized as any)?.data?.tags;
    const tags = Array.isArray(tagsValue)
      ? tagsValue
          .map((t: any) => (typeof t === "string" ? t : String(t)))
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0)
      : [];
    if (tags.length > 0) {
      const tagService = createTagService(db);
      tagService.ensureTagsExist(tags);
    }

    // keep creator_notes_multilingual.en in sync if present
    const dataObj: any = (normalized as any).data;
    if (
      isPlainObject(dataObj.creator_notes_multilingual) &&
      typeof dataObj.creator_notes === "string"
    ) {
      dataObj.creator_notes_multilingual = {
        ...(dataObj.creator_notes_multilingual as any),
        en: dataObj.creator_notes,
      };
    }

    const scanService = createScanService(
      db,
      (cardRow.library_id ?? "cards").trim() || "cards"
    );

    const rewritePngInPlace = async (filePath: string, ccv3Object: unknown) => {
      const png = await readFile(filePath);
      const out = buildPngWithCcv3TextChunk({ inputPng: png, ccv3Object });
      await writeFile(filePath, out);
    };

    const writeNewPng = async (
      sourcePngPath: string,
      targetPngPath: string,
      ccv3Object: unknown
    ) => {
      const png = await readFile(sourcePngPath);
      const out = buildPngWithCcv3TextChunk({ inputPng: png, ccv3Object });
      await writeFile(targetPngPath, out);
    };

    const pickUniquePngPath = (folder: string, baseName: string): string => {
      const base = sanitizeWindowsFilenameBase(baseName, `card-${id}`);
      let candidate = join(folder, `${base}.png`);
      if (!existsSync(candidate)) return candidate;
      for (let i = 1; i < 1000; i += 1) {
        candidate = join(folder, `${base} (${i}).png`);
        if (!existsSync(candidate)) return candidate;
      }
      // Should be practically unreachable
      return join(folder, `${base} (${Date.now()}).png`);
    };

    const addNonceForSaveAsNew = (ccv3Object: any): any => {
      const next = normalizeToCcv3(ccv3Object);
      if (!next) return next;
      const data = next.data ?? {};
      const extensions = isPlainObject(data.extensions)
        ? { ...data.extensions }
        : {};
      extensions.silly_innkeeper_save_id = randomUUID();
      next.data = { ...data, extensions };
      return next;
    };

    if (mode === "overwrite_main") {
      // no duplicates scenario (UI should not show this mode when duplicates exist)
      await rewritePngInPlace(main_file_path, normalized);
      await scanService.syncSingleFile(main_file_path);
      res.json({ ok: true, changed: true, card_id: id });
      return;
    }

    if (mode === "overwrite_all_files") {
      for (const p of file_paths) {
        if (!p || !existsSync(p)) continue;
        await rewritePngInPlace(p, normalized);
        await scanService.syncSingleFile(p);
      }
      res.json({ ok: true, changed: true, card_id: id });
      return;
    }

    if (mode === "save_new" || mode === "save_new_delete_old_main") {
      const folder = dirname(main_file_path);
      const nameCandidate =
        typeof (normalized as any)?.data?.name === "string"
          ? String((normalized as any).data.name)
          : "";
      const targetPath = pickUniquePngPath(folder, nameCandidate);

      const withNonce = addNonceForSaveAsNew(normalized);
      await writeNewPng(main_file_path, targetPath, withNonce);
      await scanService.syncSingleFile(targetPath);

      const newRow = db
        .prepare(`SELECT card_id FROM card_files WHERE file_path = ? LIMIT 1`)
        .get(targetPath) as { card_id: string } | undefined;
      if (!newRow?.card_id) {
        throw new AppError({ status: 500, code: "api.cards.save_failed" });
      }

      if (mode === "save_new_delete_old_main") {
        const oldPath = main_file_path;

        // Same semantics as DELETE /api/cards/:id/files, but for the main file.
        const before = db
          .prepare(
            `
            SELECT COUNT(*) as cnt
            FROM card_files
            WHERE card_id = ?
          `
          )
          .get(id) as { cnt: number };

        db.transaction(() => {
          db.prepare(`DELETE FROM card_files WHERE file_path = ?`).run(oldPath);

          const after = db
            .prepare(
              `
              SELECT COUNT(*) as cnt
              FROM card_files
              WHERE card_id = ?
            `
            )
            .get(id) as { cnt: number };

          if ((after?.cnt ?? 0) === 0) {
            db.prepare(`DELETE FROM cards WHERE id = ?`).run(id);
          }
        })();

        await unlink(oldPath).catch((e: any) => {
          if (e && (e.code === "ENOENT" || e.code === "ENOTDIR")) return;
          throw e;
        });

        // If we deleted the last file, clean thumbnail
        if ((before?.cnt ?? 0) <= 1 && cardRow.avatar_path) {
          const uuid = cardRow.avatar_path
            .split("/")
            .pop()
            ?.replace(".webp", "");
          if (uuid) {
            await deleteThumbnail(uuid);
          }
        }
      }

      res.json({ ok: true, changed: true, card_id: newRow.card_id });
      return;
    }

    res.json({ ok: true, changed: true, card_id: id });
  } catch (error) {
    logger.errorKey(error, "api.cards.save_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.cards.save_failed",
    });
  }
});

// DELETE /api/cards/:id/files - удаление конкретного файла карточки (дубликата)
router.delete("/cards/:id/files", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const file_path = (req.body as any)?.file_path;
    if (typeof file_path !== "string" || file_path.trim().length === 0) {
      throw new AppError({ status: 400, code: "api.cards.invalid_file_path" });
    }

    const db = getDb(req);
    const normalizedFilePath = file_path.trim();

    const belongs = db
      .prepare(
        `
        SELECT 1
        FROM card_files
        WHERE card_id = ? AND file_path = ?
        LIMIT 1
      `
      )
      .get(id, normalizedFilePath) as { 1: number } | undefined;

    if (!belongs) {
      throw new AppError({ status: 404, code: "api.cards.file_not_found" });
    }

    // Текущее число файлов у карточки
    const before = db
      .prepare(
        `
        SELECT COUNT(*) as cnt
        FROM card_files
        WHERE card_id = ?
      `
      )
      .get(id) as { cnt: number };

    // Сохраняем avatar_path на случай удаления последнего файла
    const cardRow = db
      .prepare(`SELECT avatar_path FROM cards WHERE id = ? LIMIT 1`)
      .get(id) as { avatar_path: string | null } | undefined;

    // Транзакция: сначала удаляем привязку файла, затем (опционально) карточку
    db.transaction(() => {
      db.prepare(`DELETE FROM card_files WHERE file_path = ?`).run(
        normalizedFilePath
      );

      const after = db
        .prepare(
          `
          SELECT COUNT(*) as cnt
          FROM card_files
          WHERE card_id = ?
        `
        )
        .get(id) as { cnt: number };

      if ((after?.cnt ?? 0) === 0) {
        db.prepare(`DELETE FROM cards WHERE id = ?`).run(id);
      }
    })();

    // Удаляем файл с диска (best-effort): если уже удалён — ок.
    await unlink(normalizedFilePath).catch((e: any) => {
      if (e && (e.code === "ENOENT" || e.code === "ENOTDIR")) return;
      throw e;
    });

    // Если до было 1 файл, мы удалили карточку — чистим миниатюру
    if ((before?.cnt ?? 0) <= 1 && cardRow?.avatar_path) {
      const uuid = cardRow.avatar_path.split("/").pop()?.replace(".webp", "");
      if (uuid) {
        await deleteThumbnail(uuid);
      }
    }

    res.json({ ok: true });
  } catch (error) {
    logger.errorKey(error, "api.cards.delete_file_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.cards.delete_file_failed",
    });
  }
});

// POST /api/cards/bulk-delete - удаление карточек списком (все файлы + БД)
// IMPORTANT: keep this route before `/cards/:id` to avoid param match.
router.post("/cards/bulk-delete", async (req: Request, res: Response) => {
  try {
    const raw = (req.body as unknown as { card_ids?: unknown } | null)
      ?.card_ids;
    const card_ids = Array.from(new Set(normalizeStringArray(raw)));

    if (card_ids.length === 0) {
      throw new AppError({ status: 400, code: "api.cards.invalid_card_ids" });
    }

    const db = getDb(req);

    const placeholders = card_ids.map(() => "?").join(", ");

    const cardRows = db
      .prepare(
        `
        SELECT id, avatar_path
        FROM cards
        WHERE id IN (${placeholders})
      `
      )
      .all(...card_ids) as Array<{ id: string; avatar_path: string | null }>;

    if (cardRows.length !== card_ids.length) {
      throw new AppError({ status: 404, code: "api.cards.some_not_found" });
    }

    const fileRows = db
      .prepare(
        `
        SELECT card_id, file_path
        FROM card_files
        WHERE card_id IN (${placeholders})
        ORDER BY file_birthtime ASC, file_path ASC
      `
      )
      .all(...card_ids) as Array<{ card_id: string; file_path: string }>;

    const filesByCardId = new Map<string, string[]>();
    for (const id of card_ids) filesByCardId.set(id, []);
    for (const r of fileRows) {
      const p = typeof r.file_path === "string" ? r.file_path.trim() : "";
      if (!p) continue;
      const list = filesByCardId.get(r.card_id);
      if (list) list.push(p);
    }

    // 1) Delete files first. If a critical filesystem error happens, do not touch DB.
    for (const id of card_ids) {
      const files = filesByCardId.get(id) ?? [];
      for (const p of files) {
        await unlink(p).catch((e: unknown) => {
          const err = e as { code?: unknown } | null;
          const code = typeof err?.code === "string" ? err.code : "";
          if (code === "ENOENT" || code === "ENOTDIR") return;
          throw e;
        });
      }
    }

    // 2) Remove cards from DB (card_files/card_tags are removed via cascade)
    db.transaction(() => {
      db.prepare(`DELETE FROM cards WHERE id IN (${placeholders})`).run(
        ...card_ids
      );
    })();

    // 3) Cleanup thumbnails (best-effort)
    for (const row of cardRows) {
      if (!row.avatar_path) continue;
      const uuid = row.avatar_path.split("/").pop()?.replace(".webp", "");
      if (!uuid) continue;
      await deleteThumbnail(uuid).catch(() => undefined);
    }

    res.json({ ok: true, deleted: card_ids.length, deleted_ids: card_ids });
  } catch (error) {
    logger.errorKey(error, "api.cards.bulk_delete_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.cards.bulk_delete_failed",
    });
  }
});

// DELETE /api/cards/:id - удаление карточки полностью (все файлы + БД)
router.delete("/cards/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb(req);

    const cardRow = db
      .prepare(`SELECT avatar_path FROM cards WHERE id = ? LIMIT 1`)
      .get(id) as { avatar_path: string | null } | undefined;

    if (!cardRow) {
      throw new AppError({ status: 404, code: "api.cards.not_found" });
    }

    const fileRows = db
      .prepare(
        `
        SELECT cf.file_path
        FROM card_files cf
        WHERE cf.card_id = ?
        ORDER BY cf.file_birthtime ASC, cf.file_path ASC
      `
      )
      .all(id) as Array<{ file_path: string }>;

    const file_paths = fileRows
      .map((r) => r.file_path)
      .filter((p) => typeof p === "string" && p.trim().length > 0);

    // Сначала удаляем файлы с диска. Если есть критичная ошибка — не трогаем БД.
    for (const p of file_paths) {
      const normalized = p.trim();
      if (!normalized) continue;
      await unlink(normalized).catch((e: any) => {
        if (e && (e.code === "ENOENT" || e.code === "ENOTDIR")) return;
        throw e;
      });
    }

    // Затем удаляем карточку из БД (card_files/card_tags удалятся каскадом)
    db.transaction(() => {
      db.prepare(`DELETE FROM cards WHERE id = ?`).run(id);
    })();

    // Чистим миниатюру (best-effort)
    if (cardRow.avatar_path) {
      const uuid = cardRow.avatar_path.split("/").pop()?.replace(".webp", "");
      if (uuid) {
        await deleteThumbnail(uuid);
      }
    }

    res.json({ ok: true });
  } catch (error) {
    logger.errorKey(error, "api.cards.delete_card_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.cards.delete_card_failed",
    });
  }
});

// PUT /api/cards/:id/main-file - установить основной файл карточки (override)
router.put("/cards/:id/main-file", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const file_path = (req.body as any)?.file_path;
    const normalized = typeof file_path === "string" ? file_path.trim() : null;

    const db = getDb(req);

    const existsCard = db
      .prepare(`SELECT 1 FROM cards WHERE id = ? LIMIT 1`)
      .get(id) as { 1: number } | undefined;
    if (!existsCard) {
      throw new AppError({ status: 404, code: "api.cards.not_found" });
    }

    if (normalized) {
      const belongs = db
        .prepare(
          `
          SELECT 1
          FROM card_files
          WHERE card_id = ? AND file_path = ?
          LIMIT 1
        `
        )
        .get(id, normalized) as { 1: number } | undefined;
      if (!belongs) {
        throw new AppError({ status: 404, code: "api.cards.file_not_found" });
      }

      db.prepare(`UPDATE cards SET primary_file_path = ? WHERE id = ?`).run(
        normalized,
        id
      );
    } else {
      // null/undefined/empty => сброс override (вернёмся к "самому старому" файлу)
      db.prepare(`UPDATE cards SET primary_file_path = NULL WHERE id = ?`).run(
        id
      );
    }

    res.json({ ok: true });
  } catch (error) {
    logger.errorKey(error, "api.cards.set_main_file_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.cards.set_main_file_failed",
    });
  }
});

// PUT /api/cards/:id/rename-main-file - переименовать ОСНОВНОЙ файл карточки
router.put(
  "/cards/:id/rename-main-file",
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const filename = (req.body as any)?.filename;
      if (typeof filename !== "string" || filename.trim().length === 0) {
        throw new AppError({ status: 400, code: "api.cards.invalid_filename" });
      }

      const db = getDb(req);

      // main file = COALESCE(primary_file_path, oldest)
      const row = db
        .prepare(
          `
        SELECT
          c.primary_file_path,
          COALESCE(
            c.primary_file_path,
            (
              SELECT cf.file_path
              FROM card_files cf
              WHERE cf.card_id = c.id
              ORDER BY cf.file_birthtime ASC, cf.file_path ASC
              LIMIT 1
            )
          ) as main_file_path
        FROM cards c
        WHERE c.id = ?
        LIMIT 1
      `
        )
        .get(id) as
        | { primary_file_path: string | null; main_file_path: string | null }
        | undefined;

      if (!row) {
        throw new AppError({ status: 404, code: "api.cards.not_found" });
      }
      if (!row.main_file_path) {
        throw new AppError({ status: 404, code: "api.image.not_found" });
      }

      const oldPath = row.main_file_path;
      if (!existsSync(oldPath)) {
        throw new AppError({ status: 404, code: "api.image.file_not_found" });
      }

      const rawBase = filename.trim().replace(/\.png$/i, "");
      const base = sanitizeWindowsFilenameBase(rawBase, `card-${id}`);
      const nextPath = join(dirname(oldPath), `${base}.png`);

      // No-op (в т.ч. на Windows с нечувствительностью к регистру)
      if (nextPath.toLowerCase() === oldPath.toLowerCase()) {
        res.json({ ok: true });
        return;
      }

      if (existsSync(nextPath)) {
        throw new AppError({
          status: 409,
          code: "api.cards.rename_target_exists",
        });
      }

      // Сохраняем метаданные строки card_files (она PK по file_path)
      const cf = db
        .prepare(
          `
        SELECT file_mtime, file_birthtime, file_size
        FROM card_files
        WHERE file_path = ?
        LIMIT 1
      `
        )
        .get(oldPath) as
        | { file_mtime: number; file_birthtime: number; file_size: number }
        | undefined;

      // 1) rename на диске
      await rename(oldPath, nextPath);

      // 2) обновляем БД
      const folderPath = dirname(nextPath);
      const stats = statSync(nextPath);
      const fileMtime = Number.isFinite(stats.mtimeMs)
        ? stats.mtimeMs
        : cf?.file_mtime ?? Date.now();
      const fileBirthtime =
        Number.isFinite(stats.birthtimeMs) && stats.birthtimeMs > 0
          ? stats.birthtimeMs
          : cf?.file_birthtime ?? fileMtime;
      const fileSize = Number.isFinite(stats.size)
        ? stats.size
        : cf?.file_size ?? 0;

      db.transaction(() => {
        db.prepare(
          `
        UPDATE card_files
        SET
          file_path = ?,
          folder_path = ?,
          file_mtime = ?,
          file_birthtime = ?,
          file_size = ?
        WHERE file_path = ?
      `
        ).run(
          nextPath,
          folderPath,
          fileMtime,
          fileBirthtime,
          fileSize,
          oldPath
        );

        // Если override указывал на старый путь — обновляем на новый
        db.prepare(
          `
        UPDATE cards
        SET primary_file_path = ?
        WHERE id = ? AND primary_file_path = ?
      `
        ).run(nextPath, id, oldPath);
      })();

      res.json({ ok: true, file_path: nextPath });
    } catch (error) {
      logger.errorKey(error, "api.cards.rename_main_file_failed");
      return sendError(res, error, {
        status: 500,
        code: "api.cards.rename_main_file_failed",
      });
    }
  }
);

export default router;
