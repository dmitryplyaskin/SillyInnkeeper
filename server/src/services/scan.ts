import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { stat as statAsync } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { readdir as readdirAsync, writeFile, ensureDir } from "fs-extra";
import pLimit from "p-limit";
import { randomUUID, createHash } from "node:crypto";
import { createDatabaseService, DatabaseService } from "./database";
import { CardParser } from "./card-parser";
import { deleteThumbnail } from "./thumbnail";
import { createTagService } from "./tags";
import { logger } from "../utils/logger";

const CONCURRENT_LIMIT = 5;

function canonicalizeForHash(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(canonicalizeForHash);
  if (typeof value !== "object") return value;

  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const key of Object.keys(obj).sort()) {
    // CCv3: игнорируем поля, которые часто меняются при переэкспорте
    if (key === "creation_date" || key === "modification_date") continue;
    out[key] = canonicalizeForHash(obj[key]);
  }

  // CCv3: поля creation_date/modification_date лежат обычно в card.data
  // (снаружи тоже может встретиться — игнорим в любом месте)
  return out;
}

function computeContentHash(cardOriginalData: unknown): string {
  const canonical = canonicalizeForHash(cardOriginalData);
  const json = JSON.stringify(canonical);
  return createHash("sha256").update(json, "utf8").digest("hex");
}

type ExistingFileRow = {
  card_id: string;
  file_mtime: number;
  file_birthtime: number;
  file_size: number;
  prompt_tokens_est?: number;
  avatar_path?: string | null;
};

type PreparedFile = {
  filePath: string;
  fileMtime: number;
  fileCreatedAt: number;
  fileSize: number;
  existingFile: ExistingFileRow | undefined;

  contentHash: string;
  isDuplicateByHash: boolean;
  createdNewCard: boolean;
  cardId: string;
  avatarPath: string | null;
  parseMs: number;
  thumbnailMs: number;

  name: string | null;
  description: string | null;
  tagsJson: string | null;
  creator: string | null;
  specVersion: string;

  personality: string | null;
  scenario: string | null;
  firstMes: string | null;
  mesExample: string | null;
  creatorNotes: string | null;
  systemPrompt: string | null;
  postHistoryInstructions: string | null;

  alternateGreetingsCount: number;
  hasCreatorNotes: number;
  hasSystemPrompt: number;
  hasPostHistoryInstructions: number;
  hasPersonality: number;
  hasScenario: number;
  hasMesExample: number;
  hasCharacterBook: number;
  promptTokensEst: number;

  dataJson: string;
  normalizedTags: string[];
  tagRawNames: string[];
  extractedOriginalData: unknown;
};

type PostCommitItem = {
  prepared: PreparedFile;
  cardId: string;
  avatarPath: string | null;
  postCommitEnsureAvatarFor: string | null;
};

/**
 * Сервис для сканирования папки с карточками и синхронизации с базой данных
 */
export class ScanService {
  private limit = pLimit(CONCURRENT_LIMIT);
  private scannedFiles = new Set<string>();
  private cardParser: CardParser;

  constructor(
    private dbService: DatabaseService,
    private libraryId: string = "cards"
  ) {
    this.cardParser = new CardParser();
  }

  /**
   * Рекурсивно сканирует папку и обрабатывает все PNG файлы
   * @param folderPath Путь к папке для сканирования
   */
  async scanFolder(
    folderPath: string,
    opts?: {
      onStart?: (totalFiles: number) => void;
      onProgress?: (processedFiles: number, totalFiles: number) => void;
    }
  ): Promise<{ totalFiles: number; processedFiles: number }> {
    if (!existsSync(folderPath)) {
      logger.errorMessageKey("error.scan.folderNotExists", { folderPath });
      return { totalFiles: 0, processedFiles: 0 };
    }

    logger.infoKey("log.scan.start", { folderPath });
    this.scannedFiles.clear();

    try {
      // Рекурсивно получаем все файлы
      const listStartedAt = Date.now();
      const files = await this.getAllPngFiles(folderPath);
      const listMs = Date.now() - listStartedAt;
      logger.infoKey("log.scan.foundPngFiles", { count: files.length });
      opts?.onStart?.(files.length);

      const totalFiles = files.length;
      let processedFiles = 0;
      let writtenItems = 0;
      let dbWriteTotalMs = 0;
      let postCommitTotalMs = 0;
      const parseSamples: number[] = [];
      const thumbnailSamples: number[] = [];
      let lastProgressAt = 0;
      const emitProgress = () => {
        if (!opts?.onProgress) return;
        const now = Date.now();
        // Throttle progress updates to avoid spamming SSE/UI.
        if (processedFiles >= totalFiles || now - lastProgressAt >= 300) {
          lastProgressAt = now;
          opts.onProgress(processedFiles, totalFiles);
        }
      };

      const batchSize = (() => {
        const raw = process.env.SCAN_DB_BATCH_SIZE;
        const n = raw !== undefined ? Number(raw) : 200;
        if (!Number.isFinite(n)) return 200;
        return Math.max(1, Math.floor(n));
      })();

      // Подготовка (parse/thumbnail) идёт с ограничением конкурентности,
      // запись в SQLite — батчами (в одной транзакции на пачку).
      for (let i = 0; i < files.length; i += batchSize) {
        const batchFiles = files.slice(i, i + batchSize);

        const prepared = await Promise.all(
          batchFiles.map((file) =>
            this.limit(async () => {
              try {
                return await this.prepareFile(file);
              } finally {
                processedFiles += 1;
                emitProgress();
              }
            })
          )
        );

        const toWrite = prepared.filter((x): x is PreparedFile => x !== null);
        if (toWrite.length === 0) continue;

        for (const p of toWrite) {
          parseSamples.push(p.parseMs);
          if (p.thumbnailMs > 0) thumbnailSamples.push(p.thumbnailMs);
        }

        const dbStartedAt = Date.now();
        const postItems = this.writePreparedBatch(toWrite);
        dbWriteTotalMs += Date.now() - dbStartedAt;
        writtenItems += postItems.length;

        const postStartedAt = Date.now();
        const postCommitTasks = postItems.map((r) =>
          this.limit(() => this.postCommit(r))
        );
        await Promise.all(postCommitTasks);
        postCommitTotalMs += Date.now() - postStartedAt;
      }

      // Очищаем удаленные файлы
      await this.cleanupDeletedFiles();

      logger.infoKey("log.scan.done", { count: files.length });
      // final progress snapshot
      if (processedFiles !== totalFiles) {
        processedFiles = totalFiles;
      }
      opts?.onProgress?.(processedFiles, totalFiles);

      // Метрики (без спама): один раз на скан
      const avg = (xs: number[]) =>
        xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
      const p95 = (xs: number[]) => {
        if (xs.length === 0) return 0;
        const sorted = [...xs].sort((a, b) => a - b);
        const idx = Math.min(
          sorted.length - 1,
          Math.max(0, Math.floor(sorted.length * 0.95) - 1)
        );
        return sorted[idx] ?? 0;
      };

      logger.info(
        `[scan metrics] files=${totalFiles} wrote=${writtenItems} listMs=${listMs} parseAvgMs=${avg(
          parseSamples
        ).toFixed(1)} parseP95Ms=${p95(parseSamples)} thumbAvgMs=${avg(
          thumbnailSamples
        ).toFixed(1)} thumbP95Ms=${p95(
          thumbnailSamples
        )} dbWriteTotalMs=${dbWriteTotalMs} postCommitTotalMs=${postCommitTotalMs} batchSize=${batchSize}`
      );

      return { totalFiles, processedFiles };
    } catch (error) {
      logger.errorKey(error, "error.scan.scanFolderFailed", { folderPath });
      throw error;
    }
  }

  /**
   * Рекурсивно получает все PNG файлы из папки
   */
  private async getAllPngFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await readdirAsync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Рекурсивно сканируем подпапки
        const subFiles = await this.getAllPngFiles(fullPath);
        files.push(...subFiles);
      } else if (
        entry.isFile() &&
        extname(entry.name).toLowerCase() === ".png"
      ) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Готовит данные по одному PNG файлу (parse/thumbnail), без записи в БД
   * @param filePath Путь к файлу
   */
  private async prepareFile(filePath: string): Promise<PreparedFile | null> {
    try {
      // Отмечаем файл как обработанный
      this.scannedFiles.add(filePath);

      // Получаем статистику файла
      const stats = await statAsync(filePath);
      const fileMtime = stats.mtimeMs;
      const fileBirthtime = stats.birthtimeMs;
      const fileSize = stats.size;
      // created_at хотим синхронизировать с "датой создания файла" (как в проводнике Windows).
      // На некоторых ФС/сценариях birthtime может быть 0/NaN — тогда используем mtimeMs как fallback.
      const fileCreatedAt =
        Number.isFinite(fileBirthtime) && fileBirthtime > 0
          ? fileBirthtime
          : fileMtime;

      // Проверяем, изменился ли файл
      const existingFile = this.dbService.queryOne<{
        card_id: string;
        file_mtime: number;
        file_birthtime: number;
        file_size: number;
        prompt_tokens_est?: number;
        avatar_path?: string | null;
      }>(
        `SELECT 
          cf.card_id,
          cf.file_mtime,
          cf.file_birthtime,
          cf.file_size,
          c.prompt_tokens_est as prompt_tokens_est,
          c.avatar_path as avatar_path
        FROM card_files cf
        LEFT JOIN cards c ON c.id = cf.card_id
        WHERE cf.file_path = ?`,
        [filePath]
      );

      // Если файл не изменился, пропускаем
      if (
        existingFile &&
        existingFile.file_mtime === fileMtime &&
        existingFile.file_birthtime === fileCreatedAt &&
        existingFile.file_size === fileSize &&
        // Если оценка токенов ещё не заполнена (0 по умолчанию после миграции), делаем перерасчёт.
        (existingFile.prompt_tokens_est ?? 0) > 0
      ) {
        return null;
      }

      // Парсим карточку через CardParser
      const parseStartedAt = Date.now();
      const extractedData = await this.cardParser.parse(filePath);
      const parseMs = Date.now() - parseStartedAt;
      if (!extractedData) {
        logger.errorMessageKey("error.scan.parseCardFailed", { filePath });
        return null;
      }

      // Хэш содержимого карточки (для дедупликации внутри libraryId)
      const contentHash = computeContentHash(extractedData.original_data);

      // Определяем cardId:
      // - если файл уже в БД (по file_path) -> используем его card_id
      // - иначе ищем существующую карточку по (library_id, content_hash)
      // - иначе создаём новую
      const existingByHash = !existingFile
        ? this.dbService.queryOne<{ id: string; avatar_path: string | null }>(
            `SELECT id, avatar_path FROM cards WHERE library_id = ? AND content_hash = ? LIMIT 1`,
            [this.libraryId, contentHash]
          )
        : undefined;

      let isDuplicateByHash = Boolean(existingByHash?.id);
      const createdNewCard = !existingFile && !existingByHash?.id;
      let cardId: string = existingFile
        ? existingFile.card_id
        : existingByHash?.id ?? randomUUID();

      // Превью генерим лениво через /api/thumbnail/:id и фоновую очередь после скана.
      // В скане только сохраняем avatar_path, если он уже был в БД (или найден по дедупу).
      let avatarPath: string | null = null;
      const thumbnailMs = 0;
      const existingAvatarPath =
        existingFile?.avatar_path ?? existingByHash?.avatar_path ?? null;
      avatarPath = existingAvatarPath;

      // Извлекаем поля из единообразного формата данных
      const name = extractedData.name || null;
      const description = extractedData.description || null;

      // Нормализация тегов (trim, lower) для консистентности и точной фильтрации
      const normalizedTags = (extractedData.tags || [])
        .map((t) => (typeof t === "string" ? t.trim() : String(t).trim()))
        .filter((t) => t.length > 0);
      const tagRawNames = normalizedTags.map((t) => t.toLowerCase());

      const tags =
        normalizedTags.length > 0 ? JSON.stringify(normalizedTags) : null;
      const creator = extractedData.creator || null;
      const specVersion = extractedData.spec_version;

      // Поля для фильтров/поиска (денормализация из data_json)
      const personality = extractedData.personality || null;
      const scenario = extractedData.scenario || null;
      const firstMes = extractedData.first_mes || null;
      const mesExample = extractedData.mes_example || null;
      const creatorNotes = extractedData.creator_notes || null;
      const systemPrompt = extractedData.system_prompt || null;
      const postHistoryInstructions =
        extractedData.post_history_instructions || null;

      // Оценка токенов для "чата" (приблизительно, без токенизатора)
      // Считаем только поля, которые участвуют в prompt-ish части карточки.
      // НЕ считаем: creator_notes/tags/creator/character_version/alternate_greetings/group_only_greetings/lorebook.
      const promptTokensEst = (() => {
        const parts: string[] = [];
        const pushIf = (v: unknown) => {
          if (typeof v !== "string") return;
          const t = v.trim();
          if (t.length > 0) parts.push(t);
        };

        pushIf(extractedData.name);
        pushIf(extractedData.description);
        pushIf(extractedData.personality);
        pushIf(extractedData.scenario);
        pushIf(extractedData.system_prompt);
        pushIf(extractedData.post_history_instructions);
        pushIf(extractedData.first_mes);
        pushIf(extractedData.mes_example);

        const text = parts.join("\n\n");
        if (text.length === 0) return 0;
        const bytes = Buffer.byteLength(text, "utf8");
        return Math.ceil(bytes / 4);
      })();

      // Флаги наличия (для фильтров "с/без")
      const hasCreatorNotes = creatorNotes?.trim() ? 1 : 0;
      const hasSystemPrompt = systemPrompt?.trim() ? 1 : 0;
      const hasPostHistoryInstructions = postHistoryInstructions?.trim()
        ? 1
        : 0;
      const hasPersonality = personality?.trim() ? 1 : 0;
      const hasScenario = scenario?.trim() ? 1 : 0;
      const hasMesExample = mesExample?.trim() ? 1 : 0;
      const hasCharacterBook = extractedData.character_book ? 1 : 0;

      const alternateGreetingsCount = Array.isArray(
        extractedData.alternate_greetings
      )
        ? extractedData.alternate_greetings.filter(
            (g) => (g ?? "").trim().length > 0
          ).length
        : 0;

      // Сохраняем оригинальные данные для экспорта
      const dataJson = JSON.stringify(extractedData.original_data);
      const createdAt = fileCreatedAt;

      return {
        filePath,
        fileMtime,
        fileCreatedAt: createdAt,
        fileSize,
        existingFile,
        contentHash,
        isDuplicateByHash,
        createdNewCard,
        cardId,
        avatarPath,
        parseMs,
        thumbnailMs,
        name,
        description,
        tagsJson: tags,
        creator,
        specVersion,
        personality,
        scenario,
        firstMes,
        mesExample,
        creatorNotes,
        systemPrompt,
        postHistoryInstructions,
        alternateGreetingsCount,
        hasCreatorNotes,
        hasSystemPrompt,
        hasPostHistoryInstructions,
        hasPersonality,
        hasScenario,
        hasMesExample,
        hasCharacterBook,
        promptTokensEst,
        dataJson,
        normalizedTags,
        tagRawNames,
        extractedOriginalData: extractedData.original_data,
      };
    } catch (error) {
      logger.errorKey(error, "error.scan.processFileFailed", { filePath });
      return null;
    }
  }

  private writePreparedBatch(prepared: PreparedFile[]): PostCommitItem[] {
    const uniqueTags = new Set<string>();
    for (const p of prepared) {
      for (const t of p.normalizedTags) uniqueTags.add(t);
    }

    return this.dbService.transaction((db) => {
      // ensure tags exist once per batch (card_tags has FK to tags.rawName)
      if (uniqueTags.size > 0) {
        const tagService = createTagService(db);
        tagService.ensureTagsExist(Array.from(uniqueTags));
      }

      const txDb = createDatabaseService(db);
      const out: PostCommitItem[] = [];

      for (const p of prepared) {
        out.push(this.applyPreparedInTransaction(txDb, p));
      }

      return out;
    });
  }

  private applyPreparedInTransaction(
    txDb: DatabaseService,
    p: PreparedFile
  ): PostCommitItem {
    let cardId = p.cardId;
    let isDuplicateByHash = p.isDuplicateByHash;
    let avatarPath: string | null = p.avatarPath;
    let postCommitEnsureAvatarFor: string | null = null;

    if (p.existingFile) {
      // Обновляем карточку
      txDb.execute(
        `UPDATE cards SET 
          library_id = ?,
          content_hash = ?,
          name = ?, 
          description = ?, 
          tags = ?, 
          creator = ?, 
          spec_version = ?, 
          avatar_path = ?, 
          created_at = ?,
          data_json = ?,
          personality = ?,
          scenario = ?,
          first_mes = ?,
          mes_example = ?,
          creator_notes = ?,
          system_prompt = ?,
          post_history_instructions = ?,
          alternate_greetings_count = ?,
          has_creator_notes = ?,
          has_system_prompt = ?,
          has_post_history_instructions = ?,
          has_personality = ?,
          has_scenario = ?,
          has_mes_example = ?,
          has_character_book = ?,
          prompt_tokens_est = ?
        WHERE id = ?`,
        [
          this.libraryId,
          p.contentHash,
          p.name,
          p.description,
          p.tagsJson,
          p.creator,
          p.specVersion,
          avatarPath,
          p.fileCreatedAt,
          p.dataJson,
          p.personality,
          p.scenario,
          p.firstMes,
          p.mesExample,
          p.creatorNotes,
          p.systemPrompt,
          p.postHistoryInstructions,
          p.alternateGreetingsCount,
          p.hasCreatorNotes,
          p.hasSystemPrompt,
          p.hasPostHistoryInstructions,
          p.hasPersonality,
          p.hasScenario,
          p.hasMesExample,
          p.hasCharacterBook,
          p.promptTokensEst,
          p.existingFile.card_id,
        ]
      );

      // Обновляем информацию о файле
      txDb.execute(
        `UPDATE card_files SET 
          file_mtime = ?, 
          file_birthtime = ?,
          file_size = ?,
          folder_path = ?
        WHERE file_path = ?`,
        [
          p.fileMtime,
          p.fileCreatedAt,
          p.fileSize,
          dirname(p.filePath),
          p.filePath,
        ]
      );

      cardId = p.existingFile.card_id;
    } else {
      // Для новых file_path: либо создаём карточку, либо привязываем к существующей по (library_id, content_hash).
      if (p.createdNewCard && cardId) {
        try {
          txDb.execute(
            `INSERT INTO cards (
              id,
              library_id,
              content_hash,
              name,
              description,
              tags,
              creator,
              spec_version,
              avatar_path,
              created_at,
              data_json,
              personality,
              scenario,
              first_mes,
              mes_example,
              creator_notes,
              system_prompt,
              post_history_instructions,
              alternate_greetings_count,
              has_creator_notes,
              has_system_prompt,
              has_post_history_instructions,
              has_personality,
              has_scenario,
              has_mes_example,
              has_character_book,
              prompt_tokens_est
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              cardId,
              this.libraryId,
              p.contentHash,
              p.name,
              p.description,
              p.tagsJson,
              p.creator,
              p.specVersion,
              avatarPath,
              p.fileCreatedAt,
              p.dataJson,
              p.personality,
              p.scenario,
              p.firstMes,
              p.mesExample,
              p.creatorNotes,
              p.systemPrompt,
              p.postHistoryInstructions,
              p.alternateGreetingsCount,
              p.hasCreatorNotes,
              p.hasSystemPrompt,
              p.hasPostHistoryInstructions,
              p.hasPersonality,
              p.hasScenario,
              p.hasMesExample,
              p.hasCharacterBook,
              p.promptTokensEst,
            ]
          );
        } catch (e) {
          // Гонка: другая задача успела вставить ту же карточку (library_id, content_hash).
          const dup = txDb.queryOne<{
            id: string;
            avatar_path: string | null;
          }>(
            `SELECT id, avatar_path FROM cards WHERE library_id = ? AND content_hash = ? LIMIT 1`,
            [this.libraryId, p.contentHash]
          );
          if (!dup?.id) throw e;

          isDuplicateByHash = true;
          postCommitEnsureAvatarFor = dup.avatar_path ? null : dup.id;

          // Если мы уже сгенерировали миниатюру для "лишнего" id, удалим её.
          // Важно: не используем этот avatarPath для существующей карточки.
          if (avatarPath) {
            const createdUuid = avatarPath
              .split("/")
              .pop()
              ?.replace(".webp", "");
            if (createdUuid) {
              void deleteThumbnail(createdUuid);
            }
          }

          cardId = dup.id;
          avatarPath = dup.avatar_path;
        }
      }

      if (!cardId) throw new Error("cardId is not resolved");

      // Если это дубль по хэшу (или мы его таким определили в гонке),
      // и миниатюра была сгенерирована (или уже существует), гарантируем,
      // что avatar_path у карточки заполнен (не перетирая существующее).
      if (isDuplicateByHash && avatarPath) {
        txDb.execute(
          `UPDATE cards SET avatar_path = COALESCE(avatar_path, ?) WHERE id = ?`,
          [avatarPath, cardId]
        );
      }

      // Привязываем файл к cardId (и для новой карточки, и для дубля по хэшу)
      txDb.execute(
        `INSERT INTO card_files (file_path, card_id, file_mtime, file_birthtime, file_size, folder_path)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          p.filePath,
          cardId,
          p.fileMtime,
          p.fileCreatedAt,
          p.fileSize,
          dirname(p.filePath),
        ]
      );
    }

    // Синхронизируем связи card_tags (точная фильтрация по тегам)
    // Перезаписываем полностью при каждом обновлении карточки
    txDb.execute(`DELETE FROM card_tags WHERE card_id = ?`, [cardId]);
    if (p.tagRawNames.length > 0) {
      for (const rawName of p.tagRawNames) {
        txDb.execute(
          `INSERT OR IGNORE INTO card_tags (card_id, tag_rawName) VALUES (?, ?)`,
          [cardId, rawName]
        );
      }
    }

    return {
      prepared: p,
      cardId,
      avatarPath,
      postCommitEnsureAvatarFor,
    };
  }

  private async postCommit(item: PostCommitItem): Promise<void> {
    const p = item.prepared;
    const cardId = item.cardId;
    const avatarPath = item.avatarPath;

    // Сохраняем JSON файл с данными карточки (только если включено через переменную окружения)
    if (process.env.ENABLE_JSON_CACHE === "true") {
      const jsonDir = join(process.cwd(), "data", "cache", "json");
      await ensureDir(jsonDir);
      const jsonPath = join(jsonDir, `${cardId}.json`);
      const jsonData = {
        db: {
          id: cardId,
          cardId,
          name: p.name,
          description: p.description,
          tags: p.tagsJson,
          creator: p.creator,
          specVersion: p.specVersion,
          avatarPath,
          createdAt: p.fileCreatedAt,
          dataJson: p.extractedOriginalData,
          personality: p.personality,
          scenario: p.scenario,
          firstMes: p.firstMes,
          mesExample: p.mesExample,
          creatorNotes: p.creatorNotes,
          systemPrompt: p.systemPrompt,
          postHistoryInstructions: p.postHistoryInstructions,
          alternateGreetingsCount: p.alternateGreetingsCount,
          hasCreatorNotes: p.hasCreatorNotes,
          hasSystemPrompt: p.hasSystemPrompt,
          hasPostHistoryInstructions: p.hasPostHistoryInstructions,
          hasPersonality: p.hasPersonality,
          hasScenario: p.hasScenario,
          hasMesExample: p.hasMesExample,
          hasCharacterBook: p.hasCharacterBook,
        },
        raw: {
          data: p.extractedOriginalData,
          spec_version: p.specVersion,
        },
      };
      await writeFile(jsonPath, JSON.stringify(jsonData, null, 2), "utf-8");
    }
  }

  /**
   * Удаляет записи о файлах, которых больше нет на диске
   */
  private async cleanupDeletedFiles(): Promise<void> {
    try {
      // Получаем все файлы из БД только для текущей библиотеки
      const dbFiles = this.dbService.query<{
        file_path: string;
        card_id: string;
      }>(
        `
        SELECT cf.file_path, cf.card_id
        FROM card_files cf
        JOIN cards c ON c.id = cf.card_id
        WHERE c.library_id = ?
      `,
        [this.libraryId]
      );

      const filesToDelete: Array<{ file_path: string; card_id: string }> = [];

      // Быстрая проверка без IO:
      // если file_path отсутствует в списке файлов, найденных в текущем скане,
      // считаем, что файл удалён (или больше не находится в папке библиотеки).
      for (const dbFile of dbFiles) {
        if (!this.scannedFiles.has(dbFile.file_path)) {
          filesToDelete.push(dbFile);
        }
      }

      if (filesToDelete.length === 0) {
        return;
      }

      logger.infoKey("log.scan.foundDeletedFilesToCleanup", {
        count: filesToDelete.length,
      });

      // Удаляем файлы из БД
      for (const file of filesToDelete) {
        // Получаем avatar_path перед удалением карточки
        const card = this.dbService.queryOne<{ avatar_path: string | null }>(
          "SELECT avatar_path FROM cards WHERE id = ?",
          [file.card_id]
        );

        // Удаляем файл из БД.
        // Важно: ON DELETE CASCADE работает от cards -> card_files, а не наоборот.
        this.dbService.execute("DELETE FROM card_files WHERE file_path = ?", [
          file.file_path,
        ]);

        // Проверяем, остались ли еще файлы у этой карточки
        const remainingFiles = this.dbService.queryOne<{ count: number }>(
          "SELECT COUNT(*) as count FROM card_files WHERE card_id = ?",
          [file.card_id]
        );

        // Если файлов не осталось, удаляем карточку и миниатюру
        if ((remainingFiles?.count ?? 0) === 0) {
          this.dbService.execute("DELETE FROM cards WHERE id = ?", [
            file.card_id,
          ]);

          if (card?.avatar_path) {
            const uuid = card.avatar_path
              .split("/")
              .pop()
              ?.replace(".webp", "");
            if (uuid) {
              await deleteThumbnail(uuid);
            }
          }
        }
      }

      // Доп. зачистка: удаляем "сирот" (cards без card_files), которые могли остаться
      // из-за старого поведения или ручных изменений БД.
      const orphanCards = this.dbService.query<{
        id: string;
        avatar_path: string | null;
      }>(
        `
        SELECT c.id, c.avatar_path
        FROM cards c
        WHERE c.library_id = ?
        AND NOT EXISTS (
          SELECT 1 FROM card_files cf WHERE cf.card_id = c.id
        )
      `,
        [this.libraryId]
      );

      for (const orphan of orphanCards) {
        this.dbService.execute("DELETE FROM cards WHERE id = ?", [orphan.id]);
        if (orphan.avatar_path) {
          const uuid = orphan.avatar_path
            .split("/")
            .pop()
            ?.replace(".webp", "");
          if (uuid) {
            await deleteThumbnail(uuid);
          }
        }
      }
    } catch (error) {
      logger.errorKey(error, "error.scan.cleanupDeletedFilesFailed");
    }
  }
}

/**
 * Создает экземпляр ScanService из экземпляра Database
 */
export function createScanService(
  db: Database.Database,
  libraryId: string = "cards"
): ScanService {
  const dbService = createDatabaseService(db);
  return new ScanService(dbService, libraryId);
}
