export interface CardListItem {
  id: string;
  name: string | null;
  tags: string[] | null;
  creator: string | null;
  fav: boolean;
  avatar_url: string;
  file_path: string | null;
  spec_version: string | null;
  created_at: number;
  is_sillytavern: boolean;
  alternate_greetings_count: number;
  has_character_book: boolean;
  prompt_tokens_est: number;
  innkeeperMeta?: { isHidden: boolean };
}

export interface CardDetails {
  id: string;
  name: string | null;
  creator: string | null;
  tags: string[] | null;
  spec_version: string | null;
  created_at: number;
  is_sillytavern: boolean;
  fav: boolean;
  file_path: string | null;
  file_paths?: string[];
  duplicates?: string[];
  primary_file_path?: string | null;
  avatar_url: string;
  innkeeperMeta?: { isHidden: boolean };

  description: string | null;
  personality: string | null;
  scenario: string | null;
  first_mes: string | null;
  mes_example: string | null;
  creator_notes: string | null;
  system_prompt: string | null;
  post_history_instructions: string | null;

  prompt_tokens_est: number;
  alternate_greetings_count: number;

  has_creator_notes: boolean;
  has_system_prompt: boolean;
  has_post_history_instructions: boolean;
  has_personality: boolean;
  has_scenario: boolean;
  has_mes_example: boolean;
  has_character_book: boolean;

  alternate_greetings: string[];
  group_only_greetings?: string[];

  /**
   * Доп. метаданные по файлам карточки (в т.ч. SillyTavern profile-specific).
   * Заполняется сервером в GET /api/cards/:id
   */
  files_meta?: Array<{
    file_path: string;
    file_birthtime: number;
    st_profile_handle: string | null;
    st_avatar_file: string | null;
    st_avatar_base: string | null;
    st_chats_folder_path: string | null;
    st_chats_count: number;
    st_last_chat_at: number;
  }>;

  data_json: unknown | null;
}
