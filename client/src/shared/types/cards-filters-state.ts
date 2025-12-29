import type {
  CardsFtsField,
  CardsSort,
  CardsTextSearchMode,
  TriState,
} from "@/shared/types/cards-query";

export interface CardsFiltersState {
  sort: CardsSort;
  name: string;
  q: string;
  q_mode: CardsTextSearchMode;
  q_fields: CardsFtsField[];
  creator: string[];
  spec_version: string[];
  tags: string[];
  created_from?: string; // YYYY-MM-DD
  created_to?: string; // YYYY-MM-DD
  prompt_tokens_min: number;
  prompt_tokens_max: number;
  is_sillytavern: TriState;
  has_creator_notes: TriState;
  has_system_prompt: TriState;
  has_post_history_instructions: TriState;
  has_personality: TriState;
  has_scenario: TriState;
  has_mes_example: TriState;
  has_character_book: TriState;
  has_alternate_greetings: TriState;
  alternate_greetings_min: number;
  patterns: TriState;
}


