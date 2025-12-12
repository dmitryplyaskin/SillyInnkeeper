import { Router } from "express";
import settings from "./settings";
import viewSettings from "./view-settings";
import cards from "./cards";
import tags from "./tags";
import thumbnail from "./thumbnail";
import image from "./image";
import events from "./events";

const router = Router();

// Подключаем дочерние роутеры
router.use(settings);
router.use(viewSettings);
router.use(cards);
router.use(tags);
router.use(thumbnail);
router.use(image);
router.use(events);

export default router;
