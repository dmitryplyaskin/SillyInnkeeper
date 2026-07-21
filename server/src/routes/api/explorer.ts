import { Router, type Request, type Response } from "express";
import { existsSync, statSync } from "node:fs";
import { AppError } from "../../errors/app-error";
import { sendError } from "../../errors/http";
import { logger } from "../../utils/logger";
import {
  ExplorerCommandFailedError,
  ExplorerDialogNotAvailableError,
  ExplorerUnsupportedPlatformError,
  pickFolder,
  showFile,
  showFolder,
} from "../../services/explorer";

const router = Router();

function getPathFromBody(req: Request): string {
  const body = req.body as unknown;
  if (
    typeof body !== "object" ||
    body === null ||
    !("path" in body) ||
    typeof (body as any).path !== "string"
  ) {
    throw new AppError({ status: 400, code: "api.explorer.invalid_format" });
  }

  const p = String((body as any).path).trim();
  if (!p)
    throw new AppError({ status: 400, code: "api.explorer.invalid_format" });
  return p;
}

function validateExists(p: string): void {
  if (!existsSync(p)) {
    throw new AppError({
      status: 400,
      code: "api.explorer.path_not_exists",
      params: { path: p },
    });
  }
}

function ensureDirectory(p: string): void {
  validateExists(p);
  const st = statSync(p);
  if (!st.isDirectory()) {
    throw new AppError({
      status: 400,
      code: "api.explorer.not_a_directory",
      params: { path: p },
    });
  }
}

function ensureFile(p: string): void {
  validateExists(p);
  const st = statSync(p);
  if (!st.isFile()) {
    throw new AppError({
      status: 400,
      code: "api.explorer.not_a_file",
      params: { path: p },
    });
  }
}

function mapExplorerError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  if (err instanceof ExplorerUnsupportedPlatformError) {
    return new AppError({
      status: 501,
      code: "api.explorer.unsupported_platform",
      params: { platform: err.platform },
      cause: err,
    });
  }

  if (err instanceof ExplorerDialogNotAvailableError) {
    return new AppError({
      status: 501,
      code: "api.explorer.dialog_not_available",
      params: { platform: err.platform },
      cause: err,
    });
  }

  if (err instanceof ExplorerCommandFailedError) {
    return new AppError({
      status: 500,
      code: "api.explorer.open_failed",
      extra: {
        cmd: err.command,
        args: err.args,
        stderr: err.result.stderr,
      },
      cause: err,
    });
  }

  return new AppError({
    status: 500,
    code: "api.explorer.open_failed",
    cause: err,
  });
}

// POST /api/explorer/show-folder
router.post("/explorer/show-folder", async (req: Request, res: Response) => {
  try {
    const p = getPathFromBody(req);
    ensureDirectory(p);

    await showFolder(p);
    res.json({ ok: true });
  } catch (error) {
    logger.errorKey(error, "api.explorer.open_failed");
    return sendError(res, mapExplorerError(error));
  }
});

// POST /api/explorer/show-file
router.post("/explorer/show-file", async (req: Request, res: Response) => {
  try {
    const p = getPathFromBody(req);
    ensureFile(p);

    await showFile(p);
    res.json({ ok: true });
  } catch (error) {
    logger.errorKey(error, "api.explorer.open_failed");
    return sendError(res, mapExplorerError(error));
  }
});

// POST /api/explorer/pick-folder
router.post("/explorer/pick-folder", async (req: Request, res: Response) => {
  try {
    const body = req.body as any;
    if (body != null && typeof body !== "object") {
      throw new AppError({ status: 400, code: "api.explorer.invalid_format" });
    }

    const title =
      body && "title" in body && body.title != null
        ? String(body.title)
        : undefined;

    const result = await pickFolder({ title });
    res.json(result);
  } catch (error) {
    logger.errorKey(error, "api.explorer.open_failed");
    return sendError(res, mapExplorerError(error));
  }
});

export default router;
