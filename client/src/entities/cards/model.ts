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

const loadCardsInternalFx = createEffect<LoadCardsParams, LoadCardsResult, Error>(
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
export const $isLoading = combine(
  loadCardsInternalFx.pending,
  (pending) => pending
);

// Events
export const loadCards = createEvent<CardsQuery | void>();
const setCards = createEvent<CardListItem[]>();
const setError = createEvent<string | null>();

// Обновление stores через события
$cards.on(setCards, (_, cards) => cards);
$error.on(setError, (_, error) => error);
$lastRequestId.on(loadCardsInternalFx, (_, p) => p.requestId);

// Связывание effects с событиями
sample({
  clock: loadCardsInternalFx.doneData,
  source: $lastRequestId,
  filter: (lastId, done) => done.requestId === lastId,
  fn: (_, done) => done.cards,
  target: setCards,
});

sample({
  clock: loadCardsInternalFx.doneData,
  fn: () => null,
  target: setError,
});

sample({
  clock: loadCardsInternalFx.failData,
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
  target: loadCardsInternalFx,
});

// keep backward-compatible export name (but prefer `loadCards` event)
export const loadCardsFx = loadCardsInternalFx;
