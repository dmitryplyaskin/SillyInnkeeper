export type SyncOrigin = "fs" | "app";

export type CardsResyncedEvent = {
  revision: number;
  origin: SyncOrigin;
  addedCards: number;
  removedCards: number;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
};


