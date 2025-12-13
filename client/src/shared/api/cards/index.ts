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
