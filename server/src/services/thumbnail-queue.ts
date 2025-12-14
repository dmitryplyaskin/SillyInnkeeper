import Database from "better-sqlite3";
import pLimit from "p-limit";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createDatabaseService } from "./database";
import { generateThumbnail } from "./thumbnail";
import { logger } from "../utils/logger";

type EnsureResult =
  | { ok: true; absPath: string; generated: boolean }
  | { ok: false; reason: "not_found" | "file_missing" | "generate_failed" };

const THUMBNAILS_DIR_ABS = join(process.cwd(), "data", "cache", "thumbnails");

function getThumbnailAbsPath(cardId: string): string {
  return join(THUMBNAILS_DIR_ABS, `${cardId}.webp`);
}

function getThumbConcurrency(): number {
  const raw = process.env.THUMB_CONCURRENCY;
  const n = raw != null ? Number(raw) : 3;
  if (!Number.isFinite(n)) return 3;
  return Math.max(1, Math.floor(n));
}

export class ThumbnailQueue {
  private limit = pLimit(getThumbConcurrency());
  private inFlight = new Map<string, Promise<EnsureResult>>();
  private genCount = 0;
  private genTotalMs = 0;

  constructor(private db: Database.Database) {}

  getInFlightCount(): number {
    return this.inFlight.size;
  }

  async ensureThumbnail(cardId: string): Promise<EnsureResult> {
    const absPath = getThumbnailAbsPath(cardId);
    if (existsSync(absPath)) {
      return { ok: true, absPath, generated: false };
    }

    const existing = this.inFlight.get(cardId);
    if (existing) return existing;

    const task: Promise<EnsureResult> = this.limit(
      async (): Promise<EnsureResult> => {
        // double-check after queue delay
        if (existsSync(absPath)) return { ok: true, absPath, generated: false };

        const dbService = createDatabaseService(this.db);
        const fileRow = dbService.queryOne<{ file_path: string | null }>(
          `
        SELECT COALESCE(
          c.primary_file_path,
          (
            SELECT cf.file_path
            FROM card_files cf
            WHERE cf.card_id = c.id
            ORDER BY cf.file_birthtime ASC, cf.file_path ASC
            LIMIT 1
          )
        ) as file_path
        FROM cards c
        WHERE c.id = ?
        LIMIT 1
      `,
          [cardId]
        );

        if (!fileRow?.file_path) {
          return { ok: false, reason: "not_found" as const };
        }
        if (!existsSync(fileRow.file_path)) {
          return { ok: false, reason: "file_missing" as const };
        }

        const genStartedAt = Date.now();
        const rel = await generateThumbnail(fileRow.file_path, cardId);
        const genMs = Date.now() - genStartedAt;
        this.genCount += 1;
        this.genTotalMs += genMs;
        if (!rel) {
          return { ok: false, reason: "generate_failed" as const };
        }

        // best-effort: mark avatar_path so search results can use it if desired
        try {
          dbService.execute("UPDATE cards SET avatar_path = ? WHERE id = ?", [
            rel,
            cardId,
          ]);
        } catch (e) {
          // ignore
        }

        // generateThumbnail writes to absPath; ensure it exists
        if (!existsSync(absPath)) {
          return { ok: false, reason: "generate_failed" as const };
        }

        return { ok: true, absPath, generated: true };
      }
    );

    this.inFlight.set(cardId, task);
    try {
      return await task;
    } finally {
      this.inFlight.delete(cardId);
    }
  }

  generateMissingForLibrary(libraryId: string): void {
    const startedAt = Date.now();
    const dbService = createDatabaseService(this.db);
    const ids = dbService.query<{ id: string }>(
      `SELECT id FROM cards WHERE library_id = ? AND (avatar_path IS NULL OR avatar_path = '')`,
      [libraryId]
    );

    if (ids.length === 0) return;

    let done = 0;
    let generated = 0;
    let failed = 0;
    let lastLogAt = 0;

    logger.info(
      `[thumb queue] start background generation library=${libraryId} count=${
        ids.length
      } concurrency=${getThumbConcurrency()}`
    );

    for (const row of ids) {
      void this.ensureThumbnail(row.id)
        .then((r) => {
          if (r.ok && r.generated) generated += 1;
          if (!r.ok) failed += 1;
        })
        .catch(() => {
          failed += 1;
        })
        .finally(() => {
          done += 1;
          const now = Date.now();
          if (done === ids.length || now - lastLogAt >= 1000) {
            lastLogAt = now;
            logger.info(
              `[thumb queue] progress library=${libraryId} done=${done}/${
                ids.length
              } generated=${generated} failed=${failed} inflight=${this.getInFlightCount()}`
            );
            if (done === ids.length) {
              const avgMs =
                this.genCount > 0 ? this.genTotalMs / this.genCount : 0;
              logger.info(
                `[thumb queue] finished library=${libraryId} durationMs=${
                  now - startedAt
                } generated=${generated} failed=${failed} genAvgMs=${avgMs.toFixed(
                  1
                )}`
              );
            }
          }
        });
    }
  }
}
