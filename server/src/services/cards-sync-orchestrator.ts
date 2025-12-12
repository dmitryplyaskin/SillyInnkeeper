import Database from "better-sqlite3";
import { logger } from "../utils/logger";
import { createScanService } from "./scan";
import { createDatabaseService } from "./database";
import type { SseHub } from "./sse-hub";

export type SyncOrigin = "fs" | "app";

export type CardsResyncedPayload = {
  revision: number;
  origin: SyncOrigin;
  addedCards: number;
  removedCards: number;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
};

export class CardsSyncOrchestrator {
  private running = false;
  private requestedAgain = false;
  private revision = 0;
  private lastFolderPath: string | null = null;

  constructor(private db: Database.Database, private hub: SseHub) {}

  requestScan(origin: SyncOrigin, folderPath: string): void {
    this.lastFolderPath = folderPath;
    if (this.running) {
      this.requestedAgain = true;
      return;
    }
    void this.runLoop(origin, folderPath);
  }

  private async runLoop(origin: SyncOrigin, folderPath: string): Promise<void> {
    this.running = true;
    try {
      let currentOrigin: SyncOrigin = origin;
      let currentPath = folderPath;

      // loop if events arrived during scan
      // eslint-disable-next-line no-constant-condition
      while (true) {
        this.requestedAgain = false;
        const startedAt = Date.now();

        const dbService = createDatabaseService(this.db);
        const beforeRow = dbService.queryOne<{ count: number }>(
          "SELECT COUNT(*) as count FROM cards"
        );
        const before = beforeRow?.count ?? 0;

        const scanService = createScanService(this.db);
        await scanService.scanFolder(currentPath);

        const afterRow = dbService.queryOne<{ count: number }>(
          "SELECT COUNT(*) as count FROM cards"
        );
        const after = afterRow?.count ?? 0;

        const addedCards = Math.max(0, after - before);
        const removedCards = Math.max(0, before - after);
        const finishedAt = Date.now();

        this.revision += 1;
        const payload: CardsResyncedPayload = {
          revision: this.revision,
          origin: currentOrigin,
          addedCards,
          removedCards,
          startedAt,
          finishedAt,
          durationMs: finishedAt - startedAt,
        };

        this.hub.broadcast("cards:resynced", payload, { id: payload.revision });

        logger.info(
          `cards:resynced rev=${payload.revision} origin=${payload.origin} +${payload.addedCards} -${payload.removedCards} (${payload.durationMs}ms)`
        );

        if (!this.requestedAgain) break;

        // run again immediately with the latest known folderPath
        currentOrigin = "fs";
        currentPath = this.lastFolderPath ?? currentPath;
      }
    } catch (error) {
      logger.error(error, "Ошибка в CardsSyncOrchestrator");
    } finally {
      this.running = false;
      this.requestedAgain = false;
    }
  }
}


