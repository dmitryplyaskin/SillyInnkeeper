import { readFileSync } from "node:fs";
import { ParsedCardData } from "./types";
import { logger } from "../utils/logger";

/**
 * Парсит метаданные карточки из PNG файла
 * Читает текстовые чанки tEXt без полного декодирования изображения
 * Поддерживает приоритет версий: сначала ищет ccv3 (V3), затем chara (V2)
 * @param filePath Путь к PNG файлу
 * @returns Парсированные данные карточки или null в случае ошибки
 */
export function parsePngMetadata(filePath: string): ParsedCardData | null {
  try {
    // Читаем файл в буфер
    const buffer = readFileSync(filePath);

    // Проверяем PNG сигнатуру (первые 8 байт: 89 50 4E 47 0D 0A 1A 0A)
    if (
      buffer.length < 8 ||
      buffer.toString("hex", 0, 8) !== "89504e470d0a1a0a"
    ) {
      logger.errorMessageKey("error.png.invalidPng", { filePath });
      return null;
    }

    // Собираем все tEXt чанки для обработки
    const textChunks: Array<{ keyword: string; text: string }> = [];
    let position = 8;

    while (position < buffer.length - 12) {
      // Читаем длину чанка (4 байта, big-endian)
      const chunkLength = buffer.readUInt32BE(position);
      position += 4;

      // Читаем тип чанка (4 байта)
      const chunkType = buffer.toString("ascii", position, position + 4);
      position += 4;

      // Если это чанк tEXt
      if (chunkType === "tEXt") {
        // Проверяем, что у нас достаточно данных для чтения чанка
        if (buffer.length < position + chunkLength + 4) {
          logger.errorMessageKey("error.png.textChunkInsufficientData", {
            filePath,
          });
          return null;
        }

        // Читаем данные чанка
        const chunkData = buffer.slice(position, position + chunkLength);

        // В чанке tEXt формат: keyword (null-terminated) + text
        const nullIndex = chunkData.indexOf(0);
        if (nullIndex > 0 && nullIndex < chunkData.length - 1) {
          const keyword = chunkData.slice(0, nullIndex).toString("ascii");
          const text = chunkData.slice(nullIndex + 1).toString("latin1");

          // Сохраняем чанки ccv3 и chara для последующей обработки
          if (
            keyword.toLowerCase() === "ccv3" ||
            keyword.toLowerCase() === "chara"
          ) {
            textChunks.push({ keyword: keyword.toLowerCase(), text });
          }
        }

        // Пропускаем CRC (4 байта) и переходим к следующему чанку
        position += chunkLength + 4;
      } else if (chunkType === "IEND") {
        // Конец файла
        break;
      } else {
        // Пропускаем другие чанки (данные + CRC)
        if (buffer.length >= position + chunkLength + 4) {
          position += chunkLength + 4;
        } else {
          // Недостаточно данных
          break;
        }
      }
    }

    // Приоритет версий: сначала ищем ccv3 (V3), затем chara (V2)
    // Ищем ccv3 (V3) - наивысший приоритет
    const ccv3Chunks = textChunks.filter((chunk) => chunk.keyword === "ccv3");
    for (const chunk of ccv3Chunks) {
      try {
        const decodedData = Buffer.from(chunk.text, "base64").toString(
          "utf-8"
        );
        const cardData = JSON.parse(decodedData);

        // Пропускаем ответы с ошибками (не карточки)
        if (cardData && typeof cardData === "object" && (cardData.spec || cardData.name)) {
          // Определяем версию спецификации
          let specVersion: "1.0" | "2.0" | "3.0" | "UNKNOWN" = "UNKNOWN";
          if (cardData.spec === "chara_card_v3") {
            specVersion = "3.0";
          } else if (cardData.spec === "chara_card_v2") {
            specVersion = "2.0";
          } else if (!cardData.spec) {
            // Если spec отсутствует, пытаемся определить V1 по обязательным полям
            const v1RequiredFields = [
              "name",
              "description",
              "personality",
              "scenario",
              "first_mes",
              "mes_example",
            ];
            const hasAllV1Fields = v1RequiredFields.every((field) =>
              cardData.hasOwnProperty(field)
            );
            if (hasAllV1Fields) {
              specVersion = "1.0";
            }
          }

          return {
            data: cardData,
            spec_version: specVersion,
            chunk_type: "ccv3",
          };
        }
      } catch {
        // Пропускаем невалидный JSON и пробуем следующий чанк
      }
    }

    // Fallback: ищем chara (V2)
    const charaChunks = textChunks.filter((chunk) => chunk.keyword === "chara");
    for (const chunk of charaChunks) {
      try {
        const decodedData = Buffer.from(chunk.text, "base64").toString(
          "utf-8"
        );
        const cardData = JSON.parse(decodedData);

        // Пропускаем ответы с ошибками (не карточки)
        if (cardData && typeof cardData === "object" && (cardData.spec || cardData.name)) {
          // Определяем версию спецификации
          let specVersion: "1.0" | "2.0" | "3.0" | "UNKNOWN" = "UNKNOWN";
          if (cardData.spec === "chara_card_v2") {
            specVersion = "2.0";
          } else if (cardData.spec === "chara_card_v3") {
            specVersion = "3.0";
          } else if (!cardData.spec) {
            // Если spec отсутствует, пытаемся определить V1 по обязательным полям
            const v1RequiredFields = [
              "name",
              "description",
              "personality",
              "scenario",
              "first_mes",
              "mes_example",
            ];
            const hasAllV1Fields = v1RequiredFields.every((field) =>
              cardData.hasOwnProperty(field)
            );
            if (hasAllV1Fields) {
              specVersion = "1.0";
            }
          }

          return {
            data: cardData,
            spec_version: specVersion,
            chunk_type: "chara",
          };
        }
      } catch {
        // Пропускаем невалидный JSON и пробуем следующий чанк
      }
    }

    // Если чанки были найдены, но ни один не содержал валидную карточку
    if (ccv3Chunks.length > 0) {
      logger.errorMessageKey("error.png.decodeCcv3Failed", { filePath });
    } else if (charaChunks.length > 0) {
      logger.errorMessageKey("error.png.decodeCharaFailed", { filePath });
    }

    // Чанки ccv3 и chara не найдены
    return null;
  } catch (error) {
    logger.errorKey(error, "error.png.parseFailed", { filePath });
    return null;
  }
}
