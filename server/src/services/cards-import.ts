import { existsSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { readdir as readdirAsync, copyFile, unlink, ensureDir } from "fs-extra";
import type Database from "better-sqlite3";
import { CardParser } from "./card-parser";
import { computeContentHash } from "./card-hash";
import { createDatabaseService } from "./database";
import type { CardsSyncOrchestrator } from "./cards-sync-orchestrator";
import type { SseHub } from "./sse-hub";
import { logger } from "../utils/logger";
import { sanitizeWindowsFilenameBase } from "../utils/filename";

export type CardsImportMode = "copy" | "move";
export type CardsImportDuplicatesMode = "skip" | "copy";

export type CardsImportFinishedPayload = {
  sourceFolderPath: string;
  targetFolderPath: string;
  importMode: CardsImportMode;
  duplicatesMode: CardsImportDuplicatesMode;
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

type PngFileEntry = {
  filePath: string;
  createdAtMs: number;
};

async function getAllPngFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdirAsync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await getAllPngFiles(fullPath);
      files.push(...sub);
      continue;
    }
    if (entry.isFile() && extname(entry.name).toLowerCase() === ".png") {
      files.push(fullPath);
    }
  }

  return files;
}

function getCreatedAtMs(filePath: string): number {
  const st = statSync(filePath);
  const birth = st.birthtimeMs;
  const mtime = st.mtimeMs;
  return Number.isFinite(birth) && birth > 0 ? birth : mtime;
}

function pickUniquePngPath(folder: string, baseName: string): string {
  const base = sanitizeWindowsFilenameBase(baseName, "imported-card");
  let candidate = join(folder, `${base}.png`);
  if (!existsSync(candidate)) return candidate;
  for (let i = 1; i < 1000; i += 1) {
    candidate = join(folder, `${base} (${i}).png`);
    if (!existsSync(candidate)) return candidate;
  }
  return join(folder, `${base} (${Date.now()}).png`);
}

export class CardsImportService {
  private parser = new CardParser();

  constructor(
    private db: Database.Database,
    private hub: SseHub,
    private orchestrator: CardsSyncOrchestrator
  ) {}

  async runImport(opts: {
    sourceFolderPath: string;
    targetFolderPath: string;
    libraryId: string;
    importMode: CardsImportMode;
    duplicatesMode: CardsImportDuplicatesMode;
  }): Promise<CardsImportFinishedPayload> {
    const startedAt = Date.now();
    const dbService = createDatabaseService(this.db);

    const files = await getAllPngFiles(opts.sourceFolderPath);
    const entries: PngFileEntry[] = [];
    for (const p of files) {
      try {
        entries.push({ filePath: p, createdAtMs: getCreatedAtMs(p) });
      } catch {
        // If file disappears during listing, ignore.
      }
    }

    entries.sort((a, b) => {
      if (a.createdAtMs !== b.createdAtMs) return a.createdAtMs - b.createdAtMs;
      return a.filePath.localeCompare(b.filePath);
    });

    const knownDuplicateHashes = new Set<string>();
    let processedFiles = 0;
    let importedFiles = 0;
    let skippedParseErrors = 0;
    let skippedDuplicates = 0;
    let copyFailed = 0;
    let deletedOriginals = 0;
    let deleteFailed = 0;

    await ensureDir(opts.targetFolderPath);

    for (const entry of entries) {
      processedFiles += 1;

      const extracted = this.parser.parse(entry.filePath);
      if (!extracted) {
        skippedParseErrors += 1;
        continue;
      }

      const contentHash = computeContentHash(extracted.original_data);

      if (opts.duplicatesMode === "skip") {
        if (knownDuplicateHashes.has(contentHash)) {
          skippedDuplicates += 1;
          continue;
        }

        const exists = dbService.queryOne<{ one: number }>(
          `SELECT 1 as one FROM cards WHERE library_id = ? AND content_hash = ? LIMIT 1`,
          [opts.libraryId, contentHash]
        );
        if (exists) {
          knownDuplicateHashes.add(contentHash);
          skippedDuplicates += 1;
          continue;
        }
      }

      const nameCandidate =
        typeof extracted.name === "string" && extracted.name.trim().length > 0
          ? extracted.name.trim()
          : entry.filePath.split(/[\\/]+/).pop()?.replace(/\.png$/i, "") ??
            "imported-card";

      const targetPath = pickUniquePngPath(opts.targetFolderPath, nameCandidate);

      try {
        await copyFile(entry.filePath, targetPath);
        importedFiles += 1;
      } catch (error) {
        copyFailed += 1;
        logger.errorKey(error, "error.cardsImport.copyFailed", {
          source: entry.filePath,
          target: targetPath,
        });
        continue;
      }

      if (opts.importMode === "move") {
        try {
          await unlink(entry.filePath);
          deletedOriginals += 1;
        } catch (error) {
          deleteFailed += 1;
          logger.errorKey(error, "error.cardsImport.deleteSourceFailed", {
            source: entry.filePath,
          });
        }
      }

      if (opts.duplicatesMode === "skip") {
        knownDuplicateHashes.add(contentHash);
      }
    }

    // Trigger a single scan after import. We intentionally do not call syncSingleFile per file.
    try {
      this.orchestrator.requestScan("app", opts.targetFolderPath, opts.libraryId);
    } catch (error) {
      logger.errorKey(error, "error.cardsImport.requestScanFailed");
    }

    const finishedAt = Date.now();
    const payload: CardsImportFinishedPayload = {
      sourceFolderPath: opts.sourceFolderPath,
      targetFolderPath: opts.targetFolderPath,
      importMode: opts.importMode,
      duplicatesMode: opts.duplicatesMode,
      totalFiles: entries.length,
      processedFiles,
      importedFiles,
      skippedParseErrors,
      skippedDuplicates,
      copyFailed,
      deletedOriginals,
      deleteFailed,
      startedAt,
      finishedAt,
      durationMs: finishedAt - startedAt,
    };

    this.hub.broadcast("cards:import_finished", payload, {
      id: `${startedAt}:import_finished`,
    });

    return payload;
  }
}


