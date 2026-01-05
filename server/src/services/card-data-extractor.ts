import { ExtractedCardData } from "./types";

/**
 * Экстрактор данных карточек персонажей
 * Извлекает данные из разных версий спецификаций в единообразный формат
 */
export class CardDataExtractor {
  /**
   * Извлекает данные из карточки в единообразный формат
   * @param cardData - Распарсенные данные карточки
   * @param specVersion - Версия спецификации (1, 2, 3)
   * @returns Извлеченные данные в единообразном формате
   */
  extract(cardData: unknown, specVersion: 1 | 2 | 3): ExtractedCardData {
    switch (specVersion) {
      case 1:
        return this.extractV1(cardData);
      case 2:
        return this.extractV2(cardData);
      case 3:
        return this.extractV3(cardData);
      default:
        throw new Error(`Unsupported spec version: ${specVersion}`);
    }
  }

  /**
   * Извлечение данных из V1
   * V1 имеет плоскую структуру без вложенного объекта data
   */
  private extractV1(cardData: any): ExtractedCardData {
    if (!cardData || typeof cardData !== "object") {
      throw new Error("Invalid V1 card data");
    }

    // Извлекаем основные поля напрямую из корня объекта
    const result: ExtractedCardData = {
      // Основные поля
      name: this.getString(cardData.name, ""),
      description: this.getString(cardData.description, ""),
      personality: this.getString(cardData.personality, ""),
      scenario: this.getString(cardData.scenario, ""),
      first_mes: this.getString(cardData.first_mes, ""),
      mes_example: this.getString(cardData.mes_example, ""),
      fav: typeof cardData.fav === "boolean" ? cardData.fav : false,

      // Поля V2/V3 (устанавливаем значения по умолчанию для V1)
      creator_notes: this.getString(
        cardData.creator_notes || cardData.creatorcomment,
        ""
      ),
      system_prompt: "",
      post_history_instructions: "",
      alternate_greetings: this.getArray(cardData.alternate_greetings, []),
      tags: this.getTags(cardData.tags),
      creator: this.getString(cardData.creator, ""),
      character_version: this.getString(cardData.character_version, ""),

      // Метаданные
      spec_version: "1.0",
      original_data: cardData,
    };

    // Обработка extensions (если есть в V1)
    if (cardData.extensions && typeof cardData.extensions === "object") {
      result.extensions = cardData.extensions;
    }

    return result;
  }

  /**
   * Извлечение данных из V2
   * V2 имеет структуру с объектом data
   */
  private extractV2(cardData: any): ExtractedCardData {
    if (!cardData || typeof cardData !== "object") {
      throw new Error("Invalid V2 card data");
    }

    const data = cardData.data;
    if (!data || typeof data !== "object") {
      throw new Error("V2 card data.data is required");
    }

    const result: ExtractedCardData = {
      // Основные поля из data
      name: this.getString(data.name, ""),
      description: this.getString(data.description, ""),
      personality: this.getString(data.personality, ""),
      scenario: this.getString(data.scenario, ""),
      first_mes: this.getString(data.first_mes, ""),
      mes_example: this.getString(data.mes_example, ""),
      fav: typeof cardData.fav === "boolean" ? cardData.fav : false,

      // Поля V2
      creator_notes: this.getString(data.creator_notes, ""),
      system_prompt: this.getString(data.system_prompt, ""),
      post_history_instructions: this.getString(
        data.post_history_instructions,
        ""
      ),
      alternate_greetings: this.getArray(data.alternate_greetings, []),
      tags: this.getArray(data.tags, []),
      creator: this.getString(data.creator, ""),
      character_version: this.getString(data.character_version, ""),

      // Расширения и Character Book
      extensions:
        data.extensions && typeof data.extensions === "object"
          ? data.extensions
          : undefined,
      character_book: data.character_book,

      // Метаданные
      spec_version: "2.0",
      original_data: cardData,
    };

    return result;
  }

  /**
   * Извлечение данных из V3
   * V3 имеет более гибкую структуру, аналогичную V2, но с дополнительными полями
   */
  private extractV3(cardData: any): ExtractedCardData {
    if (!cardData || typeof cardData !== "object") {
      throw new Error("Invalid V3 card data");
    }

    const data = cardData.data;
    if (!data || typeof data !== "object") {
      throw new Error("V3 card data.data is required");
    }

    // Обработка creator_notes_multilingual (используем en или fallback на creator_notes)
    let creatorNotes = this.getString(data.creator_notes, "");
    if (
      data.creator_notes_multilingual &&
      typeof data.creator_notes_multilingual === "object"
    ) {
      const multilingual = data.creator_notes_multilingual;
      if (multilingual.en && typeof multilingual.en === "string") {
        creatorNotes = multilingual.en;
      } else if (
        multilingual.creator_notes &&
        typeof multilingual.creator_notes === "string"
      ) {
        creatorNotes = multilingual.creator_notes;
      }
    }

    const result: ExtractedCardData = {
      // Основные поля из data
      name: this.getString(data.name, ""),
      description: this.getString(data.description, ""),
      personality: this.getString(data.personality, ""),
      scenario: this.getString(data.scenario, ""),
      first_mes: this.getString(data.first_mes, ""),
      mes_example: this.getString(data.mes_example, ""),
      fav: typeof cardData.fav === "boolean" ? cardData.fav : false,

      // Поля V2/V3
      creator_notes: creatorNotes,
      system_prompt: this.getString(data.system_prompt, ""),
      post_history_instructions: this.getString(
        data.post_history_instructions,
        ""
      ),
      alternate_greetings: this.getArray(data.alternate_greetings, []),
      tags: this.getArray(data.tags, []),
      creator: this.getString(data.creator, ""),
      character_version: this.getString(data.character_version, ""),

      // Дополнительные поля V3
      group_only_greetings: this.getArray(data.group_only_greetings, undefined),
      nickname: this.getString(data.nickname, undefined),

      // Расширения и Character Book
      extensions:
        data.extensions && typeof data.extensions === "object"
          ? data.extensions
          : undefined,
      character_book: data.character_book,

      // Метаданные
      spec_version: "3.0",
      original_data: cardData,
    };

    return result;
  }

  /**
   * Вспомогательный метод для безопасного получения строки
   */
  private getString(value: unknown, defaultValue: string | undefined): string {
    if (value === null || value === undefined) {
      return defaultValue ?? "";
    }
    if (typeof value === "string") {
      return value;
    }
    return String(value);
  }

  /**
   * Вспомогательный метод для безопасного получения массива
   */
  private getArray(
    value: unknown,
    defaultValue: string[] | undefined
  ): string[] {
    if (value === null || value === undefined) {
      return defaultValue ?? [];
    }
    if (Array.isArray(value)) {
      return value.map((item) => String(item));
    }
    if (typeof value === "string") {
      // Если tags приходит как строка (разделенная запятыми)
      return value
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
    }
    return defaultValue ?? [];
  }

  /**
   * Вспомогательный метод для обработки tags
   * Может быть строкой, массивом строк или массивом других типов
   */
  private getTags(value: unknown): string[] {
    if (value === null || value === undefined) {
      return [];
    }
    if (Array.isArray(value)) {
      return value.map((item) => String(item));
    }
    if (typeof value === "string") {
      // Если tags приходит как строка (разделенная запятыми)
      return value
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
    }
    return [];
  }
}
