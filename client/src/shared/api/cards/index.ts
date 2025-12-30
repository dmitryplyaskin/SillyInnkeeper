import type { CardDetails, CardListItem } from "@/shared/types/cards";
import type { CardsQuery } from "@/shared/types/cards-query";
import type { CardsFiltersResponse } from "@/shared/types/cards-filters";
import i18n from "@/shared/i18n/i18n";

function appendMany(
  params: URLSearchParams,
  key: string,
  values: string[] | undefined
) {
  if (!values || values.length === 0) return;
  for (const v of values) {
    const trimmed = v.trim();
    if (trimmed.length > 0) params.append(key, trimmed);
  }
}

export async function getCards(query?: CardsQuery): Promise<CardListItem[]> {
  const params = new URLSearchParams();

  if (query?.sort) params.set("sort", query.sort);
  if (query?.name && query.name.trim().length > 0)
    params.set("name", query.name.trim());
  if (query?.q && query.q.trim().length > 0) params.set("q", query.q.trim());
  if (query?.q_mode) params.set("q_mode", query.q_mode);
  appendMany(params, "q_fields", query?.q_fields);

  appendMany(params, "creator", query?.creator);
  appendMany(params, "spec_version", query?.spec_version);
  appendMany(params, "tags", query?.tags);

  if (typeof query?.created_from_ms === "number")
    params.set("created_from_ms", String(query.created_from_ms));
  if (typeof query?.created_to_ms === "number")
    params.set("created_to_ms", String(query.created_to_ms));

  if (query?.has_creator_notes)
    params.set("has_creator_notes", query.has_creator_notes);
  if (query?.has_system_prompt)
    params.set("has_system_prompt", query.has_system_prompt);
  if (query?.has_post_history_instructions)
    params.set(
      "has_post_history_instructions",
      query.has_post_history_instructions
    );
  if (query?.has_personality)
    params.set("has_personality", query.has_personality);
  if (query?.has_scenario) params.set("has_scenario", query.has_scenario);
  if (query?.has_mes_example)
    params.set("has_mes_example", query.has_mes_example);
  if (query?.has_character_book)
    params.set("has_character_book", query.has_character_book);
  if (query?.has_alternate_greetings)
    params.set("has_alternate_greetings", query.has_alternate_greetings);

  if (query?.is_sillytavern) params.set("is_sillytavern", query.is_sillytavern);
  if (query?.is_hidden) params.set("is_hidden", query.is_hidden);
  if (query?.fav) params.set("fav", query.fav);

  if (query?.patterns) params.set("patterns", query.patterns);

  if (typeof query?.alternate_greetings_min === "number")
    params.set(
      "alternate_greetings_min",
      String(query.alternate_greetings_min)
    );

  if (
    typeof query?.prompt_tokens_min === "number" &&
    query.prompt_tokens_min > 0
  )
    params.set("prompt_tokens_min", String(query.prompt_tokens_min));
  if (
    typeof query?.prompt_tokens_max === "number" &&
    query.prompt_tokens_max > 0
  )
    params.set("prompt_tokens_max", String(query.prompt_tokens_max));

  const url =
    params.toString().length > 0
      ? `/api/cards?${params.toString()}`
      : "/api/cards";

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = (await response.text().catch(() => "")).trim();
    if (errorText) throw new Error(errorText);
    throw new Error(`${i18n.t("errors.loadCards")}: ${response.statusText}`);
  }

  return response.json();
}

export async function setCardHidden(
  cardId: string,
  isHidden: boolean
): Promise<{ ok: true; card_id: string; is_hidden: boolean }> {
  const response = await fetch(`/api/cards/${encodeURIComponent(cardId)}/hidden`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_hidden: isHidden }),
  });

  if (!response.ok) {
    const errorText = (await response.text().catch(() => "")).trim();
    if (errorText) throw new Error(errorText);
    throw new Error(response.statusText);
  }

  return response.json();
}

export async function setCardsHiddenBulk(
  cardIds: string[],
  isHidden: boolean
): Promise<{ ok: true; updated: number; updated_ids: string[] }> {
  const response = await fetch(`/api/cards/bulk-hidden`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ card_ids: cardIds, is_hidden: isHidden }),
  });

  if (!response.ok) {
    const errorText = (await response.text().catch(() => "")).trim();
    if (errorText) throw new Error(errorText);
    throw new Error(response.statusText);
  }

  return response.json();
}

export async function getCardsFilters(): Promise<CardsFiltersResponse> {
  const response = await fetch("/api/cards/filters");

  if (!response.ok) {
    const errorText = (await response.text().catch(() => "")).trim();
    if (errorText) throw new Error(errorText);
    throw new Error(
      `${i18n.t("errors.loadFiltersTitle")}: ${response.statusText}`
    );
  }

  return response.json();
}

export async function getCardDetails(id: string): Promise<CardDetails> {
  const response = await fetch(`/api/cards/${encodeURIComponent(id)}`);

  if (!response.ok) {
    const errorText = (await response.text().catch(() => "")).trim();
    if (errorText) throw new Error(errorText);
    throw new Error(`${i18n.t("errors.loadCard")}: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteCardFileDuplicate(
  cardId: string,
  filePath: string
): Promise<{ ok: true }> {
  const response = await fetch(
    `/api/cards/${encodeURIComponent(cardId)}/files`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_path: filePath }),
    }
  );

  if (!response.ok) {
    const errorText = (await response.text().catch(() => "")).trim();
    if (errorText) throw new Error(errorText);
    throw new Error(response.statusText);
  }

  return response.json();
}

export async function deleteCard(cardId: string): Promise<{ ok: true }> {
  const response = await fetch(`/api/cards/${encodeURIComponent(cardId)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorText = (await response.text().catch(() => "")).trim();
    if (errorText) throw new Error(errorText);
    throw new Error(response.statusText);
  }

  return response.json();
}

export async function deleteCardsBulk(cardIds: string[]): Promise<{
  ok: true;
  deleted: number;
  deleted_ids: string[];
}> {
  const response = await fetch(`/api/cards/bulk-delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ card_ids: cardIds }),
  });

  if (!response.ok) {
    const errorText = (await response.text().catch(() => "")).trim();
    if (errorText) throw new Error(errorText);
    throw new Error(response.statusText);
  }

  return response.json();
}

export async function setCardMainFile(
  cardId: string,
  filePath: string | null
): Promise<{ ok: true }> {
  const response = await fetch(
    `/api/cards/${encodeURIComponent(cardId)}/main-file`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_path: filePath }),
    }
  );

  if (!response.ok) {
    const errorText = (await response.text().catch(() => "")).trim();
    if (errorText) throw new Error(errorText);
    throw new Error(response.statusText);
  }

  return response.json();
}

export async function renameCardMainFile(
  cardId: string,
  filename: string
): Promise<{ ok: true; file_path?: string }> {
  const response = await fetch(
    `/api/cards/${encodeURIComponent(cardId)}/rename-main-file`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename }),
    }
  );

  if (!response.ok) {
    const errorText = (await response.text().catch(() => "")).trim();
    if (errorText) throw new Error(errorText);
    throw new Error(response.statusText);
  }

  return response.json();
}

export type SaveCardMode =
  | "overwrite_main"
  | "overwrite_all_files"
  | "save_new"
  | "save_new_delete_old_main";

export async function saveCard(opts: {
  cardId: string;
  mode: SaveCardMode;
  card_json: unknown;
}): Promise<{ ok: true; changed: boolean; card_id: string }> {
  const response = await fetch(
    `/api/cards/${encodeURIComponent(opts.cardId)}/save`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: opts.mode,
        card_json: opts.card_json,
      }),
    }
  );

  if (!response.ok) {
    const errorText = (await response.text().catch(() => "")).trim();
    if (errorText) throw new Error(errorText);
    throw new Error(`${i18n.t("errors.saveFailed")}: ${response.statusText}`);
  }

  return response.json();
}
