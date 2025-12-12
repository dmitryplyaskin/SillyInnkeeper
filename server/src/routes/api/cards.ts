import { Router, Request, Response } from "express";
import Database from "better-sqlite3";
import { createCardsService } from "../../services/cards";
import { logger } from "../../utils/logger";
import type {
  CardsSort,
  SearchCardsParams,
  TriState,
} from "../../services/cards";
import { createCardsFiltersService } from "../../services/cards-filters";

const router = Router();

// Middleware для получения базы данных из app.locals
function getDb(req: Request): Database.Database {
  return req.app.locals.db as Database.Database;
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
          res.status(400).json({ error: "Некорректный created_from" });
          return;
        }
        created_from_ms = ms;
      }
    }

    if (created_to_ms == null) {
      const createdTo = parseString((req.query as any).created_to);
      if (createdTo) {
        const ms = parseLocalDayEndMs(createdTo);
        if (ms == null) {
          res.status(400).json({ error: "Некорректный created_to" });
          return;
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
    logger.error(error, "Ошибка при получении списка карточек");
    res.status(500).json({ error: "Не удалось получить список карточек" });
  }
});

// GET /api/cards/filters - значения для селектов фильтров
router.get("/cards/filters", async (req: Request, res: Response) => {
  try {
    const db = getDb(req);
    const filtersService = createCardsFiltersService(db);
    res.json(filtersService.getFilters());
  } catch (error) {
    logger.error(error, "Ошибка при получении данных фильтров карточек");
    res
      .status(500)
      .json({ error: "Не удалось получить данные фильтров карточек" });
  }
});

export default router;
