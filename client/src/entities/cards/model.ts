import {
  createStore,
  createEffect,
  createEvent,
  sample,
  combine,
} from "effector";
import { getCards } from "@/shared/api/cards";
import type { CardListItem } from "@/shared/types/cards";
import type { CardsQuery } from "@/shared/types/cards-query";

// Effects
type LoadCardsParams = { requestId: number; query?: CardsQuery };
type LoadCardsResult = { requestId: number; cards: CardListItem[] };

export const loadCardsFx = createEffect<
  LoadCardsParams,
  LoadCardsResult,
  Error
>(async ({ requestId, query }) => {
  const cards = await getCards(query);
  return { requestId, cards };
});

// Silent variant: does the same request, but is NOT tied to the global cards loader.
const loadCardsSilentFx = createEffect<LoadCardsParams, LoadCardsResult, Error>(
  async ({ requestId, query }) => {
    const cards = await getCards(query);
    return { requestId, cards };
  }
);

// Stores
export const $cards = createStore<CardListItem[]>([]);
export const $error = createStore<string | null>(null);
const $lastRequestId = createStore(0);

// Объединение pending состояний
export const $isLoading = combine(loadCardsFx.pending, (pending) => pending);

// Events
export const loadCards = createEvent<CardsQuery | void>();
export const loadCardsSilent = createEvent<CardsQuery | void>();
const setCards = createEvent<CardListItem[]>();
const setError = createEvent<string | null>();

// Обновление stores через события
$cards.on(setCards, (_, cards) => cards);
$error.on(setError, (_, error) => error);
$lastRequestId
  .on(loadCardsFx, (_, p) => p.requestId)
  .on(loadCardsSilentFx, (_, p) => p.requestId);

// Связывание effects с событиями
sample({
  clock: loadCardsFx.doneData,
  source: $lastRequestId,
  filter: (lastId, done) => done.requestId === lastId,
  fn: (_, done) => done.cards,
  target: setCards,
});

sample({
  clock: loadCardsSilentFx.doneData,
  source: $lastRequestId,
  filter: (lastId, done) => done.requestId === lastId,
  fn: (_, done) => done.cards,
  target: setCards,
});

sample({
  clock: [loadCardsFx.doneData, loadCardsSilentFx.doneData],
  fn: () => null,
  target: setError,
});

sample({
  clock: loadCardsFx.failData,
  fn: (error: Error) => error.message,
  target: setError,
});

// public trigger (takeLatest via requestId)
sample({
  clock: loadCards,
  source: $lastRequestId,
  fn: (lastId, query) => ({
    requestId: lastId + 1,
    query: query as CardsQuery | undefined,
  }),
  target: loadCardsFx,
});

// silent trigger (same semantics, but does not toggle `$isLoading`)
sample({
  clock: loadCardsSilent,
  source: $lastRequestId,
  fn: (lastId, query) => ({
    requestId: lastId + 1,
    query: query as CardsQuery | undefined,
  }),
  target: loadCardsSilentFx,
});
