import type Database from "better-sqlite3";
import { AppError } from "../errors/app-error";
import { logger } from "../utils/logger";
import type { SseHub } from "./sse-hub";
import { createDatabaseService } from "./database";
import { createTagService, type Tag as DbTag } from "./tags";
import { getSettings } from "./settings";
import { getOrCreateLibraryId } from "./libraries";
import { listSillyTavernProfileCharactersDirs } from "./sillytavern";

export type TagsBulkEditAction = "replace" | "delete";

export type TagsBulkEditTarget =
  | { kind: "existing"; rawName: string }
  | { kind: "new"; name: string };

export type TagsBulkEditStartedEvent = {
  run_id: string;
  action: TagsBulkEditAction;
  from: string[]; // rawName
  to?: { id: string; name: string; rawName: string } | null;
  startedAt: number;
};

export type TagsBulkEditDoneEvent = {
  run_id: string;
  action: TagsBulkEditAction;
  from: string[];
  to?: { id: string; name: string; rawName: string } | null;
  affected_cards: number;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
};

export type TagsBulkEditFailedEvent = {
  run_id: string;
  action: TagsBulkEditAction;
  from: string[];
  to?: { id: string; name: string; rawName: string } | null;
  error: string;
};

function sleepImmediate(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function normalizeRawName(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeDisplayName(value: unknown): string {
  return String(value ?? "").trim();
}

function parseStringArrayJson(value: string | null): string[] {
  if (!value) return [];
  try {
    const arr = JSON.parse(value) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.map((x) => String(x));
  } catch {
    return [];
  }
}

function uniqueByLower(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const name = normalizeDisplayName(t);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

function patchCardDataJsonTags(dataJson: string, nextTags: string[]): string {
  try {
    const obj = JSON.parse(dataJson) as any;
    if (!obj || typeof obj !== "object") return dataJson;

    // V2/V3
    if (obj.data && typeof obj.data === "object") {
      (obj.data as any).tags = nextTags;
      return JSON.stringify(obj);
    }

    // V1
    (obj as any).tags = nextTags;
    return JSON.stringify(obj);
  } catch {
    return dataJson;
  }
}

function uniqueStrings(items: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of items) {
    const v = String(s ?? "").trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

async function resolveTargetLibraryIds(
  db: Database.Database,
  opts: {
    applyToLibrary: boolean;
    applyToSt: boolean;
    stProfileHandles?: string[] | undefined;
  }
): Promise<string[]> {
  if (!opts.applyToLibrary && !opts.applyToSt) {
    throw new AppError({ status: 400, code: "api.tags.bulk_edit.no_targets_selected" });
  }

  const settings = await getSettings();
  const libraryIds: string[] = [];

  if (opts.applyToLibrary) {
    const folderPath = settings.cardsFolderPath;
    if (!folderPath) {
      throw new AppError({
        status: 400,
        code: "api.tags.bulk_edit.cardsFolderPath_not_set",
      });
    }
    libraryIds.push(getOrCreateLibraryId(db, folderPath));
  }

  if (opts.applyToSt) {
    const stRoot = settings.sillytavenrPath;
    if (!stRoot) {
      throw new AppError({
        status: 400,
        code: "api.tags.bulk_edit.sillytavenrPath_not_set",
      });
    }

    const dirs = await listSillyTavernProfileCharactersDirs(stRoot);
    const selectedHandles = uniqueStrings(opts.stProfileHandles ?? []);
    const selectedDirs =
      selectedHandles.length > 0
        ? dirs.filter((d) => selectedHandles.includes(d.profileHandle))
        : dirs;

    if (selectedHandles.length > 0 && selectedDirs.length === 0) {
      throw new AppError({
        status: 400,
        code: "api.tags.bulk_edit.st_profiles_not_found",
        params: { handles: selectedHandles.join(", ") },
      });
    }

    // If we cannot resolve per-profile dirs (no profiles), fall back to old root-library.
    if (selectedDirs.length === 0) {
      libraryIds.push(getOrCreateLibraryId(db, stRoot));
    } else {
      const perProfileLibraryIds = selectedDirs.map((d) =>
        getOrCreateLibraryId(db, d.charactersDir)
      );

      // Backward-compat fallback:
      // Older DBs stored ST cards under library_id = getOrCreateLibraryId(db, stRoot).
      // If per-profile libraries are not populated yet (scan not run / still running),
      // fall back to the old root-library so ST cards are still affected.
      const usePerProfile = (() => {
        if (perProfileLibraryIds.length === 0) return false;
        const placeholders = perProfileLibraryIds.map(() => "?").join(", ");
        const row = db
          .prepare(
            `
            SELECT COUNT(*) as cnt
            FROM cards
            WHERE is_sillytavern = 1
              AND library_id IN (${placeholders})
          `
          )
          .get(...perProfileLibraryIds) as { cnt: number } | undefined;
        return (row?.cnt ?? 0) > 0;
      })();

      if (usePerProfile) {
        libraryIds.push(...perProfileLibraryIds);
      } else {
        libraryIds.push(getOrCreateLibraryId(db, stRoot));
      }
    }
  }

  return uniqueStrings(libraryIds);
}

function normalizeStProfileHandles(input: string[] | undefined): string[] {
  return uniqueStrings(Array.isArray(input) ? input : []);
}

function normalizeFromRawNames(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of input) {
    const raw = normalizeRawName(v);
    if (!raw) continue;
    if (seen.has(raw)) continue;
    seen.add(raw);
    out.push(raw);
  }
  return out;
}

function toPublicTag(tag: DbTag): { id: string; name: string; rawName: string } {
  return { id: tag.id, name: tag.name, rawName: tag.rawName };
}

function ensureTargetTag(
  db: Database.Database,
  action: TagsBulkEditAction,
  target: TagsBulkEditTarget | undefined
): DbTag | null {
  if (action === "delete") return null;

  if (!target || typeof target !== "object") {
    throw new AppError({ status: 400, code: "api.tags.bulk_edit.target_required" });
  }

  const tagService = createTagService(db);

  if (target.kind === "existing") {
    const rawName = normalizeRawName(target.rawName);
    if (!rawName) {
      throw new AppError({
        status: 400,
        code: "api.tags.bulk_edit.target_invalid",
      });
    }
    const existing = tagService.getTagByRawName(rawName);
    if (!existing) {
      throw new AppError({
        status: 404,
        code: "api.tags.bulk_edit.target_not_found",
        params: { rawName },
      });
    }
    return existing;
  }

  if (target.kind === "new") {
    const name = normalizeDisplayName(target.name);
    if (!name) {
      throw new AppError({
        status: 400,
        code: "api.tags.bulk_edit.target_invalid",
      });
    }

    const rawName = normalizeRawName(name);
    const existing = tagService.getTagByRawName(rawName);
    if (existing) return existing;

    try {
      return tagService.createTag(name);
    } catch (e: any) {
      // If created concurrently / already exists, try to reuse existingTag from AppError.extra.
      if (
        e &&
        typeof e === "object" &&
        "code" in e &&
        (e as any).code === "api.tags.already_exists"
      ) {
        const extra = (e as any).extra as any;
        const fromExtra = extra?.existingTag as DbTag | undefined;
        if (fromExtra?.rawName) return fromExtra;
        const fallbackExisting = tagService.getTagByRawName(rawName);
        if (fallbackExisting) return fallbackExisting;
      }
      throw e;
    }
  }

  throw new AppError({ status: 400, code: "api.tags.bulk_edit.target_invalid" });
}

export async function startTagsBulkEditRun(opts: {
  db: Database.Database;
  hub: SseHub;
  runId: string;
  action: TagsBulkEditAction;
  from: unknown;
  to?: TagsBulkEditTarget;
  applyToLibrary: boolean;
  applyToSt: boolean;
  stProfileHandles?: string[] | undefined;
}): Promise<{ job: Promise<void> }> {
  const fromRawNames = normalizeFromRawNames(opts.from);
  if (fromRawNames.length === 0) {
    throw new AppError({ status: 400, code: "api.tags.bulk_edit.no_tags_selected" });
  }

  const toTag = ensureTargetTag(opts.db, opts.action, opts.to);
  const toRawName = toTag?.rawName ?? null;

  const job = (async () => {
    const startedAt = Date.now();
    const toPublic = toTag ? toPublicTag(toTag) : null;
    try {
      const libraryIds = await resolveTargetLibraryIds(opts.db, {
        applyToLibrary: Boolean(opts.applyToLibrary),
        applyToSt: Boolean(opts.applyToSt),
        stProfileHandles: opts.stProfileHandles,
      });
      const stProfileHandles = normalizeStProfileHandles(opts.stProfileHandles);

      opts.hub.broadcast(
        "tags:bulk_edit_started",
        {
          run_id: opts.runId,
          action: opts.action,
          from: fromRawNames,
          to: toPublic,
          startedAt,
        } satisfies TagsBulkEditStartedEvent,
        { id: `${opts.runId}:bulk_edit_started` }
      );

      // Find affected cards in selected libraries.
      const fromPlaceholders = fromRawNames.map(() => "?").join(", ");
      const libPlaceholders = libraryIds.map(() => "?").join(", ");
      const affectedRows = opts.db
        .prepare(
          `
          SELECT DISTINCT ct.card_id as id
          FROM card_tags ct
          JOIN cards c ON c.id = ct.card_id
          WHERE c.library_id IN (${libPlaceholders})
            AND ct.tag_rawName IN (${fromPlaceholders})
        `
        )
        .all(...libraryIds, ...fromRawNames) as Array<{ id: string }>;

      const affectedCardIds = affectedRows
        .map((r) => r.id)
        .filter((id) => typeof id === "string" && id.length > 0);

      const dbService = createDatabaseService(opts.db);
      const selectCard = opts.db.prepare(
        `SELECT id, tags, data_json FROM cards WHERE id = ? LIMIT 1`
      );
      const updateCard = opts.db.prepare(
        `UPDATE cards SET tags = ?, data_json = ? WHERE id = ?`
      );

      const fromSet = new Set(fromRawNames);
      const toName = toTag ? toTag.name : null;

      // Update cards.tags + cards.data_json in batches to keep UI responsive and allow SSE flushing.
      for (let i = 0; i < affectedCardIds.length; i += 100) {
        const batch = affectedCardIds.slice(i, i + 100);
        dbService.transaction(() => {
          for (const cardId of batch) {
            const row = selectCard.get(cardId) as
              | { id: string; tags: string | null; data_json: string }
              | undefined;
            if (!row) continue;

            const existing = parseStringArrayJson(row.tags);
            const kept = existing.filter((t) => !fromSet.has(normalizeRawName(t)));
            const next = uniqueByLower(
              toName ? [...kept, toName] : [...kept]
            );

            const nextTagsJson = next.length > 0 ? JSON.stringify(next) : null;
            const nextDataJson = patchCardDataJsonTags(row.data_json, next);
            updateCard.run(nextTagsJson, nextDataJson, row.id);
          }
        });

        // Give the event loop a chance to flush SSE writes.
        await sleepImmediate();
      }

      // Update card_tags links.
      dbService.transaction(() => {
        // Delete old links inside selected libraries.
        opts.db
          .prepare(
            `
            DELETE FROM card_tags
            WHERE tag_rawName IN (${fromPlaceholders})
              AND card_id IN (SELECT id FROM cards WHERE library_id IN (${libPlaceholders}))
          `
          )
          .run(...fromRawNames, ...libraryIds);

        if (opts.action === "replace" && toRawName) {
          const insert = opts.db.prepare(
            `INSERT OR IGNORE INTO card_tags (card_id, tag_rawName) VALUES (?, ?)`
          );
          for (const cardId of affectedCardIds) {
            insert.run(cardId, toRawName);
          }
        }
      });

      // Cleanup tags table: remove fromRawNames if no longer used anywhere
      // (avoid deleting target tag if it was part of 'from').
      const cleanupCandidates = fromRawNames.filter((r) => r !== toRawName);
      if (cleanupCandidates.length > 0) {
        const del = opts.db.prepare(
          `
          DELETE FROM tags
          WHERE rawName = ?
            AND NOT EXISTS (SELECT 1 FROM card_tags WHERE tag_rawName = ?)
        `
        );
        for (const rawName of cleanupCandidates) {
          del.run(rawName, rawName);
        }
      }

      // Notify SillyTavern extension to refresh tags (best-effort).
      // We do NOT rewrite PNG files here; instead, we send the resulting tag list
      // so the extension can apply tag assignments in SillyTavern.
      if (opts.applyToSt) {
        try {
          for (let i = 0; i < affectedCardIds.length; i += 200) {
            const batch = affectedCardIds.slice(i, i + 200);
            const placeholders = batch.map(() => "?").join(", ");
            const rows = opts.db
              .prepare(
                `
                SELECT
                  c.id as card_id,
                  c.tags as tags_json,
                  cf.st_profile_handle as st_profile_handle,
                  cf.st_avatar_file as st_avatar_file,
                  cf.st_avatar_base as st_avatar_base
                FROM cards c
                JOIN card_files cf ON cf.card_id = c.id
                WHERE c.is_sillytavern = 1
                  AND c.id IN (${placeholders})
                  AND cf.st_profile_handle IS NOT NULL
                  AND cf.st_avatar_file IS NOT NULL
              `
              )
              .all(...batch) as Array<{
              card_id: string;
              tags_json: string | null;
              st_profile_handle: string | null;
              st_avatar_file: string | null;
              st_avatar_base: string | null;
            }>;

            for (const r of rows) {
              const stProfileHandle = String(r.st_profile_handle ?? "").trim();
              const stAvatarFile = String(r.st_avatar_file ?? "").trim();
              const stAvatarBase = String(r.st_avatar_base ?? "").trim();
              if (!stProfileHandle || !stAvatarFile) continue;
              if (stProfileHandles.length > 0 && !stProfileHandles.includes(stProfileHandle)) {
                continue;
              }

              const tags = parseStringArrayJson(r.tags_json);
              const payload = {
                type: "st:cards_changed" as const,
                ts: Date.now(),
                cardId: r.card_id,
                mode: "tags_bulk_edit",
                stProfileHandle,
                stAvatarFile,
                ...(stAvatarBase ? { stAvatarBase } : {}),
                tags,
              };
              opts.hub.broadcast("st:cards_changed", payload, {
                id: `${opts.runId}:st:cards_changed:${r.card_id}:${stProfileHandle}:${stAvatarFile}`,
              });
            }

            await sleepImmediate();
          }
        } catch (e) {
          // Best-effort; do not fail bulk edit if ST notification fails.
          logger.warnKey("warn.tags.bulk_edit_st_notify_failed", { runId: opts.runId }, e);
        }
      }

      const finishedAt = Date.now();
      opts.hub.broadcast(
        "tags:bulk_edit_done",
        {
          run_id: opts.runId,
          action: opts.action,
          from: fromRawNames,
          to: toPublic,
          affected_cards: affectedCardIds.length,
          startedAt,
          finishedAt,
          durationMs: finishedAt - startedAt,
        } satisfies TagsBulkEditDoneEvent,
        { id: `${opts.runId}:bulk_edit_done` }
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e ?? "Unknown error");
      logger.errorKey(e, "error.tags.bulk_edit_failed", {
        runId: opts.runId,
        action: opts.action,
      });
      opts.hub.broadcast(
        "tags:bulk_edit_failed",
        {
          run_id: opts.runId,
          action: opts.action,
          from: fromRawNames,
          to: toPublic,
          error: message,
        } satisfies TagsBulkEditFailedEvent,
        { id: `${opts.runId}:bulk_edit_failed` }
      );
      throw e;
    }
  })();

  return { job };
}


