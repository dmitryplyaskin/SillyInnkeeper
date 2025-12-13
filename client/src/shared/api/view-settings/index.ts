export type ColumnsCount = 3 | 5 | 7;

export interface ViewSettings {
  columnsCount: ColumnsCount;
  isCensored: boolean;
}

import i18n from "@/shared/i18n/i18n";

export async function getViewSettings(): Promise<ViewSettings> {
  const response = await fetch("/api/view-settings");

  if (!response.ok) {
    const errorText = (await response.text().catch(() => "")).trim();
    if (errorText) throw new Error(errorText);
    throw new Error(
      `${i18n.t("errors.loadViewSettings")}: ${response.statusText}`
    );
  }

  return response.json();
}

export async function updateViewSettings(
  settings: ViewSettings
): Promise<ViewSettings> {
  const response = await fetch("/api/view-settings", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const errorText = (await response.text().catch(() => "")).trim();
    if (errorText) throw new Error(errorText);
    throw new Error(
      `${i18n.t("errors.saveViewSettings")}: ${response.statusText}`
    );
  }

  return response.json();
}
