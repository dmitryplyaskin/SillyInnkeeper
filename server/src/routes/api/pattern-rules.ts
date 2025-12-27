import { Router, type Request, type Response } from "express";
import type Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type { SseHub } from "../../services/sse-hub";
import { getPatternRules, updatePatternRules } from "../../services/pattern-rules";
import { AppError } from "../../errors/app-error";
import { sendError } from "../../errors/http";
import { logger } from "../../utils/logger";
import { startPatternRulesRun } from "../../services/pattern-rules-runner";

const router = Router();

function getDb(req: Request): Database.Database {
  return req.app.locals.db as Database.Database;
}

function getHub(req: Request): SseHub {
  const hub = (req.app.locals as any).sseHub as SseHub | undefined;
  if (!hub) throw new Error("SSE hub is not initialized");
  return hub;
}

type PatternRunState = { running: boolean };

function getState(req: Request): PatternRunState {
  const locals = req.app.locals as any;
  if (!locals.patternRulesState) locals.patternRulesState = { running: false };
  return locals.patternRulesState as PatternRunState;
}

router.get("/pattern-rules", async (_req: Request, res: Response) => {
  try {
    const file = await getPatternRules();
    res.json(file);
  } catch (error) {
    logger.errorKey(error, "api.pattern_rules.get_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.pattern_rules.get_failed",
    });
  }
});

router.put("/pattern-rules", async (req: Request, res: Response) => {
  try {
    const body = req.body as any;
    const rulesInput = Array.isArray(body) ? body : body?.rules;
    const next = await updatePatternRules(rulesInput);
    res.json(next);
  } catch (error) {
    logger.errorKey(error, "api.pattern_rules.update_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.pattern_rules.update_failed",
    });
  }
});

router.get("/pattern-rules/status", async (req: Request, res: Response) => {
  try {
    const db = getDb(req);
    const file = await getPatternRules();
    const hasRules = file.rules.length > 0;
    const hasEnabledRules = file.rules.some((r) => r.enabled);

    const rows = db
      .prepare(
        `
        SELECT rules_hash, created_at, status, error
        FROM pattern_rules_cache
        ORDER BY created_at DESC
        LIMIT 20
      `
      )
      .all() as Array<{
      rules_hash: string;
      created_at: number;
      status: "building" | "ready" | "failed";
      error: string | null;
    }>;

    const lastReady = rows.find((r) => r.status === "ready") ?? null;
    const latest = rows.length > 0 ? rows[0] : null;
    const current =
      latest && (latest.status === "building" || latest.status === "failed")
        ? latest
        : null;

    res.json({
      hasRules,
      hasEnabledRules,
      lastReady: lastReady
        ? { rules_hash: lastReady.rules_hash, created_at: lastReady.created_at }
        : null,
      current: current
        ? {
            rules_hash: current.rules_hash,
            created_at: current.created_at,
            status: current.status,
            error: current.error,
          }
        : null,
    });
  } catch (error) {
    logger.errorKey(error, "api.pattern_rules.status_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.pattern_rules.status_failed",
    });
  }
});

router.post("/pattern-rules/run", async (req: Request, res: Response) => {
  const state = getState(req);
  if (state.running) {
    return sendError(
      res,
      new AppError({ status: 409, code: "api.pattern_rules.already_running" })
    );
  }

  try {
    const db = getDb(req);
    const hub = getHub(req);
    const runId = randomUUID();

    state.running = true;
    const { rules_hash, job } = await startPatternRulesRun({
      db,
      hub,
      runId,
    });
    void job
      .catch((error) => {
        // Do not crash the process on unhandled rejection; errors are already reported via SSE.
        logger.errorKey(error, "api.pattern_rules.run_failed");
      })
      .finally(() => {
        state.running = false;
      });

    res.status(202).json({ run_id: runId, rules_hash });
  } catch (error) {
    state.running = false;
    logger.errorKey(error, "api.pattern_rules.run_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.pattern_rules.run_failed",
    });
  }
});

export default router;


