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

export async function startBulkEditTags(payload: {
  action: "replace" | "delete";
  from: string[];
  to?:
    | { kind: "existing"; rawName: string }
    | { kind: "new"; name: string };
  apply_to_library: boolean;
  apply_to_st: boolean;
  st_profile_handles?: string[];
}): Promise<{ run_id: string }> {
  const response = await fetch("/api/tags/bulk-edit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = (await response.text().catch(() => "")).trim();
    if (errorText) throw new Error(errorText);
    throw new Error(`${i18n.t("errors.generic")}: ${response.statusText}`);
  }

  return response.json();
}
