/**
 * Типы для работы с карточками персонажей
 */

/**
 * Единообразный формат данных карточки для всех версий спецификаций
 */
export interface ExtractedCardData {
  // Основные поля (всегда присутствуют)
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  fav: boolean;

  // Поля V2/V3 (могут быть пустыми для V1)
  creator_notes: string;
  system_prompt: string;
  post_history_instructions: string;
  alternate_greetings: string[];
  tags: string[];
  creator: string;
  character_version: string;

  // Дополнительные поля V3
  group_only_greetings?: string[];
  nickname?: string;

  // Расширения и Character Book
  character_book?: unknown;
  extensions?: Record<string, any>;

  // Метаданные
  spec_version: "1.0" | "2.0" | "3.0";
  original_data: unknown; // Сохраняем оригинальные данные для экспорта
}

/**
 * Результат парсинга PNG файла
 */
export interface ParsedCardData {
  data: unknown;
  spec_version: "1.0" | "2.0" | "3.0" | "UNKNOWN";
  chunk_type: "ccv3" | "chara" | null; // тип найденного чанка
}
