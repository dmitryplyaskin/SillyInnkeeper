import { Router, type Request, type Response } from "express";
import {
  getImportSettings,
  updateImportSettings,
  type ImportSettings,
} from "../../services/import-settings";
import { logger } from "../../utils/logger";
import { AppError } from "../../errors/app-error";
import { sendError } from "../../errors/http";

const router = Router();

router.get("/import-settings", async (_req: Request, res: Response) => {
  try {
    const settings = await getImportSettings();
    res.json(settings);
  } catch (error) {
    logger.errorKey(error, "api.importSettings.get_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.importSettings.get_failed",
    });
  }
});

router.put("/import-settings", async (req: Request, res: Response) => {
  try {
    const body = req.body as unknown;
    if (
      typeof body !== "object" ||
      body === null ||
      !("sourceFolderPath" in body) ||
      !("importMode" in body) ||
      !("duplicatesMode" in body)
    ) {
      throw new AppError({
        status: 400,
        code: "api.importSettings.invalid_format",
      });
    }

    const saved = await updateImportSettings(body as ImportSettings);
    res.json(saved);
  } catch (error) {
    logger.errorKey(error, "api.importSettings.update_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.importSettings.update_failed",
    });
  }
});

export default router;


