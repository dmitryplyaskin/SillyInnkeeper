import { existsSync, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { basename, dirname, join, parse } from "node:path";

type PngFileEntry = {
  filePath: string;
  createdAtMs: number;
  profileHandle: string;
  avatarFile: string;
  avatarBase: string;
  stChatsFolderPath: string;
  stChatsCount: number;
  stLastChatAt: number;
  stFirstChatAt: number;
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

function getMtimeMsSafe(filePath: string): number {
  try {
    const st = statSync(filePath);
    const mtime = st.mtimeMs;
    return Number.isFinite(mtime) ? mtime : 0;
  } catch {
    return 0;
  }
}

function getBirthtimeOrMtimeMsSafe(filePath: string): number {
  try {
    const st = statSync(filePath);
    const birth = st.birthtimeMs;
    const mtime = st.mtimeMs;
    if (Number.isFinite(birth) && birth > 0) return birth;
    return Number.isFinite(mtime) ? mtime : 0;
  } catch {
    return 0;
  }
}

async function getChatsFolderStats(
  chatsFolderPath: string
): Promise<{ chatsCount: number; lastChatAt: number; firstChatAt: number }> {
  // Fast path: no folder => 0
  if (!existsSync(chatsFolderPath)) {
    return { chatsCount: 0, lastChatAt: 0, firstChatAt: 0 };
  }

  try {
    const files = await readdir(chatsFolderPath, { withFileTypes: true });
    let chatsCount = 0;
    let lastChatAt = 0;
    let firstChatAt = 0;

    for (const f of files) {
      if (!f.isFile()) continue;
      const name = f.name ?? "";
      if (typeof name !== "string") continue;
      if (!name.toLowerCase().endsWith(".jsonl")) continue;
      chatsCount += 1;
      const fullPath = join(chatsFolderPath, name);
      const mtime = getMtimeMsSafe(fullPath);
      if (mtime > lastChatAt) lastChatAt = mtime;

      const createdAt = getBirthtimeOrMtimeMsSafe(fullPath);
      if (createdAt > 0) {
        if (firstChatAt === 0 || createdAt < firstChatAt) firstChatAt = createdAt;
      }
    }

    return { chatsCount, lastChatAt, firstChatAt };
  } catch {
    return { chatsCount: 0, lastChatAt: 0, firstChatAt: 0 };
  }
}

export async function listSillyTavernProfileCharactersDirs(
  sillytavenrPath: string
): Promise<Array<{ profileHandle: string; charactersDir: string }>> {
  const root = String(sillytavenrPath ?? "").trim();
  if (!root) return [];
  const dataDir = join(root, "data");
  if (!existsSync(dataDir)) return [];

  try {
    const entries = await readdir(dataDir, { withFileTypes: true });
    const profileDirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((name) => typeof name === "string" && name.length > 0)
      .filter((name) => !name.startsWith("_"));

    return profileDirs
      .map((profileHandle) => ({
        profileHandle,
        charactersDir: join(dataDir, profileHandle, "characters"),
      }))
      .filter((e) => existsSync(e.charactersDir));
  } catch {
    return [];
  }
}

export async function listSillyTavernCharactersDirPngs(
  charactersDir: string
): Promise<PngFileEntry[]> {
  const dir = String(charactersDir ?? "").trim();
  if (!dir || !existsSync(dir)) return [];

  // Expected: .../data/<profile>/characters
  const profileHandle = basename(dirname(dir));
  const dataDir = dirname(dirname(dir)); // .../data

  const pngEntries: PngFileEntry[] = [];

  try {
    const files = await readdir(dir, { withFileTypes: true });
    for (const f of files) {
      if (!f.isFile()) continue;
      const name = f.name ?? "";
      if (typeof name !== "string") continue;
      if (!name.toLowerCase().endsWith(".png")) continue;
      const fullPath = join(dir, name);
      try {
        const p = parse(name);
        const avatarBase = p.name;
        const stChatsFolderPath = join(dataDir, profileHandle, "chats", avatarBase);
        const { chatsCount, lastChatAt, firstChatAt } = await getChatsFolderStats(
          stChatsFolderPath
        );
        pngEntries.push({
          filePath: fullPath,
          createdAtMs: getCreatedAtMs(fullPath),
          profileHandle,
          avatarFile: name,
          avatarBase,
          stChatsFolderPath,
          stChatsCount: chatsCount,
          stLastChatAt: lastChatAt,
          stFirstChatAt: firstChatAt,
        });
      } catch {
        // If file disappears during listing, ignore.
      }
    }
  } catch {
    return [];
  }

  pngEntries.sort((a, b) => {
    if (a.createdAtMs !== b.createdAtMs) return a.createdAtMs - b.createdAtMs;
    return a.filePath.localeCompare(b.filePath);
  });

  return pngEntries;
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
): Promise<PngFileEntry[]> {
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
      const profEntries = await listSillyTavernCharactersDirPngs(charactersDir);
      pngEntries.push(...profEntries);
    } catch {
      continue;
    }
  }

  pngEntries.sort((a, b) => {
    if (a.createdAtMs !== b.createdAtMs) return a.createdAtMs - b.createdAtMs;
    return a.filePath.localeCompare(b.filePath);
  });

  return pngEntries;
}
