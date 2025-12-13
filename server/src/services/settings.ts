import { accessSync, constants } from "node:fs";
import { readFile, writeFile, ensureDir } from "fs-extra";
import { join } from "node:path";

export type Language = "ru" | "en";

export interface Settings {
  cardsFolderPath: string | null;
  sillytavenrPath: string | null;
  language: Language;
}

const SETTINGS_FILE_PATH = join(process.cwd(), "data", "settings.json");

const DEFAULT_SETTINGS: Settings = {
  cardsFolderPath: null,
  sillytavenrPath: null,
  language: "ru",
};

/**
 * Проверяет существование пути через fs.accessSync
 * @param path Путь для проверки
 * @throws Error если путь не существует
 */
export function validatePath(path: string): void {
  try {
    accessSync(path, constants.F_OK);
  } catch (error) {
    throw new Error(`Путь не существует: ${path}`);
  }
}

export function validateLanguage(
  language: unknown
): asserts language is Language {
  if (language !== "ru" && language !== "en") {
    throw new Error(`Неверный язык: ${String(language)}`);
  }
}

/**
 * Читает настройки из файла. Если файл не существует, создает его с дефолтными значениями.
 * @returns Текущие настройки
 */
export async function getSettings(): Promise<Settings> {
  try {
    const data = await readFile(SETTINGS_FILE_PATH, "utf-8");
    const parsed = JSON.parse(data) as Partial<Settings>;
    const merged: Settings = { ...DEFAULT_SETTINGS, ...parsed };

    // If language value in file is invalid, fall back to default.
    try {
      validateLanguage(merged.language);
      return merged;
    } catch {
      return { ...merged, language: DEFAULT_SETTINGS.language };
    }
  } catch (error) {
    // Если файл не существует, создаем его с дефолтными значениями
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await ensureDir(join(process.cwd(), "data"));
      await writeFile(
        SETTINGS_FILE_PATH,
        JSON.stringify(DEFAULT_SETTINGS, null, 2),
        "utf-8"
      );
      return DEFAULT_SETTINGS;
    }
    throw error;
  }
}

/**
 * Обновляет настройки с валидацией путей
 * @param newSettings Новые настройки
 * @throws Error если какой-то из путей не существует
 */
export async function updateSettings(newSettings: Settings): Promise<Settings> {
  const normalized: Settings = {
    ...DEFAULT_SETTINGS,
    ...(newSettings as Partial<Settings>),
  };

  validateLanguage(normalized.language);

  // Валидация путей: если путь указан (не null), проверяем его существование
  if (normalized.cardsFolderPath !== null) {
    validatePath(normalized.cardsFolderPath);
  }

  if (normalized.sillytavenrPath !== null) {
    validatePath(normalized.sillytavenrPath);
  }

  // Убеждаемся, что папка data существует
  await ensureDir(join(process.cwd(), "data"));

  // Сохраняем настройки
  await writeFile(
    SETTINGS_FILE_PATH,
    JSON.stringify(normalized, null, 2),
    "utf-8"
  );

  return normalized;
}
