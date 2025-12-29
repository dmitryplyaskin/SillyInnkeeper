import { readFile, writeFile, ensureDir } from "fs-extra";
import { join } from "node:path";
import { AppError } from "../errors/app-error";

export type TriState = "any" | "1" | "0";
export type CardsTextSearchMode = "like" | "fts";

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

export interface CardsFiltersState {
  sort: CardsSort;
  name: string;
  q: string;
  q_mode: CardsTextSearchMode;
  q_fields: CardsFtsField[];
  creator: string[];
  spec_version: string[];
  tags: string[];
  created_from?: string; // YYYY-MM-DD
  created_to?: string; // YYYY-MM-DD
  prompt_tokens_min: number;
  prompt_tokens_max: number;
  is_sillytavern: TriState;
  has_creator_notes: TriState;
  has_system_prompt: TriState;
  has_post_history_instructions: TriState;
  has_personality: TriState;
  has_scenario: TriState;
  has_mes_example: TriState;
  has_character_book: TriState;
  has_alternate_greetings: TriState;
  alternate_greetings_min: number;
  patterns: TriState;
}

const CARDS_FILTERS_STATE_FILE_PATH = join(
  process.cwd(),
  "data",
  "cards-filters-state.json"
);

const DEFAULT_STATE: CardsFiltersState = {
  sort: "created_at_desc",
  name: "",
  q: "",
  q_mode: "like",
  q_fields: [
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
  ],
  creator: [],
  spec_version: [],
  tags: [],
  created_from: undefined,
  created_to: undefined,
  prompt_tokens_min: 0,
  prompt_tokens_max: 0,
  is_sillytavern: "any",
  has_creator_notes: "any",
  has_system_prompt: "any",
  has_post_history_instructions: "any",
  has_personality: "any",
  has_scenario: "any",
  has_mes_example: "any",
  has_character_book: "any",
  has_alternate_greetings: "any",
  alternate_greetings_min: 0,
  patterns: "any",
};

const SORT_VALUES: CardsSort[] = [
  "created_at_desc",
  "created_at_asc",
  "name_asc",
  "name_desc",
  "prompt_tokens_desc",
  "prompt_tokens_asc",
  "relevance",
];

const Q_MODE_VALUES: CardsTextSearchMode[] = ["like", "fts"];

const FTS_FIELD_VALUES: CardsFtsField[] = [
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
];

function normalizeTriState(v: unknown, fallback: TriState = "any"): TriState {
  return v === "any" || v === "1" || v === "0" ? v : fallback;
}

function normalizeEnum<T extends string>(
  v: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  return typeof v === "string" && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : fallback;
}

function normalizeInt(v: unknown, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const s = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    const s = typeof raw === "string" ? raw.trim() : "";
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

function normalizeFtsFields(value: unknown): CardsFtsField[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const allowed = new Set(FTS_FIELD_VALUES);
  const out: CardsFtsField[] = [];
  const seen = new Set<string>();
  for (const raw of value) {
    if (typeof raw !== "string") continue;
    if (!allowed.has(raw as CardsFtsField)) continue;
    if (seen.has(raw)) continue;
    seen.add(raw);
    out.push(raw as CardsFtsField);
  }
  return out;
}

function normalizeState(raw: unknown): CardsFiltersState {
  const src = (typeof raw === "object" && raw !== null ? raw : {}) as any;

  const promptMin = normalizeInt(src.prompt_tokens_min, DEFAULT_STATE.prompt_tokens_min);
  const promptMaxRaw = normalizeInt(
    src.prompt_tokens_max,
    DEFAULT_STATE.prompt_tokens_max
  );
  const promptMax =
    promptMaxRaw > 0 && promptMaxRaw < promptMin ? promptMin : promptMaxRaw;

  const qFields = normalizeFtsFields(src.q_fields);

  return {
    sort: normalizeEnum(src.sort, SORT_VALUES, DEFAULT_STATE.sort),
    name: typeof src.name === "string" ? src.name : DEFAULT_STATE.name,
    q: typeof src.q === "string" ? src.q : DEFAULT_STATE.q,
    q_mode: normalizeEnum(src.q_mode, Q_MODE_VALUES, DEFAULT_STATE.q_mode),
    q_fields: qFields ?? DEFAULT_STATE.q_fields,
    creator: normalizeStringArray(src.creator),
    spec_version: normalizeStringArray(src.spec_version),
    tags: normalizeStringArray(src.tags),
    created_from: isIsoDate(src.created_from) ? src.created_from.trim() : undefined,
    created_to: isIsoDate(src.created_to) ? src.created_to.trim() : undefined,
    prompt_tokens_min: promptMin,
    prompt_tokens_max: promptMax,
    is_sillytavern: normalizeTriState(src.is_sillytavern, DEFAULT_STATE.is_sillytavern),
    has_creator_notes: normalizeTriState(
      src.has_creator_notes,
      DEFAULT_STATE.has_creator_notes
    ),
    has_system_prompt: normalizeTriState(
      src.has_system_prompt,
      DEFAULT_STATE.has_system_prompt
    ),
    has_post_history_instructions: normalizeTriState(
      src.has_post_history_instructions,
      DEFAULT_STATE.has_post_history_instructions
    ),
    has_personality: normalizeTriState(
      src.has_personality,
      DEFAULT_STATE.has_personality
    ),
    has_scenario: normalizeTriState(src.has_scenario, DEFAULT_STATE.has_scenario),
    has_mes_example: normalizeTriState(
      src.has_mes_example,
      DEFAULT_STATE.has_mes_example
    ),
    has_character_book: normalizeTriState(
      src.has_character_book,
      DEFAULT_STATE.has_character_book
    ),
    has_alternate_greetings: normalizeTriState(
      src.has_alternate_greetings,
      DEFAULT_STATE.has_alternate_greetings
    ),
    alternate_greetings_min: normalizeInt(
      src.alternate_greetings_min,
      DEFAULT_STATE.alternate_greetings_min
    ),
    patterns: normalizeTriState(src.patterns, DEFAULT_STATE.patterns),
  };
}

export async function getCardsFiltersState(): Promise<CardsFiltersState> {
  try {
    const data = await readFile(CARDS_FILTERS_STATE_FILE_PATH, "utf-8");
    const parsed = JSON.parse(data) as unknown;
    return normalizeState(parsed);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await ensureDir(join(process.cwd(), "data"));
      await writeFile(
        CARDS_FILTERS_STATE_FILE_PATH,
        JSON.stringify(DEFAULT_STATE, null, 2),
        "utf-8"
      );
      return DEFAULT_STATE;
    }
    // Corrupted JSON or other error: fall back to defaults
    return DEFAULT_STATE;
  }
}

export async function updateCardsFiltersState(
  newState: unknown
): Promise<CardsFiltersState> {
  if (typeof newState !== "object" || newState === null) {
    throw new AppError({
      status: 400,
      code: "api.cardsFiltersState.invalid_format",
    });
  }

  const normalized = normalizeState({ ...DEFAULT_STATE, ...(newState as any) });

  await ensureDir(join(process.cwd(), "data"));
  await writeFile(
    CARDS_FILTERS_STATE_FILE_PATH,
    JSON.stringify(normalized, null, 2),
    "utf-8"
  );

  return normalized;
}


