import { Router } from "express";
import settings from "./settings";
import cards from "./cards";
import tags from "./tags";
import thumbnail from "./thumbnail";

const router = Router();

// Подключаем дочерние роутеры
router.use(settings);
router.use(cards);
router.use(tags);
router.use(thumbnail);

export default router;
