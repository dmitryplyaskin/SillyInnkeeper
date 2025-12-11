import { Router, Request, Response } from "express";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { logger } from "../../utils/logger";

const router = Router();

// GET /api/thumbnail/:id - получение миниатюры карточки
router.get("/thumbnail/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Построим путь к файлу миниатюры
    const thumbnailPath = join(
      process.cwd(),
      "data",
      "cache",
      "thumbnails",
      `${id}.webp`
    );

    // Проверяем существование файла
    if (!existsSync(thumbnailPath)) {
      res.status(404).json({ error: "Миниатюра не найдена" });
      return;
    }

    // Отправляем файл с правильным Content-Type
    res.setHeader("Content-Type", "image/webp");
    res.sendFile(thumbnailPath);
  } catch (error) {
    logger.error(error, "Ошибка при получении миниатюры");
    res.status(500).json({ error: "Не удалось получить миниатюру" });
  }
});

export default router;
