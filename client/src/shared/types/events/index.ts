export type SyncOrigin = "fs" | "app";

export type CardsResyncedEvent = {
  revision: number;
  origin: SyncOrigin;
  libraryId: string;
  folderPath: string;
  addedCards: number;
  removedCards: number;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
};

export type CardsScanStartedEvent = {
  revision: number;
  origin: SyncOrigin;
  libraryId: string;
  folderPath: string;
  totalFiles: number;
  startedAt: number;
};

export type CardsScanProgressEvent = {
  revision: number;
  origin: SyncOrigin;
  libraryId: string;
  folderPath: string;
  processedFiles: number;
  totalFiles: number;
  updatedAt: number;
};

export type CardsScanFinishedEvent = {
  revision: number;
  origin: SyncOrigin;
  libraryId: string;
  folderPath: string;
  processedFiles: number;
  totalFiles: number;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
};

export type StImportResultEvent = {
  type: "st:import_result";
  ts: number;
  cardId: string;
  ok: boolean;
  message?: string;
  stCharacterId?: string;
};
