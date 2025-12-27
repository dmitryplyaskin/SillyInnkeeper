import { readFile, writeFile, ensureDir } from "fs-extra";
import { join } from "node:path";
import { statSync } from "node:fs";
import { AppError } from "../errors/app-error";
import { validatePath } from "./settings";

export type ImportMode = "copy" | "move";
export type DuplicatesMode = "skip" | "copy";

export interface ImportSettings {
  sourceFolderPath: string | null;
  importMode: ImportMode;
  duplicatesMode: DuplicatesMode;
}

const IMPORT_SETTINGS_FILE_PATH = join(
  process.cwd(),
  "data",
  "import-settings.json"
);

const DEFAULT_IMPORT_SETTINGS: ImportSettings = {
  sourceFolderPath: null,
  importMode: "copy",
  duplicatesMode: "skip",
};

function validateImportMode(mode: unknown): asserts mode is ImportMode {
  if (mode !== "copy" && mode !== "move") {
    throw new AppError({
      status: 400,
      code: "api.importSettings.invalid_import_mode",
      params: { importMode: String(mode) },
    });
  }
}

function validateDuplicatesMode(mode: unknown): asserts mode is DuplicatesMode {
  if (mode !== "skip" && mode !== "copy") {
    throw new AppError({
      status: 400,
      code: "api.importSettings.invalid_duplicates_mode",
      params: { duplicatesMode: String(mode) },
    });
  }
}

function validateDirectoryPath(path: string): void {
  validatePath(path);
  const st = statSync(path);
  if (!st.isDirectory()) {
    throw new AppError({
      status: 400,
      code: "api.importSettings.not_a_directory",
      params: { path },
    });
  }
}

export async function getImportSettings(): Promise<ImportSettings> {
  try {
    const data = await readFile(IMPORT_SETTINGS_FILE_PATH, "utf-8");
    const parsed = JSON.parse(data) as Partial<ImportSettings>;
    const merged: ImportSettings = { ...DEFAULT_IMPORT_SETTINGS, ...parsed };

    // Validate enums (and fall back if invalid)
    try {
      validateImportMode(merged.importMode);
    } catch {
      merged.importMode = DEFAULT_IMPORT_SETTINGS.importMode;
    }
    try {
      validateDuplicatesMode(merged.duplicatesMode);
    } catch {
      merged.duplicatesMode = DEFAULT_IMPORT_SETTINGS.duplicatesMode;
    }

    // Keep sourceFolderPath as-is; validate on update.
    return merged;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await ensureDir(join(process.cwd(), "data"));
      await writeFile(
        IMPORT_SETTINGS_FILE_PATH,
        JSON.stringify(DEFAULT_IMPORT_SETTINGS, null, 2),
        "utf-8"
      );
      return DEFAULT_IMPORT_SETTINGS;
    }
    throw error;
  }
}

export async function updateImportSettings(
  newSettings: ImportSettings
): Promise<ImportSettings> {
  const normalized: ImportSettings = {
    ...DEFAULT_IMPORT_SETTINGS,
    ...(newSettings as Partial<ImportSettings>),
  };

  validateImportMode(normalized.importMode);
  validateDuplicatesMode(normalized.duplicatesMode);

  if (normalized.sourceFolderPath !== null) {
    const p = String(normalized.sourceFolderPath).trim();
    if (!p) {
      normalized.sourceFolderPath = null;
    } else {
      validateDirectoryPath(p);
      normalized.sourceFolderPath = p;
    }
  }

  await ensureDir(join(process.cwd(), "data"));
  await writeFile(
    IMPORT_SETTINGS_FILE_PATH,
    JSON.stringify(normalized, null, 2),
    "utf-8"
  );

  return normalized;
}


