import {
  createStore,
  createEffect,
  createEvent,
  sample,
  combine,
} from "effector";
import { getSettings, updateSettings } from "@/shared/api/settings";
import type { Settings } from "@/shared/types/settings";

// Effects
export const loadSettingsFx = createEffect<void, Settings, Error>(async () => {
  return await getSettings();
});

export const saveSettingsFx = createEffect<Settings, Settings, Error>(
  async (settings) => {
    return await updateSettings(settings);
  }
);

// Stores
export const $settings = createStore<Settings | null>(null);
export const $error = createStore<string | null>(null);

// Объединение pending состояний обоих effects
export const $isLoading = combine(
  loadSettingsFx.pending,
  saveSettingsFx.pending,
  (loadPending, savePending) => loadPending || savePending
);

// Events
const setSettings = createEvent<Settings>();
const setError = createEvent<string | null>();

// Обновление stores через события
$settings.on(setSettings, (_, settings) => settings);
$error.on(setError, (_, error) => error);

// Связывание effects с событиями
sample({
  clock: loadSettingsFx.doneData,
  target: setSettings,
});

sample({
  clock: [loadSettingsFx.doneData, saveSettingsFx.doneData],
  fn: () => null,
  target: setError,
});

sample({
  clock: [loadSettingsFx.failData, saveSettingsFx.failData],
  fn: (error: Error) => error.message,
  target: setError,
});

loadSettingsFx.finally.watch(console.log);

// Перезагрузка настроек после успешного сохранения
sample({
  clock: saveSettingsFx.doneData,
  target: loadSettingsFx,
});
