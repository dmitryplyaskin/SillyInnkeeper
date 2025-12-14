import sharp from "sharp";
import { join } from "node:path";
import { ensureDir } from "fs-extra";
import { logger } from "../utils/logger";

const THUMBNAILS_DIR = join(process.cwd(), "data", "cache", "thumbnails");
const WEBP_QUALITY = 80;
const WEBP_EFFORT = (() => {
  const raw = process.env.THUMB_WEBP_EFFORT;
  const n = raw != null ? Number(raw) : 2;
  if (!Number.isFinite(n)) return 2;
  // sharp webp effort is 0..6
  return Math.max(0, Math.min(6, Math.floor(n)));
})();

/**
 * Генерирует миниатюру WebP из PNG файла
 * @param sourcePath Путь к исходному PNG файлу
 * @param uuid UUID карточки для имени файла миниатюры
 * @returns Относительный путь к миниатюре или null в случае ошибки
 */
export async function generateThumbnail(
  sourcePath: string,
  uuid: string
): Promise<string | null> {
  try {
    // Убеждаемся, что папка для миниатюр существует
    await ensureDir(THUMBNAILS_DIR);

    // Формируем путь к файлу миниатюры
    const thumbnailPath = join(THUMBNAILS_DIR, `${uuid}.webp`);

    // Генерируем миниатюру: resize до ширины 300px и конвертируем в WebP
    await sharp(sourcePath)
      .resize({ width: 300, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT })
      .toFile(thumbnailPath);

    // Возвращаем относительный путь от папки data
    return `cache/thumbnails/${uuid}.webp`;
  } catch (error) {
    logger.errorKey(error, "error.thumbnail.generateFailed", { sourcePath });
    return null;
  }
}

/**
 * Удаляет миниатюру карточки
 * @param uuid UUID карточки
 */
export async function deleteThumbnail(uuid: string): Promise<void> {
  try {
    const thumbnailPath = join(THUMBNAILS_DIR, `${uuid}.webp`);
    const { unlink } = await import("fs-extra");
    await unlink(thumbnailPath).catch(() => {
      // Игнорируем ошибку, если файл не существует
    });
  } catch (error) {
    // Игнорируем ошибки удаления
    logger.errorKey(error, "error.thumbnail.deleteFailed", { uuid });
  }
}
