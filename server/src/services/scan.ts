import Database from "better-sqlite3";
import { statSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { readdir as readdirAsync, writeFile, ensureDir } from "fs-extra";
import pLimit from "p-limit";
import { randomUUID } from "node:crypto";
import { createDatabaseService, DatabaseService } from "./database";
import { CardParser } from "./card-parser";
import { generateThumbnail, deleteThumbnail } from "./thumbnail";
import { createTagService } from "./tags";
import { computeContentHash } from "./card-hash";
import { createLorebooksService, LorebooksService } from "./lorebooks";
import { logger } from "../utils/logger";

const CONCURRENT_LIMIT = 5;

/**
 * Сервис для сканирования папки с карточками и синхронизации с базой данных
 */
export class ScanService {
  private limit = pLimit(CONCURRENT_LIMIT);
  private scannedFiles = new Set<string>();
  private cardParser: CardParser;
  private lorebooksService: LorebooksService;

  constructor(
    private dbService: DatabaseService,
    private libraryId: string = "cards"
  ) {
    this.cardParser = new CardParser();
    this.lorebooksService = new LorebooksService(this.dbService);
  }

  /**
   * Обрабатывает один PNG файл (без полного рескана папки).
   * Полезно для точечного обновления БД при изменениях, сделанных приложением.
   */
  async syncSingleFile(filePath: string): Promise<void> {
    await this.processFile(filePath);
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
      const files = await this.getAllPngFiles(folderPath);
      logger.infoKey("log.scan.foundPngFiles", { count: files.length });
      opts?.onStart?.(files.length);

      const totalFiles = files.length;
      let processedFiles = 0;
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

      // Обрабатываем файлы с ограничением конкурентности
      const promises = files.map((file) =>
        this.limit(async () => {
          try {
            await this.processFile(file);
          } finally {
            processedFiles += 1;
            emitProgress();
          }
        })
      );
      await Promise.all(promises);

      // Очищаем удаленные файлы
      await this.cleanupDeletedFiles();

      logger.infoKey("log.scan.done", { count: files.length });
      // final progress snapshot
      if (processedFiles !== totalFiles) {
        processedFiles = totalFiles;
      }
      opts?.onProgress?.(processedFiles, totalFiles);

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
   * Обрабатывает один PNG файл
   * @param filePath Путь к файлу
   */
  private async processFile(filePath: string): Promise<void> {
    try {
      // Отмечаем файл как обработанный
      this.scannedFiles.add(filePath);

      // Получаем статистику файла
      const stats = statSync(filePath);
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
      }>(
        `SELECT 
          cf.card_id,
          cf.file_mtime,
          cf.file_birthtime,
          cf.file_size,
          c.prompt_tokens_est as prompt_tokens_est
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
        return;
      }

      // Парсим карточку через CardParser
      const extractedData = this.cardParser.parse(filePath);
      if (!extractedData) {
        logger.errorMessageKey("error.scan.parseCardFailed", { filePath });
        return;
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
      let postCommitEnsureAvatarFor: string | null = null;

      // Генерируем миниатюру (только если карточка новая или миниатюра отсутствует)
      let avatarPath: string | null = null;
      if (!existingFile && createdNewCard) {
        avatarPath = await generateThumbnail(filePath, cardId);
      } else {
        // Проверяем, есть ли уже миниатюра
        const existingCard = this.dbService.queryOne<{
          avatar_path: string | null;
        }>("SELECT avatar_path FROM cards WHERE id = ?", [cardId]);
        if (!existingCard?.avatar_path) {
          avatarPath = await generateThumbnail(filePath, cardId);
        } else {
          avatarPath = existingCard.avatar_path;
        }
      }

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

      const characterBook = extractedData.character_book;

      const alternateGreetingsCount = Array.isArray(
        extractedData.alternate_greetings
      )
        ? extractedData.alternate_greetings.filter(
            (g) => (g ?? "").trim().length > 0
          ).length
        : 0;

      // Обеспечиваем существование тегов в таблице tags
      if (normalizedTags.length > 0) {
        const tagService = createTagService(this.dbService.getDatabase());
        tagService.ensureTagsExist(normalizedTags);
      }

      // Сохраняем оригинальные данные для экспорта
      const dataJson = JSON.stringify(extractedData.original_data);
      const createdAt = fileCreatedAt;

      // Записываем в БД в транзакции
      this.dbService.transaction((db) => {
        const dbService = createDatabaseService(db);
        const loreService = new LorebooksService(dbService);

        // Если файл уже был в БД, обновляем карточку
        if (existingFile) {
          // Обновляем карточку
          dbService.execute(
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
              contentHash,
              name,
              description,
              tags,
              creator,
              specVersion,
              avatarPath,
              createdAt,
              dataJson,
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
              existingFile.card_id,
            ]
          );

          // Синхронизация лорабука для существующей карточки
          if (characterBook) {
            loreService.upsertFromCharacterBook({
              cardId: existingFile.card_id,
              characterBook,
              now: fileMtime,
            });
          } else {
            loreService.detachCard(existingFile.card_id);
          }

          // Обновляем информацию о файле
          dbService.execute(
            `UPDATE card_files SET 
              file_mtime = ?, 
              file_birthtime = ?,
              file_size = ?,
              folder_path = ?
            WHERE file_path = ?`,
            [fileMtime, createdAt, fileSize, dirname(filePath), filePath]
          );
        } else {
          // Для новых file_path: либо создаём карточку, либо привязываем к существующей по (library_id, content_hash).
          if (createdNewCard && cardId) {
            try {
              dbService.execute(
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
                  contentHash,
                  name,
                  description,
                  tags,
                  creator,
                  specVersion,
                  avatarPath,
                  createdAt,
                  dataJson,
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
                ]
              );
            } catch (e) {
              // Гонка: другая задача успела вставить ту же карточку (library_id, content_hash).
              const dup = dbService.queryOne<{
                id: string;
                avatar_path: string | null;
              }>(
                `SELECT id, avatar_path FROM cards WHERE library_id = ? AND content_hash = ? LIMIT 1`,
                [this.libraryId, contentHash]
              );
              if (!dup?.id) throw e;

              // Помечаем как дубль и переиспользуем существующий cardId
              isDuplicateByHash = true;
              postCommitEnsureAvatarFor = dup.avatar_path ? null : dup.id;

              // Если мы уже сгенерировали миниатюру для "лишнего" id, удалим её,
              // а при необходимости сгенерируем для существующей карточки.
              if (avatarPath) {
                const createdUuid = avatarPath
                  .split("/")
                  .pop()
                  ?.replace(".webp", "");
                if (createdUuid) {
                  // best-effort cleanup
                  void deleteThumbnail(createdUuid);
                }
              }

              cardId = dup.id;
            }
          }

          if (!cardId) throw new Error("cardId is not resolved");

          // Если это дубль по хэшу (или мы его таким определили в гонке),
          // и миниатюра была сгенерирована (или уже существует), гарантируем,
          // что avatar_path у карточки заполнен (не перетирая существующее).
          if (isDuplicateByHash && avatarPath) {
            dbService.execute(
              `UPDATE cards SET avatar_path = COALESCE(avatar_path, ?) WHERE id = ?`,
              [avatarPath, cardId]
            );
          }

          // Привязываем файл к cardId (и для новой карточки, и для дубля по хэшу)
          dbService.execute(
            `INSERT INTO card_files (file_path, card_id, file_mtime, file_birthtime, file_size, folder_path)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
              filePath,
              cardId,
              fileMtime,
              createdAt,
              fileSize,
              dirname(filePath),
            ]
          );

          // Синхронизация лорабука для новой карточки или дубля по хэшу
          if (characterBook) {
            loreService.upsertFromCharacterBook({
              cardId,
              characterBook,
              now: fileMtime,
            });
          } else {
            loreService.detachCard(cardId);
          }
        }

        // Синхронизируем связи card_tags (точная фильтрация по тегам)
        // Перезаписываем полностью при каждом обновлении карточки
        dbService.execute(`DELETE FROM card_tags WHERE card_id = ?`, [cardId]);
        if (tagRawNames.length > 0) {
          for (const rawName of tagRawNames) {
            dbService.execute(
              `INSERT OR IGNORE INTO card_tags (card_id, tag_rawName) VALUES (?, ?)`,
              [cardId, rawName]
            );
          }
        }
      });

      // Сохраняем JSON файл с данными карточки (только если включено через переменную окружения)
      if (process.env.ENABLE_JSON_CACHE === "true") {
        const jsonDir = join(process.cwd(), "data", "cache", "json");
        await ensureDir(jsonDir);
        const jsonPath = join(jsonDir, `${cardId}.json`);
        const jsonData = {
          db: {
            id: cardId,
            cardId,
            name,
            description,
            tags,
            creator,
            specVersion,
            avatarPath,
            createdAt,
            dataJson: extractedData.original_data,
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
          },
          raw: {
            data: extractedData.original_data,
            spec_version: specVersion,
          },
        };
        await writeFile(jsonPath, JSON.stringify(jsonData, null, 2), "utf-8");
      }

      // В редких случаях гонки, если карточка была создана параллельно без avatar_path,
      // попробуем добить миниатюру уже после транзакции.
      if (postCommitEnsureAvatarFor) {
        const current = this.dbService.queryOne<{ avatar_path: string | null }>(
          "SELECT avatar_path FROM cards WHERE id = ?",
          [postCommitEnsureAvatarFor]
        );
        if (!current?.avatar_path) {
          const p = await generateThumbnail(
            filePath,
            postCommitEnsureAvatarFor
          );
          this.dbService.execute(
            "UPDATE cards SET avatar_path = ? WHERE id = ?",
            [p, postCommitEnsureAvatarFor]
          );
        }
      }
    } catch (error) {
      logger.errorKey(error, "error.scan.processFileFailed", { filePath });
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

      // Проверяем каждый файл
      for (const dbFile of dbFiles) {
        if (!existsSync(dbFile.file_path)) {
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
