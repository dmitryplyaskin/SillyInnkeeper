/**
 * Валидатор карточек персонажей
 * Определяет версию спецификации карточки и валидирует её структуру
 */

export class CardValidator {
  private card: unknown;
  private lastValidationError: string | null = null;

  constructor(card: unknown) {
    this.card = card;
  }

  /**
   * Определяет версию спецификации карточки
   * Проверка происходит в порядке: V3 → V2 → V1
   * @returns номер версии (1, 2, 3) или false если не соответствует ни одной
   */
  validate(): 1 | 2 | 3 | false {
    this.lastValidationError = null;

    // Проверяем в порядке приоритета: V3 → V2 → V1
    if (this.validateV3()) {
      return 3;
    }
    if (this.validateV2()) {
      return 2;
    }
    if (this.validateV1()) {
      return 1;
    }

    return false;
  }

  /**
   * Получить последнюю ошибку валидации
   */
  getLastError(): string | null {
    return this.lastValidationError;
  }

  /**
   * Валидация V1
   * Проверяет наличие обязательных полей на верхнем уровне объекта
   */
  private validateV1(): boolean {
    if (!this.card || typeof this.card !== "object") {
      this.lastValidationError = "Card is not an object";
      return false;
    }

    const card = this.card as Record<string, unknown>;

    // Обязательные поля V1 на верхнем уровне
    const requiredFields = [
      "name",
      "description",
      "personality",
      "scenario",
      "first_mes",
      "mes_example",
    ];

    for (const field of requiredFields) {
      if (!Object.prototype.hasOwnProperty.call(card, field)) {
        this.lastValidationError = `Missing required field: ${field}`;
        return false;
      }

      // Поля должны быть строками (могут быть пустыми)
      if (typeof card[field] !== "string") {
        this.lastValidationError = `Field ${field} must be a string`;
        return false;
      }
    }

    return true;
  }

  /**
   * Валидация V2
   * Проверяет структуру спецификации V2
   */
  private validateV2(): boolean {
    if (!this.card || typeof this.card !== "object") {
      this.lastValidationError = "Card is not an object";
      return false;
    }

    const card = this.card as Record<string, unknown>;

    // Проверка spec
    if (card.spec !== "chara_card_v2") {
      this.lastValidationError = "spec must be 'chara_card_v2'";
      return false;
    }

    // Проверка spec_version
    if (card.spec_version !== "2.0") {
      this.lastValidationError = "spec_version must be '2.0'";
      return false;
    }

    // Проверка наличия объекта data
    if (!card.data || typeof card.data !== "object") {
      this.lastValidationError = "data object is required";
      return false;
    }

    const data = card.data as Record<string, unknown>;

    // Обязательные поля в data (минимальный набор для валидной карточки)
    const requiredFields = ["name", "description", "first_mes"];

    for (const field of requiredFields) {
      if (!Object.prototype.hasOwnProperty.call(data, field)) {
        this.lastValidationError = `Missing required field in data: ${field}`;
        return false;
      }
    }

    // Проверка типов обязательных полей
    if (typeof data.name !== "string") {
      this.lastValidationError = "data.name must be a string";
      return false;
    }

    if (typeof data.description !== "string") {
      this.lastValidationError = "data.description must be a string";
      return false;
    }

    if (typeof data.first_mes !== "string") {
      this.lastValidationError = "data.first_mes must be a string";
      return false;
    }


    if (data.mes_example !== undefined && typeof data.mes_example !== "string") {
      this.lastValidationError = "data.mes_example must be a string if present";
      return false;
    }

    if (data.alternate_greetings !== undefined && !Array.isArray(data.alternate_greetings)) {
      this.lastValidationError = "data.alternate_greetings must be an array if present";
      return false;
    }

    if (data.tags !== undefined && !Array.isArray(data.tags)) {
      this.lastValidationError = "data.tags must be an array if present";
      return false;
    }

    if (data.creator !== undefined && typeof data.creator !== "string") {
      this.lastValidationError = "data.creator must be a string if present";
      return false;
    }

    if (data.character_version !== undefined && typeof data.character_version !== "string") {
      this.lastValidationError = "data.character_version must be a string if present";
      return false;
    }

    if (data.extensions !== undefined && (typeof data.extensions !== "object" || data.extensions === null)) {
      this.lastValidationError = "data.extensions must be an object if present";
      return false;
    }

    // Опциональные поля - проверяем типы только если они присутствуют
    if (
      data.personality !== undefined &&
      typeof data.personality !== "string"
    ) {
      this.lastValidationError = "data.personality must be a string if present";
      return false;
    }

    if (data.scenario !== undefined && typeof data.scenario !== "string") {
      this.lastValidationError = "data.scenario must be a string if present";
      return false;
    }

    if (
      data.creator_notes !== undefined &&
      typeof data.creator_notes !== "string"
    ) {
      this.lastValidationError =
        "data.creator_notes must be a string if present";
      return false;
    }

    if (
      data.system_prompt !== undefined &&
      typeof data.system_prompt !== "string"
    ) {
      this.lastValidationError =
        "data.system_prompt must be a string if present";
      return false;
    }

    if (
      data.post_history_instructions !== undefined &&
      typeof data.post_history_instructions !== "string"
    ) {
      this.lastValidationError =
        "data.post_history_instructions must be a string if present";
      return false;
    }

    // Валидация character_book (если присутствует)
    if (data.character_book !== undefined && data.character_book !== null) {
      if (!this.validateCharacterBook(data.character_book)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Валидация character_book для V2
   */
  private validateCharacterBook(characterBook: unknown): boolean {
    if (!characterBook || typeof characterBook !== "object") {
      this.lastValidationError =
        "data.character_book must be an object if present";
      return false;
    }

    const book = characterBook as Record<string, unknown>;

    // Обязательные поля character_book
    if (!Object.prototype.hasOwnProperty.call(book, "entries")) {
      this.lastValidationError = "Missing required field in character_book: entries";
      return false;
    }

    // Проверка типов
    if (!Array.isArray(book.entries)) {
      this.lastValidationError = "character_book.entries must be an array";
      return false;
    }

    if (book.extensions !== undefined && (typeof book.extensions !== "object" || book.extensions === null)) {
      this.lastValidationError = "character_book.extensions must be an object if present";
      return false;
    }

    return true;
  }

  /**
   * Валидация V3
   * Проверяет структуру спецификации V3
   */
  private validateV3(): boolean {
    if (!this.card || typeof this.card !== "object") {
      this.lastValidationError = "Card is not an object";
      return false;
    }

    const card = this.card as Record<string, unknown>;

    // Проверка spec
    if (card.spec !== "chara_card_v3") {
      this.lastValidationError = "spec must be 'chara_card_v3'";
      return false;
    }

    // Проверка spec_version (>= 3.0 и < 4.0)
    const specVersion = card.spec_version;
    if (typeof specVersion !== "string" && typeof specVersion !== "number") {
      this.lastValidationError = "spec_version must be a string or number";
      return false;
    }

    const versionNumber = Number(specVersion);
    if (isNaN(versionNumber)) {
      this.lastValidationError = "spec_version must be a valid number";
      return false;
    }

    if (versionNumber < 3.0 || versionNumber >= 4.0) {
      this.lastValidationError = "spec_version must be >= 3.0 and < 4.0";
      return false;
    }

    // Проверка наличия объекта data (любого содержания)
    if (!card.data || typeof card.data !== "object") {
      this.lastValidationError = "data object is required";
      return false;
    }

    return true;
  }
}

