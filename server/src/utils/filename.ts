const INVALID_WIN_CHARS = /[<>:"/\\|?*\u0000-\u001F]/g;

/**
 * Санитизирует базовое имя файла для Windows.
 * - удаляет запрещённые символы <>:"/\|?* и управляющие
 * - trim пробелов
 * - убирает завершающие точки/пробелы (Windows не любит)
 * - если пусто — возвращает fallback
 */
export function sanitizeWindowsFilenameBase(
  input: string | null | undefined,
  fallbackBase: string
): string {
  const raw = String(input ?? "")
    .replace(INVALID_WIN_CHARS, "")
    .trim();
  const noTrailingDots = raw.replace(/[.\s]+$/g, "").trim();
  return noTrailingDots.length > 0 ? noTrailingDots : fallbackBase;
}

/**
 * Формирует безопасный Content-Disposition (attachment) для UTF-8 имён.
 * Возвращает строку вида:
 * attachment; filename="name.png"; filename*=UTF-8''name.png
 */
export function makeAttachmentContentDisposition(filename: string): string {
  // RFC6266: filename — только ASCII и без кавычек/слешей
  const asciiFallback = filename
    .replace(/[\\"]/g, "_")
    .replace(/[^\x20-\x7E]/g, "_");

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(
    filename
  )}`;
}
