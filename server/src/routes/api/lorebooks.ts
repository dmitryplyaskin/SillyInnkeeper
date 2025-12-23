import { Router, type Request, type Response } from "express";
import Database from "better-sqlite3";
import { createLorebooksService } from "../../services/lorebooks";
import { AppError } from "../../errors/app-error";
import { sendError } from "../../errors/http";
import { logger } from "../../utils/logger";

const router = Router();

function getDb(req: Request): Database.Database {
  return req.app.locals.db as Database.Database;
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== "string") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

// GET /api/lorebooks - список лорабуков
router.get("/lorebooks", (req: Request, res: Response) => {
  try {
    const db = getDb(req);
    const svc = createLorebooksService(db);

    const limit = parseNumber((req.query as any).limit);
    const offset = parseNumber((req.query as any).offset);
    const nameRaw = (req.query as any).name;
    const cardIdRaw = (req.query as any).card_id;

    const name =
      typeof nameRaw === "string" && nameRaw.trim().length > 0
        ? nameRaw.trim()
        : undefined;
    const card_id =
      typeof cardIdRaw === "string" && cardIdRaw.trim().length > 0
        ? cardIdRaw.trim()
        : undefined;

    const items = svc.list({
      limit,
      offset,
      name,
      card_id,
    });

    res.json(items);
  } catch (error) {
    logger.errorKey(error, "api.lorebooks.list_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.lorebooks.list_failed",
    });
  }
});

// GET /api/lorebooks/:id - детали лорабука
router.get("/lorebooks/:id", (req: Request, res: Response) => {
  try {
    const db = getDb(req);
    const svc = createLorebooksService(db);
    const { id } = req.params;

    const row = svc.getById(id);
    if (!row) {
      throw new AppError({ status: 404, code: "api.lorebooks.not_found" });
    }

    const data = JSON.parse(row.data_json) as unknown;

    res.json({
      id: row.id,
      name: row.name,
      description: row.description,
      spec: row.spec,
      created_at: row.created_at,
      updated_at: row.updated_at,
      data,
      cards: row.cards,
    });
  } catch (error) {
    logger.errorKey(error, "api.lorebooks.get_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.lorebooks.get_failed",
    });
  }
});

// POST /api/lorebooks - создание нового лорабука
router.post("/lorebooks", (req: Request, res: Response) => {
  try {
    const db = getDb(req);
    const svc = createLorebooksService(db);

    const body = req.body as any;
    const data =
      body && typeof body === "object" && "data" in body ? body.data : body;

    if (!data || typeof data !== "object") {
      throw new AppError({
        status: 400,
        code: "api.lorebooks.invalid_data",
      });
    }

    const now = Date.now();
    const created = svc.createFromData(data, now);
    const row = created.row;
    const parsedData = JSON.parse(row.data_json) as unknown;

    res.status(201).json({
      id: row.id,
      name: row.name,
      description: row.description,
      spec: row.spec,
      created_at: row.created_at,
      updated_at: row.updated_at,
      data: parsedData,
      is_duplicate: created.is_duplicate,
    });
  } catch (error: any) {
    if (error && error.message && String(error.message).includes("must be")) {
      return sendError(res, error, {
        status: 400,
        code: "api.lorebooks.invalid_data",
      });
    }

    logger.errorKey(error, "api.lorebooks.create_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.lorebooks.create_failed",
    });
  }
});

// PUT /api/lorebooks/:id - обновление лорабука
router.put("/lorebooks/:id", (req: Request, res: Response) => {
  try {
    const db = getDb(req);
    const svc = createLorebooksService(db);
    const { id } = req.params;

    const body = req.body as any;
    const data =
      body && typeof body === "object" && "data" in body ? body.data : body;

    if (!data || typeof data !== "object") {
      throw new AppError({
        status: 400,
        code: "api.lorebooks.invalid_data",
      });
    }

    const now = Date.now();
    const row = svc.update(id, data, now);
    const parsedData = JSON.parse(row.data_json) as unknown;

    res.json({
      id: row.id,
      name: row.name,
      description: row.description,
      spec: row.spec,
      created_at: row.created_at,
      updated_at: row.updated_at,
      data: parsedData,
    });
  } catch (error: any) {
    if (error && error.code === "LOREBOOK_DUPLICATE") {
      return sendError(res, error, {
        status: 409,
        code: "api.lorebooks.duplicate",
      });
    }

    if (error && error.message === "Lorebook not found") {
      return sendError(res, error, {
        status: 404,
        code: "api.lorebooks.not_found",
      });
    }

    if (error && error.message && String(error.message).includes("must be")) {
      return sendError(res, error, {
        status: 400,
        code: "api.lorebooks.invalid_data",
      });
    }

    logger.errorKey(error, "api.lorebooks.update_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.lorebooks.update_failed",
    });
  }
});

// DELETE /api/lorebooks/:id - удаление лорабука
router.delete("/lorebooks/:id", (req: Request, res: Response) => {
  try {
    const db = getDb(req);
    const svc = createLorebooksService(db);
    const { id } = req.params;

    const forceRaw = (req.query as any).force;
    const force =
      typeof forceRaw === "string"
        ? forceRaw === "1" || forceRaw.toLowerCase() === "true"
        : false;

    svc.delete(id, { force });

    res.json({ ok: true });
  } catch (error: any) {
    if (error && error.message === "Lorebook not found") {
      return sendError(res, error, {
        status: 404,
        code: "api.lorebooks.not_found",
      });
    }

    if (error && error.code === "LOREBOOK_IN_USE") {
      return sendError(res, error, {
        status: 409,
        code: "api.lorebooks.in_use",
      });
    }

    logger.errorKey(error, "api.lorebooks.delete_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.lorebooks.delete_failed",
    });
  }
});

export default router;
