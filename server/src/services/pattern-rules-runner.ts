import type Database from "better-sqlite3";
import { createHash } from "node:crypto";
import type { SseHub } from "./sse-hub";
import { getPatternRules, type PatternRule } from "./pattern-rules";
import { canonicalizeForHash } from "./card-hash";
import { getSettings } from "./settings";
import { getOrCreateLibraryId } from "./libraries";
import { logger } from "../utils/logger";

export type PatternRunStartedEvent = {
  run_id: string;
  rules_hash: string;
  total_cards: number;
};

export type PatternRunProgressEvent = {
  run_id: string;
  processed_cards: number;
  total_cards: number;
};

export type PatternRunDoneEvent = {
  run_id: string;
  matched_cards: number;
};

export type PatternRunFailedEvent = {
  run_id: string;
  error: string;
};

function sleepImmediate(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function computeRulesHash(activeRules: PatternRule[]): string {
  const canonical = canonicalizeForHash({
    version: 1,
    rules: activeRules
      .map((r) => ({
        id: r.id,
        type: r.type,
        pattern: r.pattern,
        flags: r.flags,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  });
  const json = JSON.stringify(canonical);
  return createHash("sha256").update(json, "utf8").digest("hex");
}

function buildSearchBlob(row: Record<string, unknown>): string {
  const fields = [
    row.description,
    row.personality,
    row.scenario,
    row.first_mes,
    row.mes_example,
    row.creator_notes,
    row.system_prompt,
    row.post_history_instructions,
    row.alternate_greetings_text,
    row.group_only_greetings_text,
  ];
  const parts = fields
    .filter((v) => typeof v === "string")
    .map((v) => (v as string).trim())
    .filter((s) => s.length > 0);
  return parts.join("\n\n");
}

function safeTest(re: RegExp, text: string): boolean {
  re.lastIndex = 0;
  return re.test(text);
}

export async function startPatternRulesRun(opts: {
  db: Database.Database;
  hub: SseHub;
  runId: string;
}): Promise<{ rules_hash: string; job: Promise<void> }> {
  const file = await getPatternRules();
  const activeRules = file.rules.filter((r) => r.enabled);
  const rulesHash = computeRulesHash(activeRules);

  const rulesCompiled = activeRules.map((r) => ({
    id: r.id,
    re: new RegExp(r.pattern, r.flags),
  }));

  const settings = await getSettings();
  const folderPath = settings.cardsFolderPath;

  const job = (async () => {
    const startedAt = Date.now();
    try {
      if (!folderPath) {
        throw new Error("cardsFolderPath is not set");
      }
      const libraryId = getOrCreateLibraryId(opts.db, folderPath);

      const totalRow = opts.db
        .prepare(`SELECT COUNT(*) as cnt FROM cards WHERE library_id = ?`)
        .get(libraryId) as { cnt: number } | undefined;
      const totalCards = Math.max(0, Number(totalRow?.cnt ?? 0) || 0);

      opts.hub.broadcast(
        "patterns:run_started",
        {
          run_id: opts.runId,
          rules_hash: rulesHash,
          total_cards: totalCards,
        } satisfies PatternRunStartedEvent,
        { id: `${opts.runId}:run_started` }
      );

      // Initialize cache record and clear previous matches for this rules hash.
      opts.db.transaction(() => {
        opts.db
          .prepare(
            `
            INSERT INTO pattern_rules_cache(rules_hash, created_at, status, error)
            VALUES (?, ?, 'building', NULL)
            ON CONFLICT(rules_hash) DO UPDATE SET
              created_at = excluded.created_at,
              status = excluded.status,
              error = NULL
          `
          )
          .run(rulesHash, startedAt);

        opts.db
          .prepare(`DELETE FROM pattern_matches WHERE rules_hash = ?`)
          .run(rulesHash);
      })();

      // Fast path: nothing to scan (no cards or no enabled rules)
      if (totalCards === 0 || rulesCompiled.length === 0) {
        opts.db
          .prepare(
            `
            UPDATE pattern_rules_cache
            SET status = 'ready', error = NULL
            WHERE rules_hash = ?
          `
          )
          .run(rulesHash);

        opts.hub.broadcast(
          "patterns:run_done",
          {
            run_id: opts.runId,
            matched_cards: 0,
          } satisfies PatternRunDoneEvent,
          { id: `${opts.runId}:run_done` }
        );
        return;
      }

      const selectCards = opts.db.prepare(
        `
        SELECT
          id,
          description,
          personality,
          scenario,
          first_mes,
          mes_example,
          creator_notes,
          system_prompt,
          post_history_instructions,
          alternate_greetings_text,
          group_only_greetings_text
        FROM cards
        WHERE library_id = ?
      `
      );

      const insertMatch = opts.db.prepare(
        `
        INSERT INTO pattern_matches(rules_hash, card_id, matched_rules, updated_at)
        VALUES (?, ?, ?, ?)
      `
      );

      const insertBatchTx = opts.db.transaction(
        (
          items: Array<{ cardId: string; matchedRules: string; ts: number }>
        ) => {
          for (const it of items) {
            insertMatch.run(rulesHash, it.cardId, it.matchedRules, it.ts);
          }
        }
      );

      let matchedCards = 0;
      let processed = 0;
      let lastProgressAt = 0;
      const pendingInserts: Array<{
        cardId: string;
        matchedRules: string;
        ts: number;
      }> = [];

      const iter = selectCards.iterate(libraryId) as IterableIterator<
        Record<string, unknown> & { id: string }
      >;

      for (const row of iter) {
        processed += 1;

        const blob = buildSearchBlob(row);
        if (blob.length > 0) {
          const matchedRuleIds: string[] = [];
          for (const r of rulesCompiled) {
            try {
              if (safeTest(r.re, blob)) matchedRuleIds.push(r.id);
            } catch (e) {
              logger.warnKey(
                "warn.pattern_rules.regex_runtime_error",
                { ruleId: r.id },
                e
              );
            }
          }

          if (matchedRuleIds.length > 0) {
            matchedCards += 1;
            pendingInserts.push({
              cardId: row.id,
              matchedRules: JSON.stringify(matchedRuleIds),
              ts: Date.now(),
            });
          }
        }

        if (pendingInserts.length >= 200) {
          insertBatchTx(pendingInserts.splice(0, pendingInserts.length));
        }

        const now = Date.now();
        if (processed === totalCards || now - lastProgressAt >= 500) {
          lastProgressAt = now;
          opts.hub.broadcast(
            "patterns:progress",
            {
              run_id: opts.runId,
              processed_cards: processed,
              total_cards: totalCards,
            } satisfies PatternRunProgressEvent,
            { id: `${opts.runId}:progress:${processed}` }
          );
        }

        // Give the event loop a chance to flush SSE writes and keep the app responsive.
        if (processed % 50 === 0) {
          await sleepImmediate();
        }
      }

      if (pendingInserts.length > 0) {
        insertBatchTx(pendingInserts.splice(0, pendingInserts.length));
      }

      opts.db
        .prepare(
          `
          UPDATE pattern_rules_cache
          SET status = 'ready', error = NULL
          WHERE rules_hash = ?
        `
        )
        .run(rulesHash);

      opts.hub.broadcast(
        "patterns:run_done",
        {
          run_id: opts.runId,
          matched_cards: matchedCards,
        } satisfies PatternRunDoneEvent,
        { id: `${opts.runId}:run_done` }
      );
    } catch (e) {
      const message =
        e instanceof Error ? e.message : String(e ?? "Unknown error");
      try {
        opts.db
          .prepare(
            `
            INSERT INTO pattern_rules_cache(rules_hash, created_at, status, error)
            VALUES (?, ?, 'failed', ?)
            ON CONFLICT(rules_hash) DO UPDATE SET
              created_at = excluded.created_at,
              status = excluded.status,
              error = excluded.error
          `
          )
          .run(rulesHash, Date.now(), message);
      } catch (inner) {
        logger.errorKey(inner, "error.pattern_rules.cache_update_failed");
      }

      opts.hub.broadcast(
        "patterns:run_failed",
        { run_id: opts.runId, error: message } satisfies PatternRunFailedEvent,
        { id: `${opts.runId}:run_failed` }
      );
      throw e;
    }
  })();

  return { rules_hash: rulesHash, job };
}
