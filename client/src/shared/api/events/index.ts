import type {
  CardsResyncedEvent,
  CardsScanFinishedEvent,
  CardsScanProgressEvent,
  CardsScanStartedEvent,
  CardsImportFinishedEvent,
  StImportResultEvent,
  PatternsProgressEvent,
  PatternsRunDoneEvent,
  PatternsRunFailedEvent,
  PatternsRunStartedEvent,
  TagsBulkEditDoneEvent,
  TagsBulkEditFailedEvent,
  TagsBulkEditStartedEvent,
} from "@/shared/types/events";

export type EventsClient = {
  close: () => void;
};

export function createEventsClient(handlers: {
  onResynced: (evt: CardsResyncedEvent) => void;
  onScanStarted?: (evt: CardsScanStartedEvent) => void;
  onScanProgress?: (evt: CardsScanProgressEvent) => void;
  onScanFinished?: (evt: CardsScanFinishedEvent) => void;
  onImportFinished?: (evt: CardsImportFinishedEvent) => void;
  onStImportResult?: (evt: StImportResultEvent) => void;
  onPatternsRunStarted?: (evt: PatternsRunStartedEvent) => void;
  onPatternsProgress?: (evt: PatternsProgressEvent) => void;
  onPatternsRunDone?: (evt: PatternsRunDoneEvent) => void;
  onPatternsRunFailed?: (evt: PatternsRunFailedEvent) => void;
  onTagsBulkEditStarted?: (evt: TagsBulkEditStartedEvent) => void;
  onTagsBulkEditDone?: (evt: TagsBulkEditDoneEvent) => void;
  onTagsBulkEditFailed?: (evt: TagsBulkEditFailedEvent) => void;
  onHello?: (data: unknown) => void;
  onError?: (error: unknown) => void;
}): EventsClient {
  const es = new EventSource("/api/events");

  const onHello = (e: MessageEvent) => {
    try {
      const data = JSON.parse(String(e.data)) as unknown;
      handlers.onHello?.(data);
    } catch (err) {
      handlers.onError?.(err);
    }
  };

  const onResynced = (e: MessageEvent) => {
    try {
      const data = JSON.parse(String(e.data)) as CardsResyncedEvent;
      handlers.onResynced(data);
    } catch (err) {
      handlers.onError?.(err);
    }
  };

  const onScanStarted = (e: MessageEvent) => {
    try {
      const data = JSON.parse(String(e.data)) as CardsScanStartedEvent;
      handlers.onScanStarted?.(data);
    } catch (err) {
      handlers.onError?.(err);
    }
  };

  const onScanProgress = (e: MessageEvent) => {
    try {
      const data = JSON.parse(String(e.data)) as CardsScanProgressEvent;
      handlers.onScanProgress?.(data);
    } catch (err) {
      handlers.onError?.(err);
    }
  };

  const onScanFinished = (e: MessageEvent) => {
    try {
      const data = JSON.parse(String(e.data)) as CardsScanFinishedEvent;
      handlers.onScanFinished?.(data);
    } catch (err) {
      handlers.onError?.(err);
    }
  };

  const onStImportResult = (e: MessageEvent) => {
    try {
      const data = JSON.parse(String(e.data)) as StImportResultEvent;
      handlers.onStImportResult?.(data);
    } catch (err) {
      handlers.onError?.(err);
    }
  };

  const onImportFinished = (e: MessageEvent) => {
    try {
      const data = JSON.parse(String(e.data)) as CardsImportFinishedEvent;
      handlers.onImportFinished?.(data);
    } catch (err) {
      handlers.onError?.(err);
    }
  };

  const onPatternsRunStarted = (e: MessageEvent) => {
    try {
      const data = JSON.parse(String(e.data)) as PatternsRunStartedEvent;
      handlers.onPatternsRunStarted?.(data);
    } catch (err) {
      handlers.onError?.(err);
    }
  };

  const onPatternsProgress = (e: MessageEvent) => {
    try {
      const data = JSON.parse(String(e.data)) as PatternsProgressEvent;
      handlers.onPatternsProgress?.(data);
    } catch (err) {
      handlers.onError?.(err);
    }
  };

  const onPatternsRunDone = (e: MessageEvent) => {
    try {
      const data = JSON.parse(String(e.data)) as PatternsRunDoneEvent;
      handlers.onPatternsRunDone?.(data);
    } catch (err) {
      handlers.onError?.(err);
    }
  };

  const onPatternsRunFailed = (e: MessageEvent) => {
    try {
      const data = JSON.parse(String(e.data)) as PatternsRunFailedEvent;
      handlers.onPatternsRunFailed?.(data);
    } catch (err) {
      handlers.onError?.(err);
    }
  };

  const onTagsBulkEditStarted = (e: MessageEvent) => {
    try {
      const data = JSON.parse(String(e.data)) as TagsBulkEditStartedEvent;
      handlers.onTagsBulkEditStarted?.(data);
    } catch (err) {
      handlers.onError?.(err);
    }
  };

  const onTagsBulkEditDone = (e: MessageEvent) => {
    try {
      const data = JSON.parse(String(e.data)) as TagsBulkEditDoneEvent;
      handlers.onTagsBulkEditDone?.(data);
    } catch (err) {
      handlers.onError?.(err);
    }
  };

  const onTagsBulkEditFailed = (e: MessageEvent) => {
    try {
      const data = JSON.parse(String(e.data)) as TagsBulkEditFailedEvent;
      handlers.onTagsBulkEditFailed?.(data);
    } catch (err) {
      handlers.onError?.(err);
    }
  };

  es.addEventListener("hello", onHello as any);
  es.addEventListener("cards:resynced", onResynced as any);
  es.addEventListener("cards:scan_started", onScanStarted as any);
  es.addEventListener("cards:scan_progress", onScanProgress as any);
  es.addEventListener("cards:scan_finished", onScanFinished as any);
  es.addEventListener("cards:import_finished", onImportFinished as any);
  es.addEventListener("st:import_result", onStImportResult as any);
  es.addEventListener("patterns:run_started", onPatternsRunStarted as any);
  es.addEventListener("patterns:progress", onPatternsProgress as any);
  es.addEventListener("patterns:run_done", onPatternsRunDone as any);
  es.addEventListener("patterns:run_failed", onPatternsRunFailed as any);
  es.addEventListener("tags:bulk_edit_started", onTagsBulkEditStarted as any);
  es.addEventListener("tags:bulk_edit_done", onTagsBulkEditDone as any);
  es.addEventListener("tags:bulk_edit_failed", onTagsBulkEditFailed as any);

  es.onerror = (err) => {
    handlers.onError?.(err);
  };

  return {
    close: () => {
      try {
        es.removeEventListener("hello", onHello as any);
        es.removeEventListener("cards:resynced", onResynced as any);
        es.removeEventListener("cards:scan_started", onScanStarted as any);
        es.removeEventListener("cards:scan_progress", onScanProgress as any);
        es.removeEventListener("cards:scan_finished", onScanFinished as any);
        es.removeEventListener("cards:import_finished", onImportFinished as any);
        es.removeEventListener("st:import_result", onStImportResult as any);
        es.removeEventListener("patterns:run_started", onPatternsRunStarted as any);
        es.removeEventListener("patterns:progress", onPatternsProgress as any);
        es.removeEventListener("patterns:run_done", onPatternsRunDone as any);
        es.removeEventListener("patterns:run_failed", onPatternsRunFailed as any);
        es.removeEventListener("tags:bulk_edit_started", onTagsBulkEditStarted as any);
        es.removeEventListener("tags:bulk_edit_done", onTagsBulkEditDone as any);
        es.removeEventListener("tags:bulk_edit_failed", onTagsBulkEditFailed as any);
        es.close();
      } catch {
        // ignore
      }
    },
  };
}
