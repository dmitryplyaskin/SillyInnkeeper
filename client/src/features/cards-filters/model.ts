import {
  createEffect,
  createEvent,
  createStore,
  sample,
  combine,
  merge,
} from "effector";
import { debounce } from "patronum/debounce";
import { getCardsFilters } from "@/shared/api/cards";
import {
  getCardsFiltersState,
  updateCardsFiltersState,
} from "@/shared/api/cards-filters-state";
import type { CardsFiltersResponse } from "@/shared/types/cards-filters";
import type { CardsFiltersState } from "@/shared/types/cards-filters-state";
import type {
  CardsFtsField,
  CardsQuery,
  CardsSort,
  CardsTextSearchMode,
  TriState,
} from "@/shared/types/cards-query";
import type { PatternRulesStatus } from "@/shared/types/pattern-rules-status";
import { getPatternRulesStatus } from "@/shared/api/pattern-rules";
import { loadCards, loadCardsSilent } from "@/entities/cards";

const DEFAULT_FILTERS: CardsFiltersState = {
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
  is_hidden: "0",
  fav: "any",
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
  st_chats_count: undefined,
  st_chats_count_op: "gte",
  st_profile_handle: undefined,
};

function toLocalDayStartMs(dateStr: string): number | undefined {
  const d = new Date(`${dateStr}T00:00:00`);
  const t = d.getTime();
  return Number.isFinite(t) ? t : undefined;
}

function toLocalDayEndMs(dateStr: string): number | undefined {
  const d = new Date(`${dateStr}T23:59:59.999`);
  const t = d.getTime();
  return Number.isFinite(t) ? t : undefined;
}

function toQuery(state: CardsFiltersState): CardsQuery {
  const created_from_ms = state.created_from
    ? toLocalDayStartMs(state.created_from)
    : undefined;
  const created_to_ms = state.created_to
    ? toLocalDayEndMs(state.created_to)
    : undefined;

  const q = state.q.trim();
  const hasQ = q.length > 0;
  const q_fields =
    hasQ && state.q_fields.length > 0 ? state.q_fields : undefined;

  // UX rule: if user selected "relevance" without q, keep UI selection but
  // fall back to default server sort.
  const sort: CardsSort | undefined =
    state.sort === "relevance" && !hasQ ? "created_at_desc" : state.sort;

  const min = state.alternate_greetings_min;
  const hasAlt = state.has_alternate_greetings;
  // Логика:
  // - has=1 => count >= max(1, min)
  // - has=0 => count = 0 (min игнорируется)
  // - has=any => если min>0 => count >= min
  const effectiveMin =
    hasAlt === "1" ? Math.max(1, min) : hasAlt === "0" ? 0 : min;

  const query: CardsQuery = {
    sort,
    name: state.name,
    q: hasQ ? q : undefined,
    q_mode: state.q_mode,
    q_fields,
    creator: state.creator,
    spec_version: state.spec_version,
    tags: state.tags,
    created_from_ms,
    created_to_ms,
    is_sillytavern: state.is_sillytavern,
    is_hidden: state.is_hidden,
    fav: state.fav,
    prompt_tokens_min:
      state.prompt_tokens_min > 0 ? state.prompt_tokens_min : undefined,
    prompt_tokens_max:
      state.prompt_tokens_max > 0 ? state.prompt_tokens_max : undefined,
    has_creator_notes: state.has_creator_notes,
    has_system_prompt: state.has_system_prompt,
    has_post_history_instructions: state.has_post_history_instructions,
    has_personality: state.has_personality,
    has_scenario: state.has_scenario,
    has_mes_example: state.has_mes_example,
    has_character_book: state.has_character_book,
    has_alternate_greetings: state.has_alternate_greetings,
    alternate_greetings_min:
      hasAlt === "0" ? undefined : effectiveMin > 0 ? effectiveMin : undefined,
    patterns: state.patterns,
    st_chats_count:
      typeof state.st_chats_count === "number" &&
      Number.isFinite(state.st_chats_count) &&
      state.st_chats_count >= 0
        ? state.st_chats_count
        : undefined,
    st_chats_count_op: state.st_chats_count_op ?? undefined,
    st_profile_handle:
      typeof state.st_profile_handle === "string" &&
      state.st_profile_handle.trim().length > 0
        ? state.st_profile_handle.trim()
        : undefined,
  };

  return query;
}

// Effects
export const loadCardsFiltersFx = createEffect<
  void,
  CardsFiltersResponse,
  Error
>(async () => {
  return await getCardsFilters();
});

export const loadPatternRulesStatusFx = createEffect<
  void,
  PatternRulesStatus,
  Error
>(async () => {
  return await getPatternRulesStatus();
});

export const loadCardsFiltersStateFx = createEffect<
  void,
  CardsFiltersState,
  Error
>(async () => {
  return await getCardsFiltersState();
});

export const saveCardsFiltersStateFx = createEffect<
  CardsFiltersState,
  CardsFiltersState,
  Error
>(async (state) => {
  return await updateCardsFiltersState(state);
});

// Kick-off init sequence (hydrate + then allow auto-apply)
export const initCardsFiltersFx = createEffect<void, void, Error>(async () => {
  // fire-and-forget; store graph handles success/fail
  try {
    void loadCardsFiltersFx();
  } catch {
    // ignore
  }
  try {
    void loadCardsFiltersStateFx();
  } catch {
    // ignore
  }
});

// Stores
export const $filters = createStore<CardsFiltersState>(DEFAULT_FILTERS);
export const $filtersReady = createStore<boolean>(false);
export const $filtersData = createStore<CardsFiltersResponse>({
  creators: [],
  spec_versions: [],
  tags: [],
  st_profiles: [],
});
export const $filtersError = createStore<string | null>(null);
export const $filtersLoading = combine(loadCardsFiltersFx.pending, (p) => p);
export const $patternRulesStatus = createStore<PatternRulesStatus | null>(
  null
).on(loadPatternRulesStatusFx.doneData, (_, s) => s);
export const $patternRulesStatusError = createStore<string | null>(null)
  .on(loadPatternRulesStatusFx.doneData, () => null)
  .on(loadPatternRulesStatusFx.failData, (_, e) => e.message);

// Events
export const setSort = createEvent<CardsSort>();
export const setName = createEvent<string>();
export const setQ = createEvent<string>();
export const setQMode = createEvent<CardsTextSearchMode>();
export const setQFields = createEvent<CardsFtsField[]>();
export const setCreators = createEvent<string[]>();
export const setSpecVersions = createEvent<string[]>();
export const setTags = createEvent<string[]>();
export const setCreatedFrom = createEvent<string | undefined>();
export const setCreatedTo = createEvent<string | undefined>();
export const setPromptTokensMin = createEvent<number>();
export const setPromptTokensMax = createEvent<number>();
export const setIsSillyTavern = createEvent<TriState>();
export const setIsHidden = createEvent<TriState>();
export const setFav = createEvent<TriState>();
export const setHasCreatorNotes = createEvent<TriState>();
export const setHasSystemPrompt = createEvent<TriState>();
export const setHasPostHistoryInstructions = createEvent<TriState>();
export const setHasPersonality = createEvent<TriState>();
export const setHasScenario = createEvent<TriState>();
export const setHasMesExample = createEvent<TriState>();
export const setHasCharacterBook = createEvent<TriState>();
export const setHasAlternateGreetings = createEvent<TriState>();
export const setAlternateGreetingsMin = createEvent<number>();
export const setPatterns = createEvent<TriState>();
export const setStChatsCount = createEvent<number | undefined>();
export const setStChatsCountOp = createEvent<"eq" | "gte" | "lte">();
export const setStProfileHandle = createEvent<string | undefined>();
export const resetFilters = createEvent<void>();
export const applyFilters = createEvent<void>();
export const applyFiltersSilent = createEvent<void>();
const hydrateFilters = createEvent<CardsFiltersState>();
const hydrationFinished = createEvent<void>();
const setFiltersReady = createEvent<boolean>();
export const applyTagsBulkEditToSelectedTags = createEvent<{
  action: "replace" | "delete";
  from_raw: string[]; // rawName (normalized)
  to_name?: string | null; // display name to add (optional, for replace)
}>();

$filters
  .on(setSort, (s, sort) => ({ ...s, sort }))
  .on(setName, (s, name) => ({ ...s, name }))
  .on(setQ, (s, q) => ({ ...s, q }))
  .on(setQMode, (s, q_mode) => ({ ...s, q_mode }))
  .on(setQFields, (s, q_fields) => ({ ...s, q_fields }))
  .on(setCreators, (s, creator) => ({ ...s, creator }))
  .on(setSpecVersions, (s, spec_version) => ({ ...s, spec_version }))
  .on(setTags, (s, tags) => ({ ...s, tags }))
  .on(setCreatedFrom, (s, created_from) => ({ ...s, created_from }))
  .on(setCreatedTo, (s, created_to) => ({ ...s, created_to }))
  .on(setIsSillyTavern, (s, is_sillytavern) => ({ ...s, is_sillytavern }))
  .on(setIsHidden, (s, is_hidden) => ({ ...s, is_hidden }))
  .on(setFav, (s, fav) => ({ ...s, fav }))
  .on(setPromptTokensMin, (s, prompt_tokens_min) => {
    const min = Number.isFinite(prompt_tokens_min)
      ? Math.max(0, Math.floor(prompt_tokens_min))
      : 0;
    const currentMax = Number.isFinite(s.prompt_tokens_max)
      ? Math.max(0, Math.floor(s.prompt_tokens_max))
      : 0;
    const max = currentMax > 0 && currentMax < min ? min : currentMax;
    return { ...s, prompt_tokens_min: min, prompt_tokens_max: max };
  })
  .on(setPromptTokensMax, (s, prompt_tokens_max) => {
    const min = Number.isFinite(s.prompt_tokens_min)
      ? Math.max(0, Math.floor(s.prompt_tokens_min))
      : 0;
    const max = Number.isFinite(prompt_tokens_max)
      ? Math.max(0, Math.floor(prompt_tokens_max))
      : 0;
    const fixedMax = max > 0 && max < min ? min : max;
    return { ...s, prompt_tokens_max: fixedMax };
  })
  .on(setHasCreatorNotes, (s, has_creator_notes) => ({
    ...s,
    has_creator_notes,
  }))
  .on(setHasSystemPrompt, (s, has_system_prompt) => ({
    ...s,
    has_system_prompt,
  }))
  .on(setHasPostHistoryInstructions, (s, has_post_history_instructions) => ({
    ...s,
    has_post_history_instructions,
  }))
  .on(setHasPersonality, (s, has_personality) => ({ ...s, has_personality }))
  .on(setHasScenario, (s, has_scenario) => ({ ...s, has_scenario }))
  .on(setHasMesExample, (s, has_mes_example) => ({ ...s, has_mes_example }))
  .on(setHasCharacterBook, (s, has_character_book) => ({
    ...s,
    has_character_book,
  }))
  .on(setHasAlternateGreetings, (s, has_alternate_greetings) => ({
    ...s,
    has_alternate_greetings,
  }))
  .on(setAlternateGreetingsMin, (s, alternate_greetings_min) => ({
    ...s,
    alternate_greetings_min: Number.isFinite(alternate_greetings_min)
      ? Math.max(0, alternate_greetings_min)
      : 0,
  }))
  .on(setPatterns, (s, patterns) => ({ ...s, patterns }))
  .on(setStChatsCount, (s, st_chats_count) => ({
    ...s,
    st_chats_count:
      typeof st_chats_count === "number" && Number.isFinite(st_chats_count)
        ? Math.max(0, Math.floor(st_chats_count))
        : undefined,
  }))
  .on(setStChatsCountOp, (s, st_chats_count_op) => ({
    ...s,
    st_chats_count_op,
  }))
  .on(setStProfileHandle, (s, st_profile_handle) => ({
    ...s,
    st_profile_handle:
      typeof st_profile_handle === "string" && st_profile_handle.trim().length > 0
        ? st_profile_handle.trim()
        : undefined,
  }))
  .on(applyTagsBulkEditToSelectedTags, (s, payload) => {
    const normalize = (x: string) => x.trim().toLowerCase();
    const fromSet = new Set(payload.from_raw.map((x) => normalize(String(x))));

    const hasIntersection = (s.tags ?? []).some((t) =>
      fromSet.has(normalize(t))
    );
    if (!hasIntersection) {
      // Do not change user's tag filters unless they actually depended on edited tags.
      return s;
    }

    const kept = (s.tags ?? []).filter((t) => !fromSet.has(normalize(t)));

    if (payload.action !== "replace") {
      return { ...s, tags: kept };
    }

    const toName = (payload.to_name ?? "").trim();
    if (!toName) {
      return { ...s, tags: kept };
    }

    const out: string[] = [];
    const seen = new Set<string>();
    for (const t of [...kept, toName]) {
      const key = normalize(t);
      if (!key) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t.trim());
    }

    return { ...s, tags: out };
  })
  .on(resetFilters, () => DEFAULT_FILTERS);

$filters.on(hydrateFilters, (_, next) => next);
$filtersReady.on(setFiltersReady, (_, v) => v);

// sync filters response
sample({
  clock: loadCardsFiltersFx.doneData,
  target: $filtersData,
});

// When lists are refreshed, drop selected tags that no longer exist in backend options.
sample({
  clock: loadCardsFiltersFx.doneData,
  source: $filters,
  fn: (filters, data) => {
    const normalize = (x: string) => x.trim().toLowerCase();
    const existing = new Set(data.tags.map((t) => normalize(t.value)));
    const nextTags = (filters.tags ?? []).filter((t) =>
      existing.has(normalize(t))
    );
    return nextTags;
  },
  target: setTags,
});

sample({
  clock: loadCardsFiltersFx.doneData,
  fn: () => null,
  target: $filtersError,
});

sample({
  clock: loadCardsFiltersFx.failData,
  fn: (e) => e.message,
  target: $filtersError,
});

// Keep patterns status fresh when filters lists are refreshed
sample({ clock: loadCardsFiltersFx, target: loadPatternRulesStatusFx });

// Hydrate from persisted state on startup.
sample({ clock: loadCardsFiltersStateFx.doneData, target: hydrateFilters });
sample({
  clock: loadCardsFiltersStateFx.failData,
  fn: () => DEFAULT_FILTERS,
  target: hydrateFilters,
});

sample({ clock: hydrateFilters, target: hydrationFinished });

// Allow auto-apply only after hydration is finished (even if we fell back to defaults)
sample({ clock: hydrationFinished, fn: () => true, target: setFiltersReady });

// First load: only after filters are hydrated
sample({
  clock: hydrationFinished,
  source: $filters,
  fn: (state) => toQuery(state),
  target: loadCards,
});

// Auto-apply:
// - name changes are debounced
// - q changes are debounced
// - other changes apply immediately
const nameDebounced = debounce({ source: setName, timeout: 500 });
const qDebounced = debounce({ source: setQ, timeout: 500 });

const immediateApplyClock = [
  setSort,
  setQMode,
  setQFields,
  setCreators,
  setSpecVersions,
  setTags,
  setCreatedFrom,
  setCreatedTo,
  setPromptTokensMin,
  setPromptTokensMax,
  setIsSillyTavern,
  setIsHidden,
  setFav,
  setHasCreatorNotes,
  setHasSystemPrompt,
  setHasPostHistoryInstructions,
  setHasPersonality,
  setHasScenario,
  setHasMesExample,
  setHasCharacterBook,
  setHasAlternateGreetings,
  setAlternateGreetingsMin,
  setPatterns,
  setStChatsCount,
  setStChatsCountOp,
  setStProfileHandle,
];

sample({
  clock: immediateApplyClock,
  source: { state: $filters, ready: $filtersReady },
  filter: ({ ready }) => ready,
  fn: ({ state }) => toQuery(state),
  target: loadCards,
});

sample({
  clock: nameDebounced,
  source: { state: $filters, ready: $filtersReady },
  filter: ({ ready }) => ready,
  fn: ({ state }) => toQuery(state),
  target: loadCards,
});

sample({
  clock: qDebounced,
  source: { state: $filters, ready: $filtersReady },
  filter: ({ ready }) => ready,
  fn: ({ state }) => toQuery(state),
  target: loadCards,
});

sample({
  clock: applyFilters,
  source: { state: $filters, ready: $filtersReady },
  filter: ({ ready }) => ready,
  fn: ({ state }) => toQuery(state),
  target: loadCards,
});

sample({
  clock: applyFiltersSilent,
  source: { state: $filters, ready: $filtersReady },
  filter: ({ ready }) => ready,
  fn: ({ state }) => toQuery(state),
  target: loadCardsSilent,
});

// Reset should deterministically apply defaults
sample({
  clock: resetFilters,
  source: $filtersReady,
  filter: (ready) => ready,
  fn: () => toQuery(DEFAULT_FILTERS),
  target: loadCards,
});

// Persist filters state to backend with debounce (500ms).
// Important: for text inputs (name/q) we persist only after their own debounce
// to avoid save request per keystroke.
const persistNonTextChanged = merge([
  setSort,
  setQMode,
  setQFields,
  setCreators,
  setSpecVersions,
  setTags,
  setCreatedFrom,
  setCreatedTo,
  setPromptTokensMin,
  setPromptTokensMax,
  setIsSillyTavern,
  setIsHidden,
  setFav,
  setHasCreatorNotes,
  setHasSystemPrompt,
  setHasPostHistoryInstructions,
  setHasPersonality,
  setHasScenario,
  setHasMesExample,
  setHasCharacterBook,
  setHasAlternateGreetings,
  setAlternateGreetingsMin,
  setPatterns,
  setStChatsCount,
  setStChatsCountOp,
  setStProfileHandle,
  applyTagsBulkEditToSelectedTags,
  resetFilters,
]);

const persistNonTextDebounced = debounce({
  source: persistNonTextChanged,
  timeout: 500,
});

const persistClock = merge([
  persistNonTextDebounced,
  nameDebounced,
  qDebounced,
]);

sample({
  clock: persistClock,
  source: { state: $filters, ready: $filtersReady },
  filter: ({ ready }) => ready,
  fn: ({ state }) => state,
  target: saveCardsFiltersStateFx,
});
