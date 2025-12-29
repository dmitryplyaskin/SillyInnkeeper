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

export type CardsImportFinishedEvent = {
  sourceFolderPath: string;
  targetFolderPath: string;
  importMode: "copy" | "move";
  duplicatesMode: "skip" | "copy";
  totalFiles: number;
  processedFiles: number;
  importedFiles: number;
  skippedParseErrors: number;
  skippedDuplicates: number;
  copyFailed: number;
  deletedOriginals: number;
  deleteFailed: number;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
};

export type StImportResultEvent = {
  type: "st:import_result";
  ts: number;
  cardId: string;
  ok: boolean;
  action?: "import" | "open";
  message?: string;
  stCharacterId?: string;
};

export type PatternsRunStartedEvent = {
  run_id: string;
  rules_hash: string;
  total_cards: number;
};

export type PatternsProgressEvent = {
  run_id: string;
  processed_cards: number;
  total_cards: number;
};

export type PatternsRunDoneEvent = {
  run_id: string;
  matched_cards: number;
};

export type PatternsRunFailedEvent = {
  run_id: string;
  error: string;
};

export type TagsBulkEditStartedEvent = {
  run_id: string;
  action: "replace" | "delete";
  from: string[];
  to?: { id: string; name: string; rawName: string } | null;
  startedAt: number;
};

export type TagsBulkEditDoneEvent = {
  run_id: string;
  action: "replace" | "delete";
  from: string[];
  to?: { id: string; name: string; rawName: string } | null;
  affected_cards: number;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
};

export type TagsBulkEditFailedEvent = {
  run_id: string;
  action: "replace" | "delete";
  from: string[];
  to?: { id: string; name: string; rawName: string } | null;
  error: string;
};