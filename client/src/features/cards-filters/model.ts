import {
  createEffect,
  createEvent,
  createStore,
  sample,
  combine,
} from "effector";
import { debounce } from "patronum/debounce";
import { getCardsFilters } from "@/shared/api/cards";
import type { CardsFiltersResponse } from "@/shared/types/cards-filters";
import type {
  CardsQuery,
  CardsSort,
  TriState,
} from "@/shared/types/cards-query";
import { loadCards, loadCardsSilent } from "@/entities/cards";

export interface CardsFiltersState {
  sort: CardsSort;
  name: string;
  creator: string[];
  spec_version: string[];
  tags: string[];
  created_from?: string; // YYYY-MM-DD
  created_to?: string; // YYYY-MM-DD
  prompt_tokens_min: number;
  prompt_tokens_max: number;
  has_creator_notes: TriState;
  has_system_prompt: TriState;
  has_post_history_instructions: TriState;
  has_personality: TriState;
  has_scenario: TriState;
  has_mes_example: TriState;
  has_character_book: TriState;
  has_alternate_greetings: TriState;
  alternate_greetings_min: number;
}

const DEFAULT_FILTERS: CardsFiltersState = {
  sort: "created_at_desc",
  name: "",
  creator: [],
  spec_version: [],
  tags: [],
  created_from: undefined,
  created_to: undefined,
  prompt_tokens_min: 0,
  prompt_tokens_max: 0,
  has_creator_notes: "any",
  has_system_prompt: "any",
  has_post_history_instructions: "any",
  has_personality: "any",
  has_scenario: "any",
  has_mes_example: "any",
  has_character_book: "any",
  has_alternate_greetings: "any",
  alternate_greetings_min: 0,
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

  const min = state.alternate_greetings_min;
  const hasAlt = state.has_alternate_greetings;
  // Логика:
  // - has=1 => count >= max(1, min)
  // - has=0 => count = 0 (min игнорируется)
  // - has=any => если min>0 => count >= min
  const effectiveMin =
    hasAlt === "1" ? Math.max(1, min) : hasAlt === "0" ? 0 : min;

  const query: CardsQuery = {
    sort: state.sort,
    name: state.name,
    creator: state.creator,
    spec_version: state.spec_version,
    tags: state.tags,
    created_from_ms,
    created_to_ms,
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

// Stores
export const $filters = createStore<CardsFiltersState>(DEFAULT_FILTERS);
export const $filtersData = createStore<CardsFiltersResponse>({
  creators: [],
  spec_versions: [],
  tags: [],
});
export const $filtersError = createStore<string | null>(null);
export const $filtersLoading = combine(loadCardsFiltersFx.pending, (p) => p);

// Events
export const setSort = createEvent<CardsSort>();
export const setName = createEvent<string>();
export const setCreators = createEvent<string[]>();
export const setSpecVersions = createEvent<string[]>();
export const setTags = createEvent<string[]>();
export const setCreatedFrom = createEvent<string | undefined>();
export const setCreatedTo = createEvent<string | undefined>();
export const setPromptTokensMin = createEvent<number>();
export const setPromptTokensMax = createEvent<number>();
export const setHasCreatorNotes = createEvent<TriState>();
export const setHasSystemPrompt = createEvent<TriState>();
export const setHasPostHistoryInstructions = createEvent<TriState>();
export const setHasPersonality = createEvent<TriState>();
export const setHasScenario = createEvent<TriState>();
export const setHasMesExample = createEvent<TriState>();
export const setHasCharacterBook = createEvent<TriState>();
export const setHasAlternateGreetings = createEvent<TriState>();
export const setAlternateGreetingsMin = createEvent<number>();
export const resetFilters = createEvent<void>();
export const applyFilters = createEvent<void>();
export const applyFiltersSilent = createEvent<void>();

$filters
  .on(setSort, (s, sort) => ({ ...s, sort }))
  .on(setName, (s, name) => ({ ...s, name }))
  .on(setCreators, (s, creator) => ({ ...s, creator }))
  .on(setSpecVersions, (s, spec_version) => ({ ...s, spec_version }))
  .on(setTags, (s, tags) => ({ ...s, tags }))
  .on(setCreatedFrom, (s, created_from) => ({ ...s, created_from }))
  .on(setCreatedTo, (s, created_to) => ({ ...s, created_to }))
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
  .on(resetFilters, () => DEFAULT_FILTERS);

// sync filters response
sample({
  clock: loadCardsFiltersFx.doneData,
  target: $filtersData,
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

// Auto-apply:
// - name changes are debounced
// - other changes apply immediately
const nameDebounced = debounce({ source: setName, timeout: 450 });

const immediateApplyClock = [
  setSort,
  setCreators,
  setSpecVersions,
  setTags,
  setCreatedFrom,
  setCreatedTo,
  setPromptTokensMin,
  setPromptTokensMax,
  setHasCreatorNotes,
  setHasSystemPrompt,
  setHasPostHistoryInstructions,
  setHasPersonality,
  setHasScenario,
  setHasMesExample,
  setHasCharacterBook,
  setHasAlternateGreetings,
  setAlternateGreetingsMin,
];

sample({
  clock: immediateApplyClock,
  source: $filters,
  fn: (state) => toQuery(state),
  target: loadCards,
});

sample({
  clock: nameDebounced,
  source: $filters,
  fn: (state) => toQuery(state),
  target: loadCards,
});

sample({
  clock: applyFilters,
  source: $filters,
  fn: (state) => toQuery(state),
  target: loadCards,
});

sample({
  clock: applyFiltersSilent,
  source: $filters,
  fn: (state) => toQuery(state),
  target: loadCardsSilent,
});

// Reset should deterministically apply defaults
sample({
  clock: resetFilters,
  fn: () => toQuery(DEFAULT_FILTERS),
  target: loadCards,
});
