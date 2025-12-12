import type { Response } from "express";

type SseClient = {
  id: string;
  res: Response;
  createdAt: number;
};

function writeSse(
  res: Response,
  payload: { event?: string; id?: string | number; data?: unknown }
): void {
  if (payload.event) res.write(`event: ${payload.event}\n`);
  if (payload.id != null) res.write(`id: ${String(payload.id)}\n`);
  if (payload.data !== undefined) {
    res.write(`data: ${JSON.stringify(payload.data)}\n`);
  } else {
    res.write("data: {}\n");
  }
  res.write("\n");
}

export class SseHub {
  private clients = new Map<string, SseClient>();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(private heartbeatMs: number = 25_000) {}

  addClient(clientId: string, res: Response): () => void {
    const client: SseClient = { id: clientId, res, createdAt: Date.now() };
    this.clients.set(clientId, client);

    // send initial hello
    writeSse(res, { event: "hello", data: { connectedAt: client.createdAt } });

    return () => {
      this.clients.delete(clientId);
    };
  }

  broadcast(event: string, data: unknown, opts?: { id?: string | number }): void {
    for (const client of this.clients.values()) {
      try {
        writeSse(client.res, { event, data, id: opts?.id });
      } catch {
        // if write fails, drop client
        this.clients.delete(client.id);
      }
    }
  }

  startHeartbeat(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      this.broadcast("ping", { ts: Date.now() });
    }, this.heartbeatMs);
    // do not keep process alive only because of heartbeat
    this.heartbeatTimer.unref?.();
  }

  stopHeartbeat(): void {
    if (!this.heartbeatTimer) return;
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  closeAll(): void {
    this.stopHeartbeat();
    for (const client of this.clients.values()) {
      try {
        client.res.end();
      } catch {
        // ignore
      }
    }
    this.clients.clear();
  }

  getClientsCount(): number {
    return this.clients.size;
  }
}


