export type TriState = "any" | "1" | "0";

export type CardsSort =
  | "created_at_desc"
  | "created_at_asc"
  | "name_asc"
  | "name_desc"
  | "relevance";

export type CardsFtsField =
  | "description"
  | "personality"
  | "scenario"
  | "first_mes"
  | "mes_example"
  | "creator_notes"
  | "system_prompt"
  | "post_history_instructions"
  | "alternate_greetings"
  | "group_only_greetings";

export type CardsTextSearchMode = "like" | "fts";

export interface CardsQuery {
  sort?: CardsSort;
  name?: string;
  q?: string;
  q_mode?: CardsTextSearchMode;
  q_fields?: CardsFtsField[];
  creator?: string[];
  spec_version?: string[];
  tags?: string[];
  created_from_ms?: number;
  created_to_ms?: number;
  has_creator_notes?: TriState;
  has_system_prompt?: TriState;
  has_post_history_instructions?: TriState;
  has_personality?: TriState;
  has_scenario?: TriState;
  has_mes_example?: TriState;
  has_character_book?: TriState;
  has_alternate_greetings?: TriState;
  alternate_greetings_min?: number;
  prompt_tokens_min?: number;
  prompt_tokens_max?: number;
}
