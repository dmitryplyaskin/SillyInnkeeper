import { combine, createEffect, createEvent, createStore, sample } from "effector";
import { $cards } from "@/entities/cards";
import { refreshCardsSilent } from "@/entities/cards";
import { deleteCardsBulk } from "@/shared/api/cards";

export const toggleMultiSelectMode = createEvent<void>();
export const setMultiSelectMode = createEvent<boolean>();
export const clearSelectedCards = createEvent<void>();
export const toggleCardSelected = createEvent<string>();
export const deleteSelectedCardsRequested = createEvent<void>();
export const clearDeleteStatus = createEvent<void>();

const setSelectedMap = createEvent<Record<string, true>>();
const setDeleteError = createEvent<string | null>();
const setDeleteResult = createEvent<{ deleted: number } | null>();

export const deleteCardsBulkFx = createEffect<
  { cardIds: string[] },
  { ok: true; deleted: number; deleted_ids: string[] },
  Error
>(async ({ cardIds }) => {
  return await deleteCardsBulk(cardIds);
});

export const $isMultiSelectMode = createStore(false)
  .on(toggleMultiSelectMode, (v) => !v)
  .on(setMultiSelectMode, (_, v) => v);

export const $selectedCardsMap = createStore<Record<string, true>>({})
  .on(setSelectedMap, (_, v) => v)
  .reset(clearSelectedCards);

export const $selectedCardsCount = combine(
  $selectedCardsMap,
  (m) => Object.keys(m).length
);

export const $isDeleting = combine(deleteCardsBulkFx.pending, (p) => p);
export const $deleteError = createStore<string | null>(null).on(
  setDeleteError,
  (_, v) => v
);
export const $lastDeleteResult = createStore<{ deleted: number } | null>(
  null
).on(setDeleteResult, (_, v) => v);

$deleteError.reset(clearDeleteStatus);
$lastDeleteResult.reset(clearDeleteStatus);

// When multi-select mode is disabled, always clear selection.
sample({
  clock: $isMultiSelectMode.updates,
  filter: (isOn) => !isOn,
  target: clearSelectedCards,
});

// Toggle selection for a card id (idempotent).
sample({
  clock: toggleCardSelected,
  source: $selectedCardsMap,
  fn: (map, id) => {
    const next = { ...map };
    if (next[id]) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete next[id];
    } else {
      next[id] = true;
    }
    return next;
  },
  target: setSelectedMap,
});

// Bulk delete: request -> take current selected ids -> call API
sample({
  clock: deleteSelectedCardsRequested,
  source: $selectedCardsMap,
  filter: (m) => Object.keys(m).length > 0,
  fn: (m) => ({ cardIds: Object.keys(m) }),
  target: deleteCardsBulkFx,
});

sample({
  clock: deleteSelectedCardsRequested,
  fn: () => null,
  target: [setDeleteError, setDeleteResult],
});

sample({
  clock: deleteCardsBulkFx.doneData,
  fn: (r) => ({ deleted: r.deleted }),
  target: setDeleteResult,
});

sample({
  clock: deleteCardsBulkFx.failData,
  fn: (e) => e.message,
  target: setDeleteError,
});

sample({
  clock: deleteCardsBulkFx.doneData,
  target: [clearSelectedCards, setMultiSelectMode.prepend(() => false)],
});

sample({
  clock: deleteCardsBulkFx.doneData,
  target: refreshCardsSilent,
});

// Keep only selected ids that still exist in the current cards list.
sample({
  clock: $cards.updates,
  source: $selectedCardsMap,
  fn: (selectedMap, cards) => {
    if (Object.keys(selectedMap).length === 0) return selectedMap;
    const alive = new Set(cards.map((c) => c.id));
    const next: Record<string, true> = {};
    for (const id of Object.keys(selectedMap)) {
      if (alive.has(id)) next[id] = true;
    }
    return next;
  },
  target: setSelectedMap,
});


