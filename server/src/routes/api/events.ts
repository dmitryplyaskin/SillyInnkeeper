import { Router, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { logger } from "../../utils/logger";
import type { SseHub } from "../../services/sse-hub";

const router = Router();

function getHub(req: Request): SseHub {
  const hub = (req.app.locals as any).sseHub as SseHub | undefined;
  if (!hub) throw new Error("SSE hub is not initialized");
  return hub;
}

router.get("/events", (req: Request, res: Response) => {
  try {
    // SSE headers
    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    // disable proxy buffering (nginx)
    res.setHeader("X-Accel-Buffering", "no");

    // flush headers if possible
    (res as any).flushHeaders?.();

    const hub = getHub(req);
    hub.startHeartbeat();

    const clientId = randomUUID();
    const remove = hub.addClient(clientId, res);
    logger.info(`SSE client connected: ${clientId} (total=${hub.getClientsCount()})`);

    req.on("close", () => {
      remove();
      try {
        res.end();
      } catch {
        // ignore
      }
      logger.info(
        `SSE client disconnected: ${clientId} (total=${hub.getClientsCount()})`
      );
    });
  } catch (error) {
    logger.error(error, "Ошибка при установке SSE соединения");
    try {
      res.status(500).end();
    } catch {
      // ignore
    }
  }
});

export default router;


