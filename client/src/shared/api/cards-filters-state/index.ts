import i18n from "@/shared/i18n/i18n";
import type { CardsFiltersState } from "@/shared/types/cards-filters-state";

async function readErrorText(response: Response): Promise<string> {
  try {
    const data = (await response.json().catch(() => null)) as any;
    if (data && typeof data === "object") {
      if (typeof data.error === "string" && data.error.trim())
        return data.error;
      if (typeof data.message === "string" && data.message.trim())
        return data.message;
    }
  } catch {
    // ignore
  }
  return (await response.text().catch(() => "")).trim();
}

export async function getCardsFiltersState(): Promise<CardsFiltersState> {
  const response = await fetch("/api/cards-filters-state");
  if (!response.ok) {
    const errorText = await readErrorText(response);
    if (errorText) throw new Error(errorText);
    throw new Error(
      `${i18n.t("errors.loadFiltersStateTitle")}: ${response.statusText}`
    );
  }
  return response.json();
}

export async function updateCardsFiltersState(
  state: CardsFiltersState
): Promise<CardsFiltersState> {
  const response = await fetch("/api/cards-filters-state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
  if (!response.ok) {
    const errorText = await readErrorText(response);
    if (errorText) throw new Error(errorText);
    throw new Error(
      `${i18n.t("errors.saveFiltersStateTitle")}: ${response.statusText}`
    );
  }
  return response.json();
}


