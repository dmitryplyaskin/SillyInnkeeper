import { createHash } from "node:crypto";

/**
 * Канонизация произвольного JSON для стабильного хэширования.
 * Используется и для карточек, и для лорабуков.
 */
export function canonicalizeForHash(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(canonicalizeForHash);
  if (typeof value !== "object") return value;

  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const key of Object.keys(obj).sort()) {
    // CCv3: игнорируем поля, которые часто меняются при переэкспорте
    // и не должны ломать дедупликацию (карточек или лорабуков)
    if (key === "creation_date" || key === "modification_date") continue;
    out[key] = canonicalizeForHash(obj[key]);
  }

  return out;
}

function computeSha256FromCanonical(value: unknown): string {
  const canonical = canonicalizeForHash(value);
  const json = JSON.stringify(canonical);
  return createHash("sha256").update(json, "utf8").digest("hex");
}

/**
 * Хеш канонизированных данных карточки (используется для дедупликации cards).
 */
export function computeContentHash(cardOriginalData: unknown): string {
  return computeSha256FromCanonical(cardOriginalData);
}

/**
 * Хеш канонизированных данных лорабука.
 * Для лорабуков применяем те же правила, что и для карточек:
 * сортировка ключей + игнорирование creation_date/modification_date.
 */
export function computeLorebookHash(lorebookData: unknown): string {
  return computeSha256FromCanonical(lorebookData);
}
