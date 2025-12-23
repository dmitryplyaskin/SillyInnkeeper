import { combine, createEffect, createEvent, createStore, sample } from "effector";
import { getCardDetails } from "@/shared/api/cards";
import { getLorebooks, getLorebook } from "@/shared/api/lorebooks";
import type { CardDetails } from "@/shared/types/cards";
import type { LorebookDetails } from "@/shared/types/lorebooks";

type LoadParams = { requestId: number; id: string };
type LoadResult = { requestId: number; details: CardDetails };

const loadDetailsInternalFx = createEffect<LoadParams, LoadResult, Error>(
  async ({ requestId, id }) => {
    const details = await getCardDetails(id);
    return { requestId, details };
  }
);

// Stores
export const $openedId = createStore<string | null>(null);
export const $details = createStore<CardDetails | null>(null);
export const $error = createStore<string | null>(null);
const $lastRequestId = createStore(0);

export const $isLoading = combine(loadDetailsInternalFx.pending, (p) => p);

// Events
export const openCard = createEvent<string>();
export const closeCard = createEvent<void>();
export const lorebookLoaded = createEvent<LorebookDetails | null>();

const setDetails = createEvent<CardDetails | null>();
const setError = createEvent<string | null>();

$openedId.on(openCard, (_, id) => id).reset(closeCard);
$details.on(setDetails, (_, d) => d).reset(closeCard);
$error.on(setError, (_, e) => e).reset(closeCard);
$lastRequestId.on(loadDetailsInternalFx, (_, p) => p.requestId).reset(closeCard);

// Trigger effect with takeLatest semantics
sample({
  clock: openCard,
  source: $lastRequestId,
  fn: (lastId, id): LoadParams => ({ requestId: lastId + 1, id }),
  target: loadDetailsInternalFx,
});

sample({
  clock: loadDetailsInternalFx.doneData,
  source: $lastRequestId,
  filter: (lastId, done) => done.requestId === lastId,
  fn: (_, done) => done.details,
  target: setDetails,
});

sample({
  clock: loadDetailsInternalFx.doneData,
  fn: () => null,
  target: setError,
});

sample({
  clock: loadDetailsInternalFx.failData,
  fn: (error: Error) => error.message,
  target: setError,
});

// keep backward-compatible export name if needed later
export const loadCardDetailsFx = loadDetailsInternalFx;

// -------- Lorebook loading --------
const loadLorebookFx = createEffect<
  { cardId: string; details: CardDetails },
  LorebookDetails | null,
  Error
>(async ({ cardId, details }) => {
    // 1. Попытка загрузить через API
    try {
      const apiLorebooks = await getLorebooks({ card_id: cardId, limit: 1 });
      if (apiLorebooks.length > 0) {
        return await getLorebook(apiLorebooks[0].id);
      }
    } catch (error) {
      // Если ошибка при загрузке через API, пробуем извлечь из data_json
    }

    // 2. Если нет, извлечь из data_json
    const dataJson = details.data_json as any;
    const characterBook = dataJson?.data?.character_book;

    if (characterBook && typeof characterBook === "object") {
      // Создать временный объект LorebookDetails из character_book
      return {
        id: "",
        name: null,
        description: null,
        spec: "lorebook_v3",
        created_at: 0,
        updated_at: 0,
        data: characterBook,
        cards: [],
      };
    }

    return null;
  });

// Load lorebook when card details are loaded
sample({
  clock: $details.updates,
  source: $openedId,
  filter: (openedId, details) =>
    Boolean(openedId && details && details.id === openedId),
  fn: (openedId, details) => ({
    cardId: openedId as string,
    details: details as CardDetails,
  }),
  target: loadLorebookFx,
});

sample({
  clock: loadLorebookFx.doneData,
  target: lorebookLoaded,
});


