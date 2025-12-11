import { Router, Request, Response } from "express";
import Database from "better-sqlite3";
import { createCardsService } from "../../services/cards";
import { logger } from "../../utils/logger";

const router = Router();

// Middleware для получения базы данных из app.locals
function getDb(req: Request): Database.Database {
  return req.app.locals.db as Database.Database;
}

// GET /api/cards - получение списка карточек
router.get("/cards", async (req: Request, res: Response) => {
  try {
    const db = getDb(req);
    const cardsService = createCardsService(db);
    const cardsList = cardsService.getCardsList();
    res.json(cardsList);
  } catch (error) {
    logger.error(error, "Ошибка при получении списка карточек");
    res.status(500).json({ error: "Не удалось получить список карточек" });
  }
});

export default router;
