import type { Settings } from "@/shared/types/settings";
import i18n from "@/shared/i18n/i18n";

export async function getSettings(): Promise<Settings> {
  const response = await fetch("/api/settings");

  if (!response.ok) {
    const errorText = (await response.text().catch(() => "")).trim();
    if (errorText) throw new Error(errorText);
    throw new Error(
      `${i18n.t("errors.loadSettingsTitle")}: ${response.statusText}`
    );
  }

  return response.json();
}

export async function updateSettings(settings: Settings): Promise<Settings> {
  const response = await fetch("/api/settings", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const errorText = (await response.text().catch(() => "")).trim();
    if (errorText) throw new Error(errorText);
    throw new Error(`${i18n.t("errors.saveSettings")}: ${response.statusText}`);
  }

  return response.json();
}
