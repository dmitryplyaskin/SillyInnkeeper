export interface CardListItem {
  id: string;
  name: string | null;
  tags: string[] | null;
  creator: string | null;
  avatar_url: string;
  file_path: string | null;
  spec_version: string | null;
  created_at: number;
  alternate_greetings_count: number;
  has_character_book: boolean;
  prompt_tokens_est: number;
}
