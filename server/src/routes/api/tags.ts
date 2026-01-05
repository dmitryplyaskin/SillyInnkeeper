import { Router, Request, Response } from "express";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { createTagService } from "../../services/tags";
import type { SseHub } from "../../services/sse-hub";
import {
  startTagsBulkEditRun,
  type TagsBulkEditAction,
  type TagsBulkEditTarget,
} from "../../services/tags-bulk-edit";
import { logger } from "../../utils/logger";
import { AppError } from "../../errors/app-error";
import { sendError } from "../../errors/http";

const router = Router();

// Middleware для получения базы данных из app.locals
function getDb(req: Request): Database.Database {
  return req.app.locals.db as Database.Database;
}

function getHub(req: Request): SseHub {
  const hub = (req.app.locals as any).sseHub as SseHub | undefined;
  if (!hub) throw new Error("SSE hub is not initialized");
  return hub;
}

type TagsBulkEditState = { running: boolean };

function getBulkEditState(req: Request): TagsBulkEditState {
  const locals = req.app.locals as any;
  if (!locals.tagsBulkEditState) locals.tagsBulkEditState = { running: false };
  return locals.tagsBulkEditState as TagsBulkEditState;
}

// GET /api/tags - получение списка всех тегов
router.get("/tags", async (req: Request, res: Response) => {
  try {
    const db = getDb(req);
    const tagService = createTagService(db);
    const tags = tagService.getAllTags();
    res.json(tags);
  } catch (error) {
    logger.errorKey(error, "api.tags.list_failed");
    return sendError(res, error, { status: 500, code: "api.tags.list_failed" });
  }
});

// POST /api/tags/bulk-edit - массовая замена/удаление тегов
router.post("/tags/bulk-edit", async (req: Request, res: Response) => {
  const state = getBulkEditState(req);
  if (state.running) {
    return sendError(
      res,
      new AppError({ status: 409, code: "api.tags.bulk_edit.already_running" })
    );
  }

  try {
    const body = req.body as any;

    const actionRaw = typeof body?.action === "string" ? body.action : "";
    const action: TagsBulkEditAction | null =
      actionRaw === "replace" || actionRaw === "delete" ? actionRaw : null;

    const from = body?.from;

    // Optional scope flags (backward-compatible defaults)
    const apply_to_library =
      typeof body?.apply_to_library === "boolean" ? body.apply_to_library : true;
    const apply_to_st =
      typeof body?.apply_to_st === "boolean" ? body.apply_to_st : false;
    const st_profile_handles: string[] | undefined = Array.isArray(body?.st_profile_handles)
      ? (body.st_profile_handles as unknown[])
          .map((x) => String(x ?? "").trim())
          .filter((s) => s.length > 0)
      : undefined;

    const toRaw = body?.to;
    const to: TagsBulkEditTarget | undefined =
      toRaw && typeof toRaw === "object"
        ? ({
            kind: toRaw.kind,
            rawName: toRaw.rawName,
            name: toRaw.name,
          } as TagsBulkEditTarget)
        : undefined;

    if (!action || !Array.isArray(from)) {
      throw new AppError({ status: 400, code: "api.tags.bulk_edit.invalid_format" });
    }

    const db = getDb(req);
    const hub = getHub(req);
    const runId = randomUUID();

    state.running = true;
    const { job } = await startTagsBulkEditRun({
      db,
      hub,
      runId,
      action,
      from,
      to,
      applyToLibrary: apply_to_library,
      applyToSt: apply_to_st,
      stProfileHandles: st_profile_handles,
    });

    void job
      .catch((error) => {
        // Errors are broadcasted via SSE; do not crash process.
        logger.errorKey(error, "api.tags.bulk_edit.run_failed");
      })
      .finally(() => {
        state.running = false;
      });

    res.status(202).json({ run_id: runId });
  } catch (error) {
    state.running = false;
    logger.errorKey(error, "api.tags.bulk_edit.start_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.tags.bulk_edit.start_failed",
    });
  }
});

// POST /api/tags - создание нового тега
router.post("/tags", async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    // Валидация входных данных
    if (typeof name !== "string") {
      throw new AppError({ status: 400, code: "api.tags.name_invalid" });
    }

    const db = getDb(req);
    const tagService = createTagService(db);
    const tag = tagService.createTag(name);
    res.status(201).json(tag);
  } catch (error: any) {
    logger.errorKey(error, "api.tags.create_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.tags.create_failed",
    });
  }
});

// GET /api/tags/:id - получение тега по ID
router.get("/tags/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb(req);
    const tagService = createTagService(db);
    const tag = tagService.getTagById(id);

    if (!tag) {
      throw new AppError({ status: 404, code: "api.tags.not_found" });
    }

    res.json(tag);
  } catch (error) {
    logger.errorKey(error, "api.tags.get_failed");
    return sendError(res, error, { status: 500, code: "api.tags.get_failed" });
  }
});

// PUT /api/tags/:id - полное обновление тега
router.put("/tags/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Валидация входных данных
    if (typeof name !== "string") {
      throw new AppError({ status: 400, code: "api.tags.name_invalid" });
    }

    const db = getDb(req);
    const tagService = createTagService(db);
    const tag = tagService.updateTag(id, name);
    res.json(tag);
  } catch (error: any) {
    logger.errorKey(error, "api.tags.update_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.tags.update_failed",
    });
  }
});

// PATCH /api/tags/:id - частичное обновление тега
router.patch("/tags/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Валидация входных данных
    if (typeof name !== "string") {
      throw new AppError({ status: 400, code: "api.tags.name_invalid" });
    }

    const db = getDb(req);
    const tagService = createTagService(db);
    const tag = tagService.patchTag(id, name);
    res.json(tag);
  } catch (error: any) {
    logger.errorKey(error, "api.tags.update_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.tags.update_failed",
    });
  }
});

// DELETE /api/tags/:id - удаление тега
router.delete("/tags/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb(req);
    const tagService = createTagService(db);
    tagService.deleteTag(id);
    res.json({ message: "Тег успешно удален" });
  } catch (error: any) {
    logger.errorKey(error, "api.tags.delete_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.tags.delete_failed",
    });
  }
});

export default router;
