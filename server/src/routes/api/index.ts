import { Router } from "express";
import settings from "./settings";
import cards from "./cards";

const router = Router();

// Подключаем дочерние роутеры
router.use(settings);
router.use(cards);

export default router;
