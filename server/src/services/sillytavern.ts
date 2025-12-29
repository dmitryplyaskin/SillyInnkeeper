import { existsSync, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

type PngFileEntry = {
  filePath: string;
  createdAtMs: number;
};

function isFinitePositive(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

function getCreatedAtMs(filePath: string): number {
  const st = statSync(filePath);
  const birth = st.birthtimeMs;
  const mtime = st.mtimeMs;
  return isFinitePositive(birth) ? birth : mtime;
}

/**
 * Возвращает список путей до PNG карточек в SillyTavern.
 *
 * Ожидаемая структура:
 *   <sillytavenrPath>/data/<profile>/characters/*.png
 *
 * Особенности:
 * - profile директории: все папки внутри `data`, которые НЕ начинаются с `_`
 * - внутри `characters` берём только *.png файлы на первом уровне (без рекурсии),
 *   т.к. подпапки сейчас трактуем как доп. изображения и игнорируем
 * - итог сортируем от старых к новым (birthtime fallback mtime, затем filePath)
 */
export async function listSillyTavernCharacterPngs(
  sillytavenrPath: string
): Promise<string[]> {
  const root = String(sillytavenrPath ?? "").trim();
  if (!root) return [];

  const dataDir = join(root, "data");
  if (!existsSync(dataDir)) return [];

  const entries = await readdir(dataDir, { withFileTypes: true });
  const profileDirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => typeof name === "string" && name.length > 0)
    .filter((name) => !name.startsWith("_"));

  const pngEntries: PngFileEntry[] = [];

  for (const profileName of profileDirs) {
    const charactersDir = join(dataDir, profileName, "characters");
    if (!existsSync(charactersDir)) continue;

    try {
      const files = await readdir(charactersDir, { withFileTypes: true });
      for (const f of files) {
        if (!f.isFile()) continue;
        const name = f.name ?? "";
        if (typeof name !== "string") continue;
        if (!name.toLowerCase().endsWith(".png")) continue;
        const fullPath = join(charactersDir, name);
        try {
          pngEntries.push({
            filePath: fullPath,
            createdAtMs: getCreatedAtMs(fullPath),
          });
        } catch {
          // If file disappears during listing, ignore.
        }
      }
    } catch {
      continue;
    }
  }

  pngEntries.sort((a, b) => {
    if (a.createdAtMs !== b.createdAtMs) return a.createdAtMs - b.createdAtMs;
    return a.filePath.localeCompare(b.filePath);
  });

  return pngEntries.map((e) => e.filePath);
}


