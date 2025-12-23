import { createEvent, createStore, sample } from "effector";
import type { CardDetails } from "@/shared/types/cards";
import type { CardDetailsDraft } from "./ui/types";
import type { LorebookDetails } from "@/shared/types/lorebooks";
import { $details, $openedId, closeCard, lorebookLoaded } from "./model";

function toDraft(details: CardDetails | null): CardDetailsDraft {
  return {
    name: details?.name ?? "",
    creator: details?.creator ?? "",
    tags: details?.tags ?? [],
    description: details?.description ?? "",
    personality: details?.personality ?? "",
    scenario: details?.scenario ?? "",
    first_mes: details?.first_mes ?? "",
    mes_example: details?.mes_example ?? "",
    creator_notes: details?.creator_notes ?? "",
    system_prompt: details?.system_prompt ?? "",
    post_history_instructions: details?.post_history_instructions ?? "",
    alternate_greetings: details?.alternate_greetings ?? [],
    group_only_greetings: details?.group_only_greetings ?? [],
  };
}

export type DraftField = keyof CardDetailsDraft;

export const draftLoaded = createEvent<CardDetails>();
export const fieldChanged = createEvent<{
  field: DraftField;
  value: CardDetailsDraft[DraftField];
}>();
export const draftSaved = createEvent<void>();

export const $draft = createStore<CardDetailsDraft>(toDraft(null))
  .on(draftLoaded, (_, details) => toDraft(details))
  .on(fieldChanged, (draft, { field, value }) => {
    if (Object.is(draft[field], value)) return draft;
    return { ...draft, [field]: value } as CardDetailsDraft;
  })
  .reset(closeCard);

// -------- Greetings (alternate / group-only) --------
type GreetingList = "alt" | "group";

export const greetingsLoaded = createEvent<{
  alternate_greetings: string[];
  group_only_greetings: string[];
}>();

export const greetingValueChanged = createEvent<{
  list: GreetingList;
  id: string;
  value: string;
}>();
export const greetingAdded = createEvent<{ list: GreetingList }>();
export const greetingDuplicated = createEvent<{
  list: GreetingList;
  id: string;
}>();
export const greetingDeleted = createEvent<{
  list: GreetingList;
  id: string;
}>();
export const greetingMoved = createEvent<{
  list: GreetingList;
  id: string;
  direction: "up" | "down";
}>();

// -------- Lorebook --------
export const lorebookChanged = createEvent<LorebookDetails | null>();
export const lorebookCleared = createEvent<void>();

export const $lorebook = createStore<LorebookDetails | null>(null)
  .on(lorebookLoaded, (_, lorebook) => lorebook)
  .on(lorebookChanged, (_, lorebook) => lorebook)
  .on(lorebookCleared, () => null)
  .reset(closeCard);

export const $isDirty = createStore(false)
  .on(fieldChanged, () => true)
  .on(greetingValueChanged, () => true)
  .on(greetingAdded, () => true)
  .on(greetingDuplicated, () => true)
  .on(greetingDeleted, () => true)
  .on(greetingMoved, () => true)
  .on(lorebookChanged, () => true)
  .on(lorebookCleared, () => true)
  .reset(draftLoaded)
  .reset(greetingsLoaded)
  .reset(draftSaved)
  .reset(lorebookLoaded)
  .reset(closeCard);

type GreetingsState = {
  counter: number;
  ids: string[];
  values: Record<string, string>;
};

function initGreetings(prefix: GreetingList, values: string[]): GreetingsState {
  const ids: string[] = [];
  const map: Record<string, string> = {};
  for (let i = 0; i < values.length; i += 1) {
    const id = `${prefix}:${i + 1}`;
    ids.push(id);
    map[id] = values[i] ?? "";
  }
  return { counter: values.length, ids, values: map };
}

function nextId(prefix: GreetingList, counter: number): string {
  return `${prefix}:${counter + 1}`;
}

function duplicateInList(
  ids: string[],
  afterId: string,
  newId: string
): string[] {
  const idx = ids.findIndex((x) => x === afterId);
  if (idx < 0) return [...ids, newId];
  const next = [...ids];
  next.splice(idx + 1, 0, newId);
  return next;
}

function moveInList(
  ids: string[],
  id: string,
  direction: "up" | "down"
): string[] {
  const idx = ids.findIndex((x) => x === id);
  if (idx < 0) return ids;
  const newIdx = direction === "up" ? idx - 1 : idx + 1;
  if (newIdx < 0 || newIdx >= ids.length) return ids;
  const next = [...ids];
  [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
  return next;
}

const $altGreetings = createStore<GreetingsState>({
  counter: 0,
  ids: [],
  values: {},
})
  .on(greetingsLoaded, (_, p) =>
    initGreetings("alt", p.alternate_greetings ?? [])
  )
  .on(greetingValueChanged, (st, p) => {
    if (p.list !== "alt") return st;
    if (Object.is(st.values[p.id], p.value)) return st;
    return { ...st, values: { ...st.values, [p.id]: p.value } };
  })
  .on(greetingAdded, (st, p) => {
    if (p.list !== "alt") return st;
    const id = nextId("alt", st.counter);
    return {
      counter: st.counter + 1,
      ids: [...st.ids, id],
      values: { ...st.values, [id]: "" },
    };
  })
  .on(greetingDeleted, (st, p) => {
    if (p.list !== "alt") return st;
    if (!st.ids.includes(p.id)) return st;
    const nextValues = { ...st.values };
    delete nextValues[p.id];
    return {
      ...st,
      ids: st.ids.filter((x) => x !== p.id),
      values: nextValues,
    };
  })
  .on(greetingDuplicated, (st, p) => {
    if (p.list !== "alt") return st;
    const id = nextId("alt", st.counter);
    const v = st.values[p.id] ?? "";
    return {
      counter: st.counter + 1,
      ids: duplicateInList(st.ids, p.id, id),
      values: { ...st.values, [id]: v },
    };
  })
  .on(greetingMoved, (st, p) => {
    if (p.list !== "alt") return st;
    return {
      ...st,
      ids: moveInList(st.ids, p.id, p.direction),
    };
  })
  .reset(closeCard);

const $groupGreetings = createStore<GreetingsState>({
  counter: 0,
  ids: [],
  values: {},
})
  .on(greetingsLoaded, (_, p) =>
    initGreetings("group", p.group_only_greetings ?? [])
  )
  .on(greetingValueChanged, (st, p) => {
    if (p.list !== "group") return st;
    if (Object.is(st.values[p.id], p.value)) return st;
    return { ...st, values: { ...st.values, [p.id]: p.value } };
  })
  .on(greetingAdded, (st, p) => {
    if (p.list !== "group") return st;
    const id = nextId("group", st.counter);
    return {
      counter: st.counter + 1,
      ids: [...st.ids, id],
      values: { ...st.values, [id]: "" },
    };
  })
  .on(greetingDeleted, (st, p) => {
    if (p.list !== "group") return st;
    if (!st.ids.includes(p.id)) return st;
    const nextValues = { ...st.values };
    delete nextValues[p.id];
    return {
      ...st,
      ids: st.ids.filter((x) => x !== p.id),
      values: nextValues,
    };
  })
  .on(greetingDuplicated, (st, p) => {
    if (p.list !== "group") return st;
    const id = nextId("group", st.counter);
    const v = st.values[p.id] ?? "";
    return {
      counter: st.counter + 1,
      ids: duplicateInList(st.ids, p.id, id),
      values: { ...st.values, [id]: v },
    };
  })
  .on(greetingMoved, (st, p) => {
    if (p.list !== "group") return st;
    return {
      ...st,
      ids: moveInList(st.ids, p.id, p.direction),
    };
  })
  .reset(closeCard);

export const $altGreetingIds = $altGreetings.map((s) => s.ids);
export const $altGreetingValues = $altGreetings.map((s) => s.values);
export const $groupGreetingIds = $groupGreetings.map((s) => s.ids);
export const $groupGreetingValues = $groupGreetings.map((s) => s.values);

// Load draft & greetings when details for openedId arrive.
sample({
  clock: $details.updates,
  source: $openedId,
  filter: (openedId, details) =>
    Boolean(openedId && details && details.id === openedId),
  fn: (_, details) => details as CardDetails,
  target: draftLoaded,
});

sample({
  clock: draftLoaded,
  fn: (details) => ({
    alternate_greetings: details.alternate_greetings ?? [],
    group_only_greetings: details.group_only_greetings ?? [],
  }),
  target: greetingsLoaded,
});
