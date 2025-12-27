import i18n from "@/shared/i18n/i18n";
import type { ImportSettings } from "@/shared/types/import-settings";

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

export async function getImportSettings(): Promise<ImportSettings> {
  const response = await fetch("/api/import-settings");
  if (!response.ok) {
    const errorText = await readErrorText(response);
    if (errorText) throw new Error(errorText);
    throw new Error(`${i18n.t("errors.generic")}: ${response.statusText}`);
  }
  return response.json();
}

export async function updateImportSettings(
  settings: ImportSettings
): Promise<ImportSettings> {
  const response = await fetch("/api/import-settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!response.ok) {
    const errorText = await readErrorText(response);
    if (errorText) throw new Error(errorText);
    throw new Error(`${i18n.t("errors.generic")}: ${response.statusText}`);
  }
  return response.json();
}


