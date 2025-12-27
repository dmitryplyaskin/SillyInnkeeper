import i18n from "@/shared/i18n/i18n";
import type { DuplicatesMode, ImportMode } from "@/shared/types/import-settings";

async function readErrorText(response: Response): Promise<string> {
  try {
    const data = (await response.json().catch(() => null)) as any;
    if (data && typeof data === "object") {
      if (typeof data.error === "string" && data.error.trim()) return data.error;
      if (typeof data.message === "string" && data.message.trim())
        return data.message;
    }
  } catch {
    // ignore
  }
  return (await response.text().catch(() => "")).trim();
}

export type StartCardsImportParams = {
  sourceFolderPath: string;
  importMode: ImportMode;
  duplicatesMode: DuplicatesMode;
};

export async function startCardsImport(
  params: StartCardsImportParams
): Promise<{ ok: true; started: true }> {
  const response = await fetch("/api/cards/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorText = await readErrorText(response);
    if (errorText) throw new Error(errorText);
    throw new Error(`${i18n.t("errors.generic")}: ${response.statusText}`);
  }

  return response.json();
}


