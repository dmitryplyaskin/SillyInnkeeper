import { createEffect, createEvent, createStore, sample, combine } from "effector";
import { notifications } from "@mantine/notifications";
import i18n from "@/shared/i18n/i18n";
import type { Tag } from "@/shared/types/tags";
import { getTags, startBulkEditTags } from "@/shared/api/tags";

export type TagsBulkEditAction = "replace" | "delete";
export type ReplaceMode = "existing" | "new";

export const openTagsBulkEditModal = createEvent<void>();
export const closeTagsBulkEditModal = createEvent<void>();

export const actionChanged = createEvent<TagsBulkEditAction>();
export const fromTagsChanged = createEvent<string[]>();
export const replaceModeChanged = createEvent<ReplaceMode>();
export const toExistingRawNameChanged = createEvent<string | null>();
export const toNewNameChanged = createEvent<string>();

export const applyClicked = createEvent<void>();

export const loadTagsFx = createEffect<void, Tag[], Error>(async () => {
  return await getTags();
});

export const startBulkEditFx = createEffect<
  {
    action: TagsBulkEditAction;
    from: string[];
    to?:
      | { kind: "existing"; rawName: string }
      | { kind: "new"; name: string };
  },
  { run_id: string },
  Error
>(async (payload) => {
  return await startBulkEditTags(payload);
});

type StartBulkEditPayload = Parameters<typeof startBulkEditFx>[0];

export const $opened = createStore(false)
  .on(openTagsBulkEditModal, () => true)
  .on(closeTagsBulkEditModal, () => false);

export const $tags = createStore<Tag[]>([]).on(loadTagsFx.doneData, (_, tags) => tags);
export const $tagsError = createStore<string | null>(null)
  .on(loadTagsFx.failData, (_, e) => e.message)
  .on([openTagsBulkEditModal, loadTagsFx.done], () => null);

export const $action = createStore<TagsBulkEditAction>("replace")
  .on(actionChanged, (_, v) => v)
  .reset(closeTagsBulkEditModal);

export const $from = createStore<string[]>([])
  .on(fromTagsChanged, (_, v) => v)
  .reset(closeTagsBulkEditModal);

export const $replaceMode = createStore<ReplaceMode>("existing")
  .on(replaceModeChanged, (_, v) => v)
  .reset(closeTagsBulkEditModal);

export const $toExistingRawName = createStore<string | null>(null)
  .on(toExistingRawNameChanged, (_, v) => v)
  .reset(closeTagsBulkEditModal);

export const $toNewName = createStore<string>("")
  .on(toNewNameChanged, (_, v) => v)
  .reset(closeTagsBulkEditModal);

export const $loading = combine(
  {
    loadingTags: loadTagsFx.pending,
    starting: startBulkEditFx.pending,
  },
  (x) => x
);

export const $isFormValid = combine(
  {
    action: $action,
    from: $from,
    replaceMode: $replaceMode,
    toExisting: $toExistingRawName,
    toNew: $toNewName,
  },
  ({ action, from, replaceMode, toExisting, toNew }) => {
    if (!from || from.length === 0) return false;
    if (action === "delete") return true;
    if (replaceMode === "existing") return Boolean(toExisting && toExisting.trim().length > 0);
    return toNew.trim().length > 0;
  }
);

export const $canApply = combine(
  {
    valid: $isFormValid,
    starting: startBulkEditFx.pending,
  },
  ({ valid, starting }) => valid && !starting
);

sample({ clock: openTagsBulkEditModal, target: loadTagsFx });

sample({
  clock: applyClicked,
  source: {
    action: $action,
    from: $from,
    replaceMode: $replaceMode,
    toExisting: $toExistingRawName,
    toNew: $toNewName,
    isValid: $isFormValid,
  },
  filter: ({ isValid }) => isValid,
  fn: ({ action, from, replaceMode, toExisting, toNew }) => {
    const payload =
      action === "delete"
        ? ({ action, from } satisfies StartBulkEditPayload)
        : replaceMode === "existing"
          ? ({
              action,
              from,
              to: { kind: "existing", rawName: String(toExisting ?? "") },
            } satisfies StartBulkEditPayload)
          : ({
              action,
              from,
              to: { kind: "new", name: toNew },
            } satisfies StartBulkEditPayload);

    return payload;
  },
  target: startBulkEditFx,
});

sample({
  clock: applyClicked,
  source: $isFormValid,
  filter: (isValid) => !isValid,
  fn: () => {
    notifications.show({
      title: i18n.t("errors.generic"),
      message: i18n.t("tagsBulkEdit.validation.fillRequired"),
      color: "red",
    });
  },
});

startBulkEditFx.doneData.watch(() => {
  notifications.show({
    title: i18n.t("tagsBulkEdit.startedTitle"),
    message: i18n.t("tagsBulkEdit.startedMessage"),
    color: "green",
  });
  closeTagsBulkEditModal();
});

startBulkEditFx.failData.watch((e) => {
  notifications.show({
    title: i18n.t("errors.generic"),
    message: e.message,
    color: "red",
  });
});


