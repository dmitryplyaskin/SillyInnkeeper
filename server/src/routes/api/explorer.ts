import { execFile } from "node:child_process";
import { existsSync, statSync, readdirSync } from "node:fs";
import os from "node:os";
import { Router, type Request, type Response } from "express";
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

/**
 * Search for a file by name under a root directory (max depth).
 * Returns the first match's parent directory, or null.
 */
function searchFileInDir(
  root: string,
  filename: string,
  maxDepth: number
): Promise<string | null> {
  return new Promise((resolve) => {
    const child = execFile(
      "find",
      [root, "-maxdepth", String(maxDepth), "-name", filename, "-type", "f"],
      { timeout: 10_000, maxBuffer: 1024 * 1024 },
      (err, stdout) => {
        if (err) {
          resolve(null);
          return;
        }
        const lines = stdout.trim().split("\n").filter(Boolean);
        if (lines.length === 0) {
          resolve(null);
          return;
        }
        // Return parent directory of the first match
        resolve(lines[0].replace(/\/[^/]+$/, ""));
      }
    );
  });
}

/**
 * Attempt to resolve a file to a directory path on Android.
 * Searches common storage locations for the given filename.
 */
async function resolveFilePathOnAndroid(
  filename: string
): Promise<string | null> {
  const home = os.homedir();
  const searchDirs: Array<{ root: string; depth: number }> = [
    { root: "/storage/emulated/0", depth: 5 },
    { root: home, depth: 5 },
  ];

  // Try to detect external SD card
  try {
    const entries = readdirSync("/storage");
    for (const entry of entries) {
      if (
        entry !== "emulated" &&
        entry !== "self"
      ) {
        const full = `/storage/${entry}`;
        if (!searchDirs.some((d) => d.root === full)) {
          searchDirs.push({ root: full, depth: 5 });
        }
      }
    }
  } catch {
    // ignore
  }

  for (const { root, depth } of searchDirs) {
    try {
      if (!existsSync(root)) continue;
      const result = await searchFileInDir(root, filename, depth);
      if (result) return result;
    } catch {
      // continue searching
    }
  }

  return null;
}

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

// POST /api/explorer/resolve-file-path
// Android: given a filename from the browser's native file picker,
// search the filesystem for that file and return its parent directory.
router.post("/explorer/resolve-file-path", async (req: Request, res: Response) => {
  try {
    const body = req.body as any;
    if (
      body == null ||
      typeof body !== "object" ||
      typeof body.filename !== "string" ||
      !body.filename.trim()
    ) {
      throw new AppError({ status: 400, code: "api.explorer.invalid_format" });
    }

    const filename = body.filename.trim();
    const dir = await resolveFilePathOnAndroid(filename);
    res.json({ path: dir ?? null });
  } catch (error) {
    logger.errorKey(error, "api.explorer.open_failed");
    return sendError(res, mapExplorerError(error));
  }
});

export default router;
