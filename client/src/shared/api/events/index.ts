import type { CardsResyncedEvent } from "@/shared/types/events";

export type EventsClient = {
  close: () => void;
};

export function createEventsClient(handlers: {
  onResynced: (evt: CardsResyncedEvent) => void;
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

  es.addEventListener("hello", onHello as any);
  es.addEventListener("cards:resynced", onResynced as any);

  es.onerror = (err) => {
    handlers.onError?.(err);
  };

  return {
    close: () => {
      try {
        es.removeEventListener("hello", onHello as any);
        es.removeEventListener("cards:resynced", onResynced as any);
        es.close();
      } catch {
        // ignore
      }
    },
  };
}


