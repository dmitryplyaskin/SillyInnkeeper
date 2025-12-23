const ru = {
  // logs
  "log.scan.start": "Начало сканирования папки: {folderPath}",
  "log.scan.foundPngFiles": "Найдено {count} PNG файлов",
  "log.scan.done": "Сканирование завершено. Обработано файлов: {count}",
  "log.scan.foundDeletedFilesToCleanup":
    "Найдено {count} удаленных файлов для очистки",
  "log.databaseExample.inserted":
    "Вставлено строк: {changes}, последний ID: {lastId}",

  // errors (internal / logs)
  "error.scan.folderNotExists": "Папка не существует: {folderPath}",
  "error.scan.scanFolderFailed": "Ошибка при сканировании папки {folderPath}:",
  "error.scan.parseCardFailed": "Не удалось распарсить карточку из {filePath}",
  "error.scan.processFileFailed": "Ошибка при обработке файла {filePath}:",
  "error.scan.cleanupDeletedFilesFailed":
    "Ошибка при очистке удаленных файлов:",

  "error.png.invalidPng": "Файл {filePath} не является валидным PNG",
  "error.png.textChunkInsufficientData":
    "Недостаточно данных для чтения чанка tEXt в файле {filePath}",
  "error.png.decodeCcv3Failed":
    "Ошибка при декодировании данных карточки ccv3 из {filePath}:",
  "error.png.decodeCharaFailed":
    "Ошибка при декодировании данных карточки chara из {filePath}:",
  "error.png.parseFailed": "Ошибка при парсинге PNG файла {filePath}:",

  "error.cardParser.noMetadata":
    "Не удалось найти метаданные карточки в файле: {filePath}",
  "error.cardParser.parsePngFailed":
    "Ошибка при парсинге PNG файла {filePath}:",
  "error.cardParser.parseCard": "Ошибка при парсинге карточки{fileInfo}",
  "error.cardParser.errorType": "Тип ошибки: {errorType}",
  "error.cardParser.details": "Детали: {details}",
  "error.cardParser.extractFailed":
    "Ошибка при извлечении данных карточки{fileInfo}:",
  "error.cardParser.fileInfo": " (файл: {filePath})",
  "error.cardParser.validationUnknown": "Неизвестная ошибка валидации",
  "error.cardParser.errorType.unknownDataStructure":
    "Неизвестная структура данных",
  "error.cardParser.errorType.invalidSpec": "Неверная спецификация: {spec}",
  "error.cardParser.errorType.incompleteV1":
    "Неполные данные V1 (отсутствуют обязательные поля)",
  "error.cardParser.errorType.missingRequiredFields":
    "Отсутствуют обязательные поля",
  "error.cardParser.errorType.extractionError": "Ошибка извлечения данных",

  "error.thumbnail.generateFailed":
    "Ошибка при генерации миниатюры для {sourcePath}:",
  "error.thumbnail.deleteFailed": "Ошибка при удалении миниатюры {uuid}:",

  // api errors (responses)
  "api.internal": "Внутренняя ошибка сервера",

  "api.settings.invalid_format":
    "Неверный формат данных. Ожидается объект с полями cardsFolderPath, sillytavenrPath и (опционально) language",
  "api.settings.invalid_language": "Неверный язык: {language}",
  "api.settings.path_not_exists": "Путь не существует: {path}",
  "api.settings.get_failed": "Не удалось получить настройки",
  "api.settings.update_failed": "Не удалось обновить настройки",

  "api.viewSettings.invalid_format":
    "Неверный формат данных. columnsCount должен быть 3, 5 или 7, isCensored должен быть boolean",
  "api.viewSettings.get_failed": "Не удалось получить настройки отображения",
  "api.viewSettings.update_failed": "Не удалось обновить настройки отображения",

  "api.tags.name_invalid":
    "Поле name обязательно и должно быть строкой не более 255 символов",
  "api.tags.not_found": "Тег с указанным ID не найден",
  "api.tags.already_exists": "Тег с таким именем уже существует",
  "api.tags.list_failed": "Не удалось получить список тегов",
  "api.tags.get_failed": "Не удалось получить тег",
  "api.tags.create_failed": "Не удалось создать тег",
  "api.tags.update_failed": "Не удалось обновить тег",
  "api.tags.delete_failed": "Не удалось удалить тег",

  "api.cards.invalid_created_from": "Некорректный created_from",
  "api.cards.invalid_created_to": "Некорректный created_to",
  "api.cards.list_failed": "Не удалось получить список карточек",
  "api.cards.get_failed": "Не удалось получить карточку",
  "api.cards.not_found": "Карточка не найдена",
  "api.cards.filters_failed": "Не удалось получить данные фильтров карточек",
  "api.cards.export_failed": "Не удалось экспортировать PNG карточки",
  "api.cards.invalid_card_json": "Некорректные данные карточки для сохранения",
  "api.cards.save_failed": "Не удалось сохранить карточку",
  "api.export.invalid_data_json": "Некорректные данные карточки для экспорта",

  // lorebooks API
  "api.lorebooks.list_failed": "Не удалось получить список лорбуков",
  "api.lorebooks.get_failed": "Не удалось получить лорбук",
  "api.lorebooks.create_failed": "Не удалось создать лорбук",
  "api.lorebooks.update_failed": "Не удалось обновить лорбук",
  "api.lorebooks.delete_failed": "Не удалось удалить лорбук",
  "api.lorebooks.not_found": "Лорбук не найден",
  "api.lorebooks.invalid_data": "Некорректные данные лорбука",
  "api.lorebooks.duplicate":
    "Лорбук с таким содержимым уже существует (дубликат по контент‑хэшу)",
  "api.lorebooks.in_use":
    "Нельзя удалить лорбук: он всё ещё привязан к карточкам (используйте force=1 для принудительного удаления)",

  "api.image.not_found": "Изображение не найдено",
  "api.image.file_not_found": "Файл изображения не найден",
  "api.image.get_failed": "Не удалось получить изображение",

  "api.thumbnail.not_found": "Миниатюра не найдена",
  "api.thumbnail.get_failed": "Не удалось получить миниатюру",

  "api.explorer.invalid_format":
    "Неверный формат данных. Ожидается объект с полем path (string) или title (string)",
  "api.explorer.path_not_exists": "Путь не существует: {path}",
  "api.explorer.not_a_file": "Путь не является файлом: {path}",
  "api.explorer.not_a_directory": "Путь не является директорией: {path}",
  "api.explorer.unsupported_platform": "Неподдерживаемая платформа: {platform}",
  "api.explorer.dialog_not_available":
    "Диалог выбора папки недоступен в этой системе",
  "api.explorer.open_failed": "Не удалось открыть в проводнике",

  // logs (localized)
  "log.server.readLanguageSettingsFailed": "Ошибка при чтении настроек языка",
  "log.server.started": "Сервер запущен на {host}:{port}",
  "log.server.initScannerFailed": "Ошибка при инициализации сканера",
  "log.server.startFsWatcherFailed": "Ошибка при запуске FS watcher",
  "log.server.signalReceived":
    "Получен сигнал {signal}, начинаем graceful shutdown...",
  "log.server.httpClosed": "HTTP сервер закрыт",
  "log.server.closeSseWatcherFailed": "Ошибка при закрытии SSE/watcher",
  "log.server.dbClosed": "База данных закрыта",
  "log.server.dbCloseFailed": "Ошибка при закрытии базы данных",
  "log.server.forceShutdown": "Graceful shutdown не завершился вовремя",
  "log.server.startFailed": "Ошибка при запуске сервера",

  "error.settings.restartFsWatcherFailed": "Ошибка при перезапуске FS watcher",
  "error.settings.postSettingsSyncFailed":
    "Ошибка при запуске синхронизации после settings",

  "log.sse.clientConnected": "SSE клиент подключен: {clientId} (total={total})",
  "log.sse.clientDisconnected":
    "SSE клиент отключен: {clientId} (total={total})",
  "error.sse.connectionFailed": "Ошибка при установке SSE соединения",

  "api.st.invalid_cardId": "Некорректный cardId",
  "api.st.invalid_ok": "Некорректное поле ok (ожидается boolean)",
  "api.st.play_failed": "Не удалось отправить команду Play в SillyTavern",
  "api.st.import_result_failed":
    "Не удалось принять результат импорта из SillyTavern",

  "log.st.playRequested": "ST play: запрос на карточку {cardId}",
  "log.st.playBroadcasted": "ST play: событие отправлено для карточки {cardId}",
  "log.st.importResultReceived":
    "ST import-result: получен результат для карточки {cardId} (ok={ok})",

  "log.fsWatcher.triggerScan": "FS watcher trigger scan ({reason})",
  "log.fsWatcher.started": "FS watcher started: {folderPath}",
  "error.fsWatcher.error": "FS watcher error",

  "log.cardsSync.scanDone":
    'scan:done origin={origin} at={at} durationMs={durationMs} path="{path}"',
  "log.cardsSync.scanStart": 'scan:start origin={origin} at={at} path="{path}"',
  "log.cardsSync.resynced":
    "cards:resynced rev={revision} origin={origin} +{added} -{removed} ({durationMs}ms)",
  "error.cardsSync.failed": "Ошибка в CardsSyncOrchestrator",

  "log.scanner.autoStart": "Автозапуск сканирования папки: {folderPath}",
  "warn.scanner.deprecatedInitializeScanner":
    "initializeScanner(db) устарел: используйте initializeScannerWithOrchestrator(orchestrator)",
  "log.scanner.skipNoPath":
    "cardsFolderPath не указан или папка не существует, сканирование не запущено",
  "error.scanner.readSettingsFailed":
    "Ошибка при чтении настроек для автозапуска сканирования",
} as const;

export default ru;
