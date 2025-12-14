import Database from "better-sqlite3";
import { logger } from "../utils/logger";
import { createScanService } from "./scan";
import { createDatabaseService } from "./database";
import type { SseHub } from "./sse-hub";
import type { ThumbnailQueue } from "./thumbnail-queue";

export type SyncOrigin = "fs" | "app";

export type CardsResyncedPayload = {
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

export type CardsScanStartedPayload = {
  revision: number;
  origin: SyncOrigin;
  libraryId: string;
  folderPath: string;
  totalFiles: number;
  startedAt: number;
};

export type CardsScanProgressPayload = {
  revision: number;
  origin: SyncOrigin;
  libraryId: string;
  folderPath: string;
  processedFiles: number;
  totalFiles: number;
  updatedAt: number;
};

export type CardsScanFinishedPayload = {
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

export class CardsSyncOrchestrator {
  private running = false;
  private requestedAgain = false;
  private revision = 0;
  private lastFolderPath: string | null = null;
  private lastLibraryId: string | null = null;

  constructor(
    private db: Database.Database,
    private hub: SseHub,
    private thumbnailQueue?: ThumbnailQueue
  ) {}

  requestScan(
    origin: SyncOrigin,
    folderPath: string,
    libraryId: string = "cards"
  ): void {
    this.lastFolderPath = folderPath;
    this.lastLibraryId = libraryId;
    if (this.running) {
      this.requestedAgain = true;
      return;
    }
    void this.runLoop(origin, folderPath, libraryId);
  }

  private async runLoop(
    origin: SyncOrigin,
    folderPath: string,
    libraryId: string
  ): Promise<void> {
    this.running = true;
    try {
      let currentOrigin: SyncOrigin = origin;
      let currentPath = folderPath;
      let currentLibraryId = libraryId;

      // loop if events arrived during scan
      // eslint-disable-next-line no-constant-condition
      while (true) {
        this.requestedAgain = false;
        const startedAt = Date.now();
        const scanRevision = this.revision + 1;
        logger.infoKey("log.cardsSync.scanStart", {
          origin: currentOrigin,
          at: new Date(startedAt).toISOString(),
          path: currentPath,
        });

        const dbService = createDatabaseService(this.db);
        const beforeRow = dbService.queryOne<{ count: number }>(
          "SELECT COUNT(*) as count FROM cards WHERE library_id = ?",
          [currentLibraryId]
        );
        const before = beforeRow?.count ?? 0;

        const scanService = createScanService(this.db, currentLibraryId);
        let totalFiles = 0;
        let processedFiles = 0;
        let startedSent = false;

        const scanResult = await scanService.scanFolder(currentPath, {
          onStart: (total) => {
            totalFiles = total;
            startedSent = true;
            const payload: CardsScanStartedPayload = {
              revision: scanRevision,
              origin: currentOrigin,
              libraryId: currentLibraryId,
              folderPath: currentPath,
              totalFiles: total,
              startedAt,
            };
            this.hub.broadcast("cards:scan_started", payload, {
              id: `${scanRevision}:scan_started`,
            });
          },
          onProgress: (processed, total) => {
            processedFiles = processed;
            totalFiles = total;
            const payload: CardsScanProgressPayload = {
              revision: scanRevision,
              origin: currentOrigin,
              libraryId: currentLibraryId,
              folderPath: currentPath,
              processedFiles: processed,
              totalFiles: total,
              updatedAt: Date.now(),
            };
            this.hub.broadcast("cards:scan_progress", payload, {
              id: `${scanRevision}:scan_progress:${processed}`,
            });
          },
        });

        // If folder had no PNG files, onStart might never fire (edge cases). Ensure we emit started at least once.
        if (!startedSent) {
          totalFiles = scanResult.totalFiles;
          const payload: CardsScanStartedPayload = {
            revision: scanRevision,
            origin: currentOrigin,
            libraryId: currentLibraryId,
            folderPath: currentPath,
            totalFiles,
            startedAt,
          };
          this.hub.broadcast("cards:scan_started", payload, {
            id: `${scanRevision}:scan_started`,
          });
        }

        const afterRow = dbService.queryOne<{ count: number }>(
          "SELECT COUNT(*) as count FROM cards WHERE library_id = ?",
          [currentLibraryId]
        );
        const after = afterRow?.count ?? 0;

        const addedCards = Math.max(0, after - before);
        const removedCards = Math.max(0, before - after);
        const finishedAt = Date.now();

        // scan finished event (includes total/progress)
        {
          const payload: CardsScanFinishedPayload = {
            revision: scanRevision,
            origin: currentOrigin,
            libraryId: currentLibraryId,
            folderPath: currentPath,
            processedFiles: scanResult.processedFiles ?? processedFiles,
            totalFiles: scanResult.totalFiles ?? totalFiles,
            startedAt,
            finishedAt,
            durationMs: finishedAt - startedAt,
          };
          this.hub.broadcast("cards:scan_finished", payload, {
            id: `${scanRevision}:scan_finished`,
          });
        }

        logger.infoKey("log.cardsSync.scanDone", {
          origin: currentOrigin,
          at: new Date(finishedAt).toISOString(),
          durationMs: finishedAt - startedAt,
          path: currentPath,
        });

        this.revision = scanRevision;
        const payload: CardsResyncedPayload = {
          revision: scanRevision,
          origin: currentOrigin,
          libraryId: currentLibraryId,
          folderPath: currentPath,
          addedCards,
          removedCards,
          startedAt,
          finishedAt,
          durationMs: finishedAt - startedAt,
        };

        this.hub.broadcast("cards:resynced", payload, { id: payload.revision });

        // Background: generate missing thumbnails for this library
        try {
          this.thumbnailQueue?.generateMissingForLibrary(currentLibraryId);
        } catch (e) {
          logger.error(e, "thumbnail background generation failed");
        }

        logger.infoKey("log.cardsSync.resynced", {
          revision: payload.revision,
          origin: payload.origin,
          added: payload.addedCards,
          removed: payload.removedCards,
          durationMs: payload.durationMs,
        });

        if (!this.requestedAgain) break;

        // run again immediately with the latest known folderPath
        currentOrigin = "fs";
        currentPath = this.lastFolderPath ?? currentPath;
        currentLibraryId = this.lastLibraryId ?? currentLibraryId;
      }
    } catch (error) {
      logger.errorKey(error, "error.cardsSync.failed");
    } finally {
      this.running = false;
      this.requestedAgain = false;
    }
  }
}
