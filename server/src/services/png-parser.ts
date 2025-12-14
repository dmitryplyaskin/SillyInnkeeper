import { open } from "node:fs/promises";
import { ParsedCardData } from "./types";
import { logger } from "../utils/logger";

const PNG_SIGNATURE_HEX = "89504e470d0a1a0a";

async function readExact(
  filePath: string,
  fh: Awaited<ReturnType<typeof open>>,
  length: number,
  position: number
): Promise<Buffer | null> {
  const buffer = Buffer.allocUnsafe(length);
  let offset = 0;
  while (offset < length) {
    const { bytesRead } = await fh.read(
      buffer,
      offset,
      length - offset,
      position + offset
    );
    if (bytesRead <= 0) {
      logger.errorMessageKey("error.png.textChunkInsufficientData", {
        filePath,
      });
      return null;
    }
    offset += bytesRead;
  }
  return buffer;
}

function detectSpecVersion(cardData: any): "1.0" | "2.0" | "3.0" | "UNKNOWN" {
  if (cardData?.spec === "chara_card_v3") return "3.0";
  if (cardData?.spec === "chara_card_v2") return "2.0";
  if (!cardData?.spec) {
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
      Object.prototype.hasOwnProperty.call(cardData, field)
    );
    if (hasAllV1Fields) return "1.0";
  }
  return "UNKNOWN";
}

/**
 * Парсит метаданные карточки из PNG файла
 * Читает текстовые чанки tEXt без полного декодирования изображения
 * Поддерживает приоритет версий: сначала ищет ccv3 (V3), затем chara (V2)
 * @param filePath Путь к PNG файлу
 * @returns Парсированные данные карточки или null в случае ошибки
 */
export async function parsePngMetadata(
  filePath: string
): Promise<ParsedCardData | null> {
  let fh: Awaited<ReturnType<typeof open>> | null = null;
  try {
    fh = await open(filePath, "r");

    // Проверяем PNG сигнатуру (первые 8 байт: 89 50 4E 47 0D 0A 1A 0A)
    const signature = await readExact(filePath, fh, 8, 0);
    if (!signature || signature.toString("hex") !== PNG_SIGNATURE_HEX) {
      logger.errorMessageKey("error.png.invalidPng", { filePath });
      return null;
    }

    let position = 8;
    let charaText: string | null = null;

    // Идём по чанкам без чтения больших данных (IDAT и т.п. пропускаем через seek)
    // stop: IEND или EOF
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const header = await readExact(filePath, fh, 8, position);
      if (!header) break;

      const chunkLength = header.readUInt32BE(0);
      const chunkType = header.toString("ascii", 4, 8);
      position += 8;

      if (chunkType === "tEXt") {
        const chunkData = await readExact(filePath, fh, chunkLength, position);
        if (!chunkData) return null;

        // В чанке tEXt формат: keyword (null-terminated) + text
        const nullIndex = chunkData.indexOf(0);
        if (nullIndex > 0 && nullIndex < chunkData.length - 1) {
          const keyword = chunkData
            .slice(0, nullIndex)
            .toString("ascii")
            .toLowerCase();
          const text = chunkData.slice(nullIndex + 1).toString("latin1");

          if (keyword === "ccv3") {
            try {
              const decodedData = Buffer.from(text, "base64").toString("utf-8");
              const cardData = JSON.parse(decodedData);
              return {
                data: cardData,
                spec_version: detectSpecVersion(cardData),
                chunk_type: "ccv3",
              };
            } catch (error) {
              logger.errorKey(error, "error.png.decodeCcv3Failed", {
                filePath,
              });
              // продолжаем искать fallback chara
            }
          } else if (keyword === "chara") {
            // fallback, но продолжаем читать, вдруг где-то дальше встретится ccv3
            charaText = text;
          }
        }

        // skip data (already read) + CRC
        position += chunkLength + 4;
        continue;
      }

      if (chunkType === "IEND") {
        break;
      }

      // Пропускаем данные + CRC без чтения
      position += chunkLength + 4;
    }

    if (charaText) {
      try {
        const decodedData = Buffer.from(charaText, "base64").toString("utf-8");
        const cardData = JSON.parse(decodedData);
        return {
          data: cardData,
          spec_version: detectSpecVersion(cardData),
          chunk_type: "chara",
        };
      } catch (error) {
        logger.errorKey(error, "error.png.decodeCharaFailed", { filePath });
        return null;
      }
    }

    return null;
  } catch (error) {
    logger.errorKey(error, "error.png.parseFailed", { filePath });
    return null;
  } finally {
    try {
      await fh?.close();
    } catch {
      // ignore
    }
  }
}
