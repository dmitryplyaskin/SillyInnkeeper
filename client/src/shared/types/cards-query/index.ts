export type TriState = "any" | "1" | "0";

export type CardsSort =
  | "created_at_desc"
  | "created_at_asc"
  | "name_asc"
  | "name_desc"
  | "prompt_tokens_desc"
  | "prompt_tokens_asc"
  | "st_chats_count_desc"
  | "st_chats_count_asc"
  | "st_last_chat_at_desc"
  | "st_last_chat_at_asc"
  | "st_first_chat_at_desc"
  | "st_first_chat_at_asc"
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
  is_sillytavern?: TriState;
  is_hidden?: TriState;
  fav?: TriState;
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
  patterns?: TriState;

  // SillyTavern chats filters (computed on backend from card_files)
  st_chats_count?: number;
  st_chats_count_op?: "eq" | "gte" | "lte";
  st_profile_handle?: string[];
  st_has_chats?: "1";
}
