import chokidar, { type FSWatcher } from "chokidar";
import { extname } from "node:path";
import { logger } from "../utils/logger";
import type { CardsSyncOrchestrator } from "./cards-sync-orchestrator";

export type WatchTarget = {
  /** Stable id for diffing/restarts (e.g. "cards", "sillytavern") */
  id: string;
  /** Path that should be passed into orchestrator (root folder for scanning) */
  folderPath: string;
  libraryId: string;
  scanMode?: "folder" | "sillytavern";
  /** Globs passed into chokidar.watch(...) */
  watchGlobs: string[];
  /**
   * Optional chokidar depth (useful to avoid recursion into subfolders).
   * - 0: only direct children
   * - undefined: default chokidar behavior (recursive)
   */
  depth?: number;
  /** Optional extra filter, applied to the chokidar event path */
  isRelevantPath?: (absPath: string) => boolean;
  debounceMs?: number;
  /**
   * If true, chokidar will use polling (more reliable on some Windows drives/UNC,
   * but higher CPU/disk usage). If not provided, we auto-detect a safe default.
   */
  usePolling?: boolean;
  /** Poll interval used when usePolling is enabled (ms). */
  pollingIntervalMs?: number;
};

type ActiveTarget = {
  configKey: string;
  watcher: FSWatcher;
  debounceTimer: NodeJS.Timeout | null;
  target: WatchTarget;
};

function toPosixPath(p: string): string {
  return String(p ?? "").replace(/\\/g, "/");
}

function trimTrailingSlashes(p: string): string {
  return p.replace(/\/+$/, "");
}

function shouldUsePollingByDefault(folderPath: string): boolean {
  // We intentionally keep native fs events as the default behavior.
  // The old implementation worked reliably on Windows for local drives.
  // Polling can be enabled explicitly via WatchTarget.usePolling.
  void folderPath;
  return false;
}

export function buildGlob(rootPath: string, suffix: string): string {
  const root = trimTrailingSlashes(toPosixPath(rootPath));
  const s = String(suffix ?? "").replace(/^\/+/, "");
  return s ? `${root}/${s}` : root;
}

export class FsWatcherService {
  private targets = new Map<string, ActiveTarget>();

  constructor(
    private orchestrator: CardsSyncOrchestrator,
    private debounceMs: number = 2000
  ) {}

  /**
   * Ensures chokidar watchers match the provided targets set.
   * - starts missing targets
   * - restarts changed targets
   * - stops removed targets
   */
  syncTargets(nextTargets: WatchTarget[]): void {
    const byId = new Map<string, WatchTarget>();
    for (const t of nextTargets) {
      if (!t?.id) continue;
      byId.set(t.id, t);
    }

    // stop removed
    for (const [id] of this.targets) {
      if (!byId.has(id)) this.stopTarget(id);
    }

    // start/restart existing
    for (const [id, t] of byId) {
      this.startOrRestartTarget(id, t);
    }
  }

  stopAll(): void {
    for (const [id] of this.targets) {
      this.stopTarget(id);
    }
    this.targets.clear();
  }

  private stopTarget(id: string): void {
    const active = this.targets.get(id);
    if (!active) return;

    if (active.debounceTimer) {
      clearTimeout(active.debounceTimer);
      active.debounceTimer = null;
    }
    try {
      void active.watcher.close();
    } finally {
      this.targets.delete(id);
    }
  }

  private startOrRestartTarget(id: string, target: WatchTarget): void {
    const debounceMs = target.debounceMs ?? this.debounceMs;
    const scanMode = target.scanMode ?? "folder";
    const folderPath = target.folderPath;
    const libraryId = target.libraryId;
    const watchGlobs = target.watchGlobs ?? [];
    const depth = target.depth;
    const usePolling =
      target.usePolling ?? shouldUsePollingByDefault(folderPath);
    const pollingIntervalMs = target.pollingIntervalMs ?? 1000;

    const configKey = JSON.stringify({
      folderPath,
      libraryId,
      scanMode,
      watchGlobs,
      depth,
      debounceMs,
      hasRelevantFilter: Boolean(target.isRelevantPath),
      usePolling,
      pollingIntervalMs,
    });

    const existing = this.targets.get(id);
    if (existing && existing.configKey === configKey) return;
    if (existing) this.stopTarget(id);

    const watcher = chokidar.watch(watchGlobs, {
      ignoreInitial: true,
      persistent: true,
      depth,
      usePolling,
      interval: pollingIntervalMs,
      awaitWriteFinish: {
        stabilityThreshold: 1500,
        pollInterval: 100,
      },
    });

    const active: ActiveTarget = {
      configKey,
      watcher,
      debounceTimer: null,
      target: { ...target, scanMode },
    };
    this.targets.set(id, active);

    const isPng = (p: string) => extname(p).toLowerCase() === ".png";
    const isRelevant = (eventPath: string): boolean => {
      if (!isPng(eventPath)) return false;
      if (active.target.isRelevantPath) {
        try {
          return Boolean(active.target.isRelevantPath(eventPath));
        } catch {
          // If filter throws, treat as irrelevant to avoid scan spam.
          return false;
        }
      }
      return true;
    };

    const schedule = (reason: string) => {
      if (active.debounceTimer) clearTimeout(active.debounceTimer);
      active.debounceTimer = setTimeout(() => {
        active.debounceTimer = null;
        logger.infoKey("log.fsWatcher.triggerScan", {
          reason,
          targetId: id,
          scanMode,
        });
        this.orchestrator.requestScan("fs", folderPath, libraryId, scanMode);
      }, debounceMs);
    };

    watcher
      .on("add", (p) => {
        if (!isRelevant(p)) return;
        schedule("add");
      })
      .on("change", (p) => {
        if (!isRelevant(p)) return;
        schedule("change");
      })
      .on("unlink", (p) => {
        if (!isRelevant(p)) return;
        schedule("unlink");
      })
      // For folder watchers, directory events can hint about bulk changes.
      // For SillyTavern mode we intentionally ignore directory events to avoid scan spam.
      .on("addDir", () => {
        if (scanMode !== "folder") return;
        schedule("addDir");
      })
      .on("unlinkDir", () => {
        if (scanMode !== "folder") return;
        schedule("unlinkDir");
      })
      .on("error", (err) => logger.errorKey(err, "error.fsWatcher.error"));

    logger.infoKey("log.fsWatcher.started", {
      folderPath,
      targetId: id,
      scanMode,
      usePolling,
    });
  }
}
