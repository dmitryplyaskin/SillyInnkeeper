import { Router, type Request, type Response } from "express";
import type Database from "better-sqlite3";
import { AppError } from "../../errors/app-error";
import { sendError } from "../../errors/http";
import { logger } from "../../utils/logger";
import { listCardChats, readCardChat } from "../../services/card-chats";

const router = Router();

function getDb(req: Request): Database.Database {
  return req.app.locals.db as Database.Database;
}

// GET /api/cards/:id/chats - list chat files for SillyTavern card
router.get("/cards/:id/chats", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const chats = await listCardChats(getDb(req), String(id ?? "").trim());
    res.json({ chats });
  } catch (error) {
    logger.errorKey(error, "api.cards.chats_list_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.cards.chats_list_failed",
    });
  }
});

// GET /api/cards/:id/chats/:chatId - read full chat
router.get("/cards/:id/chats/:chatId", async (req: Request, res: Response) => {
  try {
    const { id, chatId } = req.params;
    if (typeof chatId !== "string" || chatId.trim().length === 0) {
      throw new AppError({ status: 400, code: "api.cards.invalid_chatId" });
    }

    try {
      const chat = await readCardChat(
        getDb(req),
        String(id ?? "").trim(),
        chatId.trim()
      );
      if (!chat) {
        throw new AppError({ status: 404, code: "api.cards.chat_not_found" });
      }
      res.json(chat);
      return;
    } catch (e) {
      if (e instanceof Error && e.message === "invalid_chat_id") {
        throw new AppError({ status: 400, code: "api.cards.invalid_chatId" });
      }
      throw e;
    }
  } catch (error) {
    logger.errorKey(error, "api.cards.chat_failed");
    return sendError(res, error, {
      status: 500,
      code: "api.cards.chat_failed",
    });
  }
});

export default router;


