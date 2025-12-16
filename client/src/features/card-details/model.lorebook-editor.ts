import {
  combine,
  createEffect,
  createEvent,
  createStore,
  sample,
} from "effector";
import { loadCardsFx } from "@/entities/cards";
import type {
  LorebookDetails,
  LorebookSummary,
} from "@/shared/types/lorebooks";
import {
  getLorebook,
  getLorebooks,
  updateLorebook,
} from "@/shared/api/lorebooks";
import { $lorebook, lorebookChanged } from "./model.form";

// -------- Picker --------
export const lorebookPickerOpened = createEvent<void>();
export const lorebookPickerQueryChanged = createEvent<string>();
export const lorebookPicked = createEvent<string>();

const loadAllLorebooksFx = createEffect<void, LorebookSummary[], Error>(
  async () => {
    return await getLorebooks();
  }
);

const pickLorebookFx = createEffect<string, LorebookDetails, Error>(
  async (id) => {
    return await getLorebook(id);
  }
);

export const $lorebookPickerQuery = createStore("").on(
  lorebookPickerQueryChanged,
  (_, q) => q
);

export const $lorebookPickerLoaded = createStore(false).on(
  loadAllLorebooksFx.doneData,
  () => true
);

export const $lorebookPickerLoading = combine(
  loadAllLorebooksFx.pending,
  pickLorebookFx.pending,
  (a, b) => a || b
);

export const $lorebookPickerItems = createStore<LorebookSummary[]>([]).on(
  loadAllLorebooksFx.doneData,
  (_, items) => items
);

// Загружаем список лорабуков один раз:
// - при первой загрузке списка карточек
// - либо при открытии пикера (на случай если карточки ещё не загружались)
// Дальше это кэшируется и не перезапрашивается при переключении карточек.
sample({
  clock: lorebookPickerOpened,
  source: $lorebookPickerLoaded,
  filter: (loaded) => !loaded,
  target: loadAllLorebooksFx,
});

sample({
  clock: loadCardsFx.doneData,
  source: $lorebookPickerLoaded,
  filter: (loaded) => !loaded,
  fn: () => undefined,
  target: loadAllLorebooksFx,
});

sample({
  clock: lorebookPicked,
  target: pickLorebookFx,
});

sample({
  clock: pickLorebookFx.doneData,
  target: lorebookChanged,
});

// Prefill query when lorebook changes (only if user hasn't typed)
sample({
  clock: $lorebook.updates,
  source: $lorebookPickerQuery,
  filter: (q, lb) =>
    q.trim().length === 0 && Boolean(lb && (lb.name ?? "").trim().length > 0),
  fn: (_, lb) => (lb?.name ?? "").trim(),
  target: lorebookPickerQueryChanged,
});

// -------- Editor UI state --------
export const lorebookEditModeChanged = createEvent<"copy" | "shared">();
export const lorebookEntrySearchChanged = createEvent<string>();
export const lorebookPageChanged = createEvent<number>();
export const lorebookPageSizeChanged = createEvent<number>();
export const lorebookToggleEntryExpanded = createEvent<number>();
export const lorebookCollapseAll = createEvent<void>();

export const $lorebookEditMode = createStore<"copy" | "shared">("copy").on(
  lorebookEditModeChanged,
  (_, v) => v
);

export const $lorebookEntrySearch = createStore("").on(
  lorebookEntrySearchChanged,
  (_, v) => v
);

export const $lorebookPage = createStore(1)
  .on(lorebookPageChanged, (_, v) => v)
  .reset(lorebookEntrySearchChanged, lorebookPageSizeChanged);

export const $lorebookPageSize = createStore(25)
  .on(lorebookPageSizeChanged, (_, v) => v)
  .reset(lorebookEntrySearchChanged);

export const $lorebookExpanded = createStore<Record<number, boolean>>({})
  .on(lorebookToggleEntryExpanded, (st, idx) => ({ ...st, [idx]: !st[idx] }))
  .reset(lorebookCollapseAll);

// -------- Shared-save (DB) --------
export const saveLorebookSharedClicked = createEvent<void>();

export const saveLorebookSharedFx = createEffect<
  { id: string; data: unknown },
  LorebookDetails,
  Error
>(async ({ id, data }) => {
  return await updateLorebook({ id, data });
});

export const $isSavingSharedLorebook = saveLorebookSharedFx.pending;

sample({
  clock: saveLorebookSharedClicked,
  source: { lb: $lorebook, mode: $lorebookEditMode },
  filter: ({ lb, mode }) =>
    mode === "shared" && Boolean(lb?.id && lb.id.trim().length > 0),
  fn: ({ lb }) => ({
    id: (lb as LorebookDetails).id,
    data: (lb as LorebookDetails).data,
  }),
  target: saveLorebookSharedFx,
});

sample({
  clock: saveLorebookSharedFx.doneData,
  target: lorebookChanged,
});
