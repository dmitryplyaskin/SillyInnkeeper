import type Database from "better-sqlite3";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Settings } from "./settings";
import { getOrCreateLibraryId } from "./libraries";
import type { WatchTarget } from "./fs-watcher";

function listSillyTavernProfileNames(dataDir: string): string[] {
  if (!existsSync(dataDir)) return [];
  try {
    const entries = readdirSync(dataDir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((name) => typeof name === "string" && name.length > 0)
      .filter((name) => !name.startsWith("_"));
  } catch {
    return [];
  }
}

function listExistingDirs(dirs: string[]): string[] {
  const out: string[] = [];
  for (const d of dirs) {
    if (d && existsSync(d)) out.push(d);
  }
  return out;
}

export function buildWatchTargets(
  settings: Settings,
  db: Database.Database
): WatchTarget[] {
  const targets: WatchTarget[] = [];

  const cardsPath = settings.cardsFolderPath;
  if (cardsPath && existsSync(cardsPath)) {
    const libraryId = getOrCreateLibraryId(db, cardsPath);
    targets.push({
      id: "cards",
      folderPath: cardsPath,
      libraryId,
      scanMode: "folder",
      // Old stable behavior: watch the folder itself (recursive).
      watchGlobs: [cardsPath],
    });
  }

  const stRoot = settings.sillytavenrPath;
  if (stRoot && existsSync(stRoot)) {
    const dataDir = join(stRoot, "data");
    const profiles = listSillyTavernProfileNames(dataDir);
    const charactersDirs = listExistingDirs(
      profiles.map((p) => join(dataDir, p, "characters"))
    );

    if (charactersDirs.length > 0) {
      // One watch target per profile characters dir:
      // library_id is based on `<root>/data/<profile>/characters`, so cards do not mix between profiles.
      for (const dir of charactersDirs) {
        const profileHandle = dir.split(/[/\\]+/).slice(-2, -1)[0] ?? "unknown";
        const libraryId = getOrCreateLibraryId(db, dir);
        targets.push({
          id: `sillytavern:${profileHandle}`,
          folderPath: dir,
          libraryId,
          scanMode: "sillytavern_profile",
          watchGlobs: [dir],
          // Only direct *.png files in characters/ (no subdirs)
          depth: 0,
        });
      }
    }
  }

  return targets;
}


