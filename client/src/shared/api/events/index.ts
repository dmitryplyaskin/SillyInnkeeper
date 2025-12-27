import type {
  CardsResyncedEvent,
  CardsScanFinishedEvent,
  CardsScanProgressEvent,
  CardsScanStartedEvent,
  CardsImportFinishedEvent,
  StImportResultEvent,
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

  es.addEventListener("hello", onHello as any);
  es.addEventListener("cards:resynced", onResynced as any);
  es.addEventListener("cards:scan_started", onScanStarted as any);
  es.addEventListener("cards:scan_progress", onScanProgress as any);
  es.addEventListener("cards:scan_finished", onScanFinished as any);
  es.addEventListener("cards:import_finished", onImportFinished as any);
  es.addEventListener("st:import_result", onStImportResult as any);

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
        es.close();
      } catch {
        // ignore
      }
    },
  };
}
