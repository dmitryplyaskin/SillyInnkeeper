import { parsePngMetadata } from "./png-parser";
import { CardValidator } from "./card-validator";
import { CardDataExtractor } from "./card-data-extractor";
import { ExtractedCardData } from "./types";
import { logger } from "../utils/logger";
import { t } from "../i18n/i18n";

/**
 * Главный класс для парсинга карточек персонажей
 * Объединяет валидацию и извлечение данных в единый интерфейс
 */
export class CardParser {
  private extractor: CardDataExtractor;

  constructor() {
    this.extractor = new CardDataExtractor();
  }

  /**
   * Парсит PNG файл и возвращает данные карточки в единообразном формате
   * @param filePath - Путь к PNG файлу
   * @returns Извлеченные данные или null в случае ошибки
   */
  async parse(filePath: string): Promise<ExtractedCardData | null> {
    try {
      // Читаем метаданные из PNG
      const parsedData = await parsePngMetadata(filePath);
      if (!parsedData) {
        logger.errorMessageKey("error.cardParser.noMetadata", { filePath });
        return null;
      }

      // Обрабатываем JSON данные
      return this.parseJson(parsedData.data, filePath);
    } catch (error) {
      logger.errorKey(error, "error.cardParser.parsePngFailed", { filePath });
      return null;
    }
  }

  /**
   * Парсит JSON данные карточки
   * @param jsonData - JSON данные карточки
   * @param filePath - Путь к файлу (для логирования ошибок)
   * @returns Извлеченные данные или null в случае ошибки
   */
  parseJson(jsonData: unknown, filePath?: string): ExtractedCardData | null {
    try {
      // Создаем валидатор для этих данных
      const validator = new CardValidator(jsonData);

      // Валидируем карточку
      const specVersion = validator.validate();

      if (!specVersion) {
        const errorMsg =
          validator.getLastError() || t("error.cardParser.validationUnknown");
        const fileInfo = filePath
          ? t("error.cardParser.fileInfo", { filePath })
          : "";

        // Предполагаем тип ошибки на основе структуры данных
        let errorType = t("error.cardParser.errorType.unknownDataStructure");
        if (jsonData && typeof jsonData === "object") {
          const card = jsonData as Record<string, unknown>;
          if (card.spec !== undefined) {
            errorType = t("error.cardParser.errorType.invalidSpec", {
              spec: String(card.spec),
            });
          } else if (card.name !== undefined) {
            errorType = t("error.cardParser.errorType.incompleteV1");
          } else {
            errorType = t("error.cardParser.errorType.missingRequiredFields");
          }
        }

        logger.errorMessageKey("error.cardParser.parseCard", { fileInfo });
        logger.errorMessageKey("error.cardParser.errorType", { errorType });
        logger.errorMessageKey("error.cardParser.details", {
          details: errorMsg,
        });
        return null;
      }

      // Извлекаем данные в единообразный формат
      const extractedData = this.extractor.extract(jsonData, specVersion);

      return extractedData;
    } catch (error) {
      const fileInfo = filePath
        ? t("error.cardParser.fileInfo", { filePath })
        : "";
      logger.errorKey(error, "error.cardParser.extractFailed", { fileInfo });

      // Предполагаем тип ошибки
      let errorType = t("error.cardParser.errorType.extractionError");
      if (error instanceof Error) {
        errorType = error.message;
      }

      logger.errorMessageKey("error.cardParser.errorType", { errorType });
      return null;
    }
  }
}
