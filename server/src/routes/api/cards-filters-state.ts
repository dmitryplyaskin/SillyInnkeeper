import { Router, type Request, type Response } from "express";
import {
  getCardsFiltersState,
  updateCardsFiltersState,
  type CardsFiltersState,
} from "../../services/cards-filters-state";
import { logger } from "../../utils/logger";
import { AppError } from "../../errors/app-error";
import { sendError } from "../../errors/http";

const router = Router();

router.get("/cards-filters-state", async (_req: Request, res: Response) => {
  try {
    const state = await getCardsFiltersState();
    res.json(state);
  } catch (error) {
    logger.errorKey(error, "api.cardsFiltersState.get_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.cardsFiltersState.get_failed",
    });
  }
});

router.put("/cards-filters-state", async (req: Request, res: Response) => {
  try {
    const body = req.body as unknown;
    if (typeof body !== "object" || body === null) {
      throw new AppError({
        status: 400,
        code: "api.cardsFiltersState.invalid_format",
      });
    }

    const saved = await updateCardsFiltersState(body as CardsFiltersState);
    res.json(saved);
  } catch (error) {
    logger.errorKey(error, "api.cardsFiltersState.update_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.cardsFiltersState.update_failed",
    });
  }
});

export default router;


