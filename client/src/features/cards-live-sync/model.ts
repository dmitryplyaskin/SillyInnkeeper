import { createEvent, sample } from "effector";
import { createEventsClient, type EventsClient } from "@/shared/api/events";
import type {
  CardsResyncedEvent,
  CardsScanFinishedEvent,
  CardsScanProgressEvent,
  CardsScanStartedEvent,
  CardsImportFinishedEvent,
  StImportResultEvent,
} from "@/shared/types/events";
import {
  applyFilters,
  applyFiltersSilent,
  loadCardsFiltersFx,
} from "@/features/cards-filters";
import { notifications } from "@mantine/notifications";
import i18n from "@/shared/i18n/i18n";

export const startLiveSync = createEvent<void>();
export const stopLiveSync = createEvent<void>();

const cardsResynced = createEvent<CardsResyncedEvent>();
const scanStarted = createEvent<CardsScanStartedEvent>();
const scanProgress = createEvent<CardsScanProgressEvent>();
const scanFinished = createEvent<CardsScanFinishedEvent>();
const connected = createEvent<void>();
const stImportResult = createEvent<StImportResultEvent>();
const importFinished = createEvent<CardsImportFinishedEvent>();

let client: EventsClient | null = null;

const SCAN_NOTIFICATION_ID = "scan-status";
let scanPollTimer: ReturnType<typeof setInterval> | null = null;

function shortFolderLabel(folderPath: string): string {
  const parts = folderPath.split(/[\\/]+/).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : folderPath;
}

startLiveSync.watch(() => {
  if (client) return;
  client = createEventsClient({
    onHello: () => connected(),
    onResynced: (evt) => cardsResynced(evt),
    onScanStarted: (evt) => scanStarted(evt),
    onScanProgress: (evt) => scanProgress(evt),
    onScanFinished: (evt) => scanFinished(evt),
    onImportFinished: (evt) => importFinished(evt),
    onStImportResult: (evt) => stImportResult(evt),
    onError: () => {
      // браузер сам переподключается; лог/UX добавим позже при необходимости
    },
  });
});

stopLiveSync.watch(() => {
  if (scanPollTimer) {
    clearInterval(scanPollTimer);
    scanPollTimer = null;
  }
  client?.close();
  client = null;
});

// На resync: перезагружаем фильтры (опции) и карточки с текущими фильтрами
sample({
  clock: cardsResynced,
  target: loadCardsFiltersFx,
});

sample({
  clock: cardsResynced,
  target: applyFilters,
});

// При подключении: один раз синхронизируем UI (важно, если стартовый scan прошёл до подключения SSE)
sample({
  clock: connected,
  target: loadCardsFiltersFx,
});

sample({
  clock: connected,
  target: applyFilters,
});

// Прогресс сканирования (через Notifications)
scanStarted.watch((evt) => {
  const total = Math.max(0, evt.totalFiles);
  const folder = shortFolderLabel(evt.folderPath);

  // During scan: periodically refresh cards list so user sees it updating.
  if (scanPollTimer) clearInterval(scanPollTimer);
  applyFiltersSilent(); // immediate refresh without loader "jitter"
  scanPollTimer = setInterval(() => {
    applyFiltersSilent();
  }, 2000);

  notifications.show({
    id: SCAN_NOTIFICATION_ID,
    title: i18n.t("liveSync.scanTitle"),
    message: i18n.t("liveSync.start", { folder, total }),
    loading: true,
    autoClose: false,
    withCloseButton: false,
  });
});

scanProgress.watch((evt) => {
  const total = Math.max(0, evt.totalFiles);
  const done = Math.min(
    Math.max(0, evt.processedFiles),
    total || evt.processedFiles
  );
  const percent =
    total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const folder = shortFolderLabel(evt.folderPath);
  notifications.update({
    id: SCAN_NOTIFICATION_ID,
    title: i18n.t("liveSync.scanTitle"),
    message: i18n.t("liveSync.progress", { folder, done, total, percent }),
    loading: true,
    autoClose: false,
    withCloseButton: false,
  });
});

scanFinished.watch((evt) => {
  const total = Math.max(0, evt.totalFiles);
  const done = Math.max(0, evt.processedFiles);
  const seconds = (evt.durationMs / 1000).toFixed(1);
  const folder = shortFolderLabel(evt.folderPath);

  if (scanPollTimer) {
    clearInterval(scanPollTimer);
    scanPollTimer = null;
  }
  // Final refresh right after finishing scan
  applyFiltersSilent();

  notifications.update({
    id: SCAN_NOTIFICATION_ID,
    title: i18n.t("liveSync.scanDoneTitle"),
    message: i18n.t("liveSync.finished", { folder, done, total, seconds }),
    loading: false,
    autoClose: 2500,
    withCloseButton: true,
  });
});

stImportResult.watch((evt) => {
  notifications.show({
    title: evt.ok
      ? i18n.t("cardDetails.stImportOkTitle")
      : i18n.t("cardDetails.stImportFailTitle"),
    message:
      evt.message && evt.message.trim().length > 0
        ? evt.message
        : evt.ok
        ? i18n.t("cardDetails.stImportOkMessage", { cardId: evt.cardId })
        : i18n.t("cardDetails.stImportFailMessage", { cardId: evt.cardId }),
    color: evt.ok ? "green" : "red",
  });
});

importFinished.watch((evt) => {
  const seconds = (evt.durationMs / 1000).toFixed(1);
  notifications.show({
    title: i18n.t("cardsImport.importFinishedTitle"),
    message: i18n.t("cardsImport.importFinishedMessage", {
      imported: evt.importedFiles,
      skippedDuplicates: evt.skippedDuplicates,
      skippedParseErrors: evt.skippedParseErrors,
      copyFailed: evt.copyFailed,
      deletedOriginals: evt.deletedOriginals,
      deleteFailed: evt.deleteFailed,
      seconds,
    }),
    color: evt.copyFailed > 0 || evt.deleteFailed > 0 ? "yellow" : "green",
  });

  // Make sure UI refreshes soon even if scan events are delayed.
  applyFiltersSilent();
});

cardsResynced.watch((evt) => {
  if (evt.addedCards <= 0 && evt.removedCards <= 0) return;
  const parts: string[] = [];
  if (evt.addedCards > 0)
    parts.push(i18n.t("liveSync.added", { count: evt.addedCards }));
  if (evt.removedCards > 0)
    parts.push(i18n.t("liveSync.removed", { count: evt.removedCards }));
  const seconds = (evt.durationMs / 1000).toFixed(1);
  const folder = shortFolderLabel(evt.folderPath);
  notifications.show({
    title: i18n.t("liveSync.libraryUpdatedTitle"),
    message: i18n.t("liveSync.updated", {
      folder,
      parts: parts.join(", "),
      seconds,
    }),
  });
});

export const cardsResyncedEvent = cardsResynced;
