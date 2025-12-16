import type {
  LorebookDetails,
  LorebookSummary,
} from "@/shared/types/lorebooks";
import i18n from "@/shared/i18n/i18n";

export interface GetLorebooksParams {
  limit?: number;
  offset?: number;
  name?: string;
  card_id?: string;
}

export async function getLorebooks(
  params?: GetLorebooksParams
): Promise<LorebookSummary[]> {
  const search = new URLSearchParams();

  if (params) {
    if (typeof params.limit === "number")
      search.set("limit", String(params.limit));
    if (typeof params.offset === "number")
      search.set("offset", String(params.offset));
    if (params.name && params.name.trim().length > 0)
      search.set("name", params.name.trim());
    if (params.card_id && params.card_id.trim().length > 0)
      search.set("card_id", params.card_id.trim());
  }

  const qs = search.toString();
  const url = qs.length > 0 ? `/api/lorebooks?${qs}` : "/api/lorebooks";

  const response = await fetch(url);
  if (!response.ok) {
    const errorText = (await response.text().catch(() => "")).trim();
    if (errorText) throw new Error(errorText);
    throw new Error(
      `${i18n.t("errors.loadLorebooks", "Failed to load lorebooks")}: ${
        response.statusText
      }`
    );
  }

  return response.json();
}

export async function getLorebook(id: string): Promise<LorebookDetails> {
  const response = await fetch(`/api/lorebooks/${encodeURIComponent(id)}`);

  if (!response.ok) {
    const errorText = (await response.text().catch(() => "")).trim();
    if (errorText) throw new Error(errorText);
    throw new Error(
      `${i18n.t("errors.loadLorebook", "Failed to load lorebook")}: ${
        response.statusText
      }`
    );
  }

  return response.json();
}

export async function createLorebook(opts: {
  data: unknown;
}): Promise<LorebookDetails & { is_duplicate?: boolean }> {
  const response = await fetch("/api/lorebooks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: opts.data }),
  });

  if (!response.ok) {
    const errorText = (await response.text().catch(() => "")).trim();
    if (errorText) throw new Error(errorText);
    throw new Error(
      `${i18n.t("errors.saveLorebook", "Failed to save lorebook")}: ${
        response.statusText
      }`
    );
  }

  return response.json();
}

export async function updateLorebook(opts: {
  id: string;
  data: unknown;
}): Promise<LorebookDetails> {
  const response = await fetch(
    `/api/lorebooks/${encodeURIComponent(opts.id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: opts.data }),
    }
  );

  if (!response.ok) {
    const errorText = (await response.text().catch(() => "")).trim();
    if (errorText) throw new Error(errorText);
    throw new Error(
      `${i18n.t("errors.saveLorebook", "Failed to save lorebook")}: ${
        response.statusText
      }`
    );
  }

  return response.json();
}

export async function deleteLorebook(opts: {
  id: string;
  force?: boolean;
}): Promise<{ ok: true }> {
  const search = new URLSearchParams();
  if (opts.force) search.set("force", "1");

  const url =
    search.toString().length > 0
      ? `/api/lorebooks/${encodeURIComponent(opts.id)}?${search.toString()}`
      : `/api/lorebooks/${encodeURIComponent(opts.id)}`;

  const response = await fetch(url, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorText = (await response.text().catch(() => "")).trim();
    if (errorText) throw new Error(errorText);
    throw new Error(
      `${i18n.t("errors.deleteLorebook", "Failed to delete lorebook")}: ${
        response.statusText
      }`
    );
  }

  return response.json();
}
