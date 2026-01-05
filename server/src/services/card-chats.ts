import type Database from "better-sqlite3";
import { createReadStream, existsSync, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { basename, join, parse, resolve, sep } from "node:path";
import readline from "node:readline";

export interface CardChatSummary {
  id: string; // file basename, e.g. "Foo.jsonl"
  title: string; // filename without extension by default
  messages_count: number;
  last_message_at: number; // ms timestamp
}

export interface CardChatMessage {
  name: string;
  is_user: boolean;
  is_system: boolean;
  mes: string;
  swipes?: string[];
  swipe_id?: number;
  /**
   * Normalized ISO timestamp (UTC) or null if unavailable.
   * We intentionally do not return raw original formats from ST.
   */
  send_date: string | null;
  send_date_ms: number;
}

export interface CardChatDetails {
  id: string;
  title: string;
  meta: {
    user_name?: string;
    character_name?: string;
  };
  messages: CardChatMessage[];
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function toSafeMs(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) {
    // Heuristic: seconds vs milliseconds
    if (v > 0 && v < 1e12) return Math.floor(v * 1000);
    return Math.floor(v);
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return 0;
    const n = Number(s);
    if (Number.isFinite(n)) {
      if (n > 0 && n < 1e12) return Math.floor(n * 1000);
      return Math.floor(n);
    }
    // Common SillyTavern formats:
    // - 2025-05-23@17h35m00s
    // - 2025-05-23 @17h35m00s
    // - 23.05.2025, 17:58:29
    // - November 11, 2025 3:17am
    {
      const m =
        /^(\d{4})-(\d{2})-(\d{2})\s*@\s*(\d{2})h(\d{2})m(\d{2})s$/i.exec(s);
      if (m) {
        const [, yy, mm, dd, hh, mi, ss] = m;
        const iso = `${yy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
        const t = Date.parse(iso);
        return Number.isFinite(t) ? t : 0;
      }
    }
    {
      const m =
        /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:,\s*|\s+)(\d{1,2}):(\d{2})(?::(\d{2}))?$/i.exec(
          s
        );
      if (m) {
        const [, dd, mm, yy, hh, mi, ss = "0"] = m;
        const iso = `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(
          2,
          "0"
        )}T${String(hh).padStart(2, "0")}:${mi}:${String(ss).padStart(2, "0")}`;
        const t = Date.parse(iso);
        return Number.isFinite(t) ? t : 0;
      }
    }
    {
      const m =
        /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})(?:,\s*|\s+)(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp])[Mm]$/.exec(
          s
        );
      if (m) {
        const [, monthRaw, ddRaw, yyRaw, hhRaw, miRaw, ssRaw = "0", apRaw] = m;
        const monthKey = monthRaw.toLowerCase();
        const monthMap: Record<string, number> = {
          january: 0,
          february: 1,
          march: 2,
          april: 3,
          may: 4,
          june: 5,
          july: 6,
          august: 7,
          september: 8,
          october: 9,
          november: 10,
          december: 11,
        };
        const month = monthMap[monthKey];
        if (typeof month === "number") {
          const yy = Number(yyRaw);
          const dd = Number(ddRaw);
          let hh = Number(hhRaw);
          const mi = Number(miRaw);
          const ss = Number(ssRaw);
          if (
            Number.isFinite(yy) &&
            Number.isFinite(dd) &&
            Number.isFinite(hh) &&
            Number.isFinite(mi) &&
            Number.isFinite(ss)
          ) {
            const isPm = apRaw.toLowerCase() === "p";
            if (hh === 12) hh = isPm ? 12 : 0;
            else if (isPm) hh += 12;
            const t = new Date(yy, month, dd, hh, mi, ss).getTime();
            return Number.isFinite(t) ? t : 0;
          }
        }
      }
    }

    const t = Date.parse(s);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}

function getDbCardMainFilePath(
  db: Database.Database,
  cardId: string
): string | null {
  const row = db
    .prepare(
      `
      SELECT
        c.primary_file_path,
        (
          SELECT cf.file_path
          FROM card_files cf
          WHERE cf.card_id = c.id
          ORDER BY cf.file_birthtime ASC, cf.file_path ASC
          LIMIT 1
        ) AS first_file_path
      FROM cards c
      WHERE c.id = ?
      LIMIT 1
    `
    )
    .get(cardId) as
    | { primary_file_path: string | null; first_file_path: string | null }
    | undefined;

  if (!row) return null;
  const primary = row.primary_file_path?.trim()
    ? row.primary_file_path.trim()
    : null;
  const first = row.first_file_path?.trim() ? row.first_file_path.trim() : null;
  return primary ?? first;
}

export function resolveCardChatsFolderPath(
  db: Database.Database,
  cardId: string
): string | null {
  const mainFilePath = getDbCardMainFilePath(db, cardId);
  if (mainFilePath) {
    const metaRow = db
      .prepare(
        `
        SELECT st_chats_folder_path
        FROM card_files
        WHERE file_path = ?
        LIMIT 1
      `
      )
      .get(mainFilePath) as { st_chats_folder_path: string | null } | undefined;

    const p = metaRow?.st_chats_folder_path?.trim();
    if (p) return p;
  }

  const fallbackRow = db
    .prepare(
      `
      SELECT st_chats_folder_path
      FROM card_files
      WHERE
        card_id = ?
        AND st_chats_folder_path IS NOT NULL
        AND TRIM(st_chats_folder_path) <> ''
      ORDER BY
        COALESCE(st_last_chat_at, 0) DESC,
        COALESCE(file_birthtime, 0) ASC,
        file_path ASC
      LIMIT 1
    `
    )
    .get(cardId) as { st_chats_folder_path: string | null } | undefined;

  const p = fallbackRow?.st_chats_folder_path?.trim();
  return p ? p : null;
}

function assertChatIdSafe(chatId: string): void {
  const id = String(chatId ?? "").trim();
  // No slashes and must be a single basename
  if (!id) throw new Error("invalid_chat_id");
  if (id.includes("/") || id.includes("\\") || id.includes("\0")) {
    throw new Error("invalid_chat_id");
  }
  if (basename(id) !== id) throw new Error("invalid_chat_id");
  if (!id.toLowerCase().endsWith(".jsonl")) throw new Error("invalid_chat_id");
}

function safeJoinUnderDir(dir: string, leaf: string): string {
  const base = resolve(dir);
  const full = resolve(base, leaf);
  const prefix = base.endsWith(sep) ? base : base + sep;
  if (full === base) return full;
  if (!full.startsWith(prefix)) throw new Error("invalid_chat_id");
  return full;
}

async function scanChatFileForSummary(filePath: string): Promise<{
  messagesCount: number;
  lastMessageAt: number;
}> {
  let messagesCount = 0;
  let lastMessageAt = 0;
  let lineIdx = 0;

  const rl = readline.createInterface({
    input: createReadStream(filePath, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  try {
    for await (const line of rl) {
      const trimmed = String(line ?? "").trim();
      if (!trimmed) continue;
      lineIdx += 1;
      if (lineIdx === 1) {
        // metadata line
        continue;
      }
      messagesCount += 1;
      try {
        const obj = JSON.parse(trimmed) as any;
        const ms = toSafeMs(obj?.send_date_ms ?? obj?.send_date);
        if (ms > lastMessageAt) lastMessageAt = ms;
      } catch {
        // ignore malformed message lines
      }
    }
  } finally {
    rl.close();
  }

  if (!(lastMessageAt > 0)) {
    try {
      const st = statSync(filePath);
      const mtime = st.mtimeMs;
      if (Number.isFinite(mtime) && mtime > 0) lastMessageAt = mtime;
    } catch {
      // ignore
    }
  }

  return { messagesCount, lastMessageAt };
}

export async function listCardChats(
  db: Database.Database,
  cardId: string
): Promise<CardChatSummary[]> {
  const folder = resolveCardChatsFolderPath(db, cardId);
  if (!folder) return [];
  if (!existsSync(folder)) return [];

  let entries: Array<{ name: string; fullPath: string }> = [];
  try {
    const files = await readdir(folder, { withFileTypes: true });
    entries = files
      .filter((f) => f.isFile())
      .map((f) => String(f.name ?? ""))
      .filter((name) => name.toLowerCase().endsWith(".jsonl"))
      .map((name) => ({ name, fullPath: join(folder, name) }));
  } catch {
    return [];
  }

  const out: CardChatSummary[] = [];
  // Keep it sequential to avoid unbounded parallel I/O.
  for (const e of entries) {
    try {
      const { messagesCount, lastMessageAt } = await scanChatFileForSummary(
        e.fullPath
      );
      const title = parse(e.name).name;
      out.push({
        id: e.name,
        title,
        messages_count: messagesCount,
        last_message_at: lastMessageAt,
      });
    } catch {
      continue;
    }
  }

  out.sort((a, b) => {
    if (a.last_message_at !== b.last_message_at)
      return b.last_message_at - a.last_message_at;
    return a.id.localeCompare(b.id);
  });

  return out;
}

export async function readCardChat(
  db: Database.Database,
  cardId: string,
  chatId: string
): Promise<CardChatDetails | null> {
  const folder = resolveCardChatsFolderPath(db, cardId);
  if (!folder) return null;
  if (!existsSync(folder)) return null;

  assertChatIdSafe(chatId);
  const filePath = safeJoinUnderDir(folder, chatId);
  if (!existsSync(filePath)) return null;

  const messages: CardChatMessage[] = [];
  const meta: { user_name?: string; character_name?: string } = {};
  let lineIdx = 0;

  const rl = readline.createInterface({
    input: createReadStream(filePath, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  try {
    for await (const line of rl) {
      const trimmed = String(line ?? "").trim();
      if (!trimmed) continue;
      lineIdx += 1;
      if (lineIdx === 1) {
        try {
          const obj = JSON.parse(trimmed) as any;
          if (isNonEmptyString(obj?.user_name))
            meta.user_name = obj.user_name.trim();
          if (isNonEmptyString(obj?.character_name))
            meta.character_name = obj.character_name.trim();
        } catch {
          // ignore metadata parse errors
        }
        continue;
      }

      try {
        const obj = JSON.parse(trimmed) as any;
        const sendDateRaw = obj?.send_date_ms ?? obj?.send_date ?? null;
        const sendDateMs = toSafeMs(sendDateRaw);
        const sendDateIso =
          sendDateMs > 0 ? new Date(sendDateMs).toISOString() : null;
        messages.push({
          name: isNonEmptyString(obj?.name) ? obj.name : "",
          is_user: Boolean(obj?.is_user),
          is_system: Boolean(obj?.is_system),
          mes: isNonEmptyString(obj?.mes) ? obj.mes : String(obj?.mes ?? ""),
          swipes: Array.isArray(obj?.swipes)
            ? obj.swipes.map((x: any) => String(x))
            : undefined,
          swipe_id:
            typeof obj?.swipe_id === "number" && Number.isFinite(obj.swipe_id)
              ? obj.swipe_id
              : undefined,
          send_date: sendDateIso,
          send_date_ms: sendDateMs,
        });
      } catch {
        // ignore malformed message lines
      }
    }
  } finally {
    rl.close();
  }

  return {
    id: chatId,
    title: parse(chatId).name,
    meta,
    messages,
  };
}
