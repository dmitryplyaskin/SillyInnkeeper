import { combine, createEffect, createEvent, createStore, sample } from "effector";
import { notifications } from "@mantine/notifications";
import i18n from "@/shared/i18n/i18n";
import { pickFolder } from "@/shared/api/explorer";
import {
  getImportSettings,
  updateImportSettings,
} from "@/shared/api/import-settings";
import { startCardsImport } from "@/shared/api/cards-import";
import type {
  DuplicatesMode,
  ImportMode,
  ImportSettings,
} from "@/shared/types/import-settings";
import { $settings } from "@/entities/settings";

const DEFAULT_IMPORT_SETTINGS: ImportSettings = {
  sourceFolderPath: null,
  importMode: "copy",
  duplicatesMode: "skip",
};

export const openImportModal = createEvent<void>();
export const closeImportModal = createEvent<void>();
const closeImportModalSilent = createEvent<void>();

export const sourceFolderPathChanged = createEvent<string>();
export const importModeChanged = createEvent<ImportMode>();
export const duplicatesModeChanged = createEvent<DuplicatesMode>();
export const pickSourceFolderRequested = createEvent<void>();
export const importRequested = createEvent<void>();

const setError = createEvent<string | null>();
const setLoaded = createEvent<boolean>();

export const loadImportSettingsFx = createEffect<void, ImportSettings, Error>(
  async () => {
    return await getImportSettings();
  }
);

export const saveImportSettingsFx = createEffect<
  ImportSettings,
  ImportSettings,
  Error
>(async (settings) => {
  return await updateImportSettings(settings);
});

export const pickSourceFolderFx = createEffect<void, string | null, Error>(
  async () => {
    const res = await pickFolder(i18n.t("cardsImport.pickFolderDialogTitle"));
    if (res.cancelled || !res.path) return null;
    return res.path;
  }
);

export const startImportFx = createEffect<
  { sourceFolderPath: string; importMode: ImportMode; duplicatesMode: DuplicatesMode },
  { ok: true; started: true },
  Error
>(async (params) => {
  return await startCardsImport(params);
});

export const $opened = createStore(false)
  .on(openImportModal, () => true)
  .on(closeImportModal, () => false)
  .on(closeImportModalSilent, () => false);

export const $isLoaded = createStore(false).on(setLoaded, (_, v) => v);

export const $importSettings = createStore<ImportSettings>(
  DEFAULT_IMPORT_SETTINGS
)
  .on(loadImportSettingsFx.doneData, (_, s) => s)
  .on(sourceFolderPathChanged, (s, v) => ({
    ...s,
    sourceFolderPath: v.trim().length > 0 ? v : null,
  }))
  .on(importModeChanged, (s, v) => ({ ...s, importMode: v }))
  .on(duplicatesModeChanged, (s, v) => ({ ...s, duplicatesMode: v }));

export const $error = createStore<string | null>(null).on(setError, (_, v) => v);

export const $isLoading = combine(
  loadImportSettingsFx.pending,
  saveImportSettingsFx.pending,
  pickSourceFolderFx.pending,
  startImportFx.pending,
  (a, b, c, d) => a || b || c || d
);

export const $isPickingFolder = combine(
  pickSourceFolderFx.pending,
  (pending) => pending
);

export const $isStartingImport = combine(
  startImportFx.pending,
  (pending) => pending
);

// Open -> load persisted modal settings.
sample({
  clock: openImportModal,
  target: loadImportSettingsFx,
});

sample({
  clock: loadImportSettingsFx.done,
  fn: () => true,
  target: setLoaded,
});

sample({
  clock: loadImportSettingsFx.failData,
  fn: (e) => e.message,
  target: setError,
});

sample({
  clock: [openImportModal, loadImportSettingsFx.doneData],
  fn: () => null,
  target: setError,
});

// Folder picker.
sample({
  clock: pickSourceFolderRequested,
  target: pickSourceFolderFx,
});

sample({
  clock: pickSourceFolderFx.doneData,
  filter: (path): path is string => typeof path === "string" && path.trim().length > 0,
  target: sourceFolderPathChanged,
});

sample({
  clock: pickSourceFolderFx.failData,
  fn: (e) => e.message,
  target: setError,
});

// Close modal -> persist settings (best-effort).
sample({
  clock: closeImportModal,
  source: { isLoaded: $isLoaded, settings: $importSettings },
  filter: ({ isLoaded }) => isLoaded,
  fn: ({ settings }) => settings,
  target: saveImportSettingsFx,
});

// Import -> validate and start.
sample({
  clock: importRequested,
  source: { settings: $importSettings, app: $settings },
  filter: ({ settings, app }) => {
    const hasSource = Boolean(settings.sourceFolderPath?.trim());
    const hasTarget = Boolean(app?.cardsFolderPath?.trim());
    return hasSource && hasTarget;
  },
  fn: ({ settings }) => settings,
  target: saveImportSettingsFx,
});

sample({
  clock: importRequested,
  source: { settings: $importSettings, app: $settings },
  filter: ({ settings, app }) => {
    const hasSource = Boolean(settings.sourceFolderPath?.trim());
    const hasTarget = Boolean(app?.cardsFolderPath?.trim());
    return !hasSource || !hasTarget;
  },
  fn: ({ settings, app }) => {
    if (!app?.cardsFolderPath) return i18n.t("cardsImport.cardsFolderNotConfigured");
    if (!settings.sourceFolderPath) return i18n.t("cardsImport.sourceFolderRequired");
    return i18n.t("errors.generic");
  },
  target: setError,
});

sample({
  clock: saveImportSettingsFx.doneData,
  filter: (s) => Boolean(s.sourceFolderPath && s.sourceFolderPath.trim().length > 0),
  fn: (s) => ({
    sourceFolderPath: s.sourceFolderPath as string,
    importMode: s.importMode,
    duplicatesMode: s.duplicatesMode,
  }),
  target: startImportFx,
});

sample({
  clock: startImportFx.doneData,
  fn: () => {
    notifications.show({
      title: i18n.t("cardsImport.importStartedTitle"),
      message: i18n.t("cardsImport.importStartedMessage"),
      color: "green",
    });
    return null;
  },
  target: [closeImportModalSilent, setError],
});

sample({
  clock: startImportFx.failData,
  fn: (e) => e.message,
  target: setError,
});


