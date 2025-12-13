import type { Tag } from "@/shared/types/tags";
import i18n from "@/shared/i18n/i18n";

export async function getTags(): Promise<Tag[]> {
  const response = await fetch("/api/tags");

  if (!response.ok) {
    const errorText = (await response.text().catch(() => "")).trim();
    if (errorText) throw new Error(errorText);
    throw new Error(`${i18n.t("errors.loadTags")}: ${response.statusText}`);
  }

  return response.json();
}
