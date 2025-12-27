const en = {
  // logs
  "log.scan.start": "Starting folder scan: {folderPath}",
  "log.scan.foundPngFiles": "Found {count} PNG files",
  "log.scan.done": "Scan finished. Processed files: {count}",
  "log.scan.foundDeletedFilesToCleanup":
    "Found {count} deleted files to cleanup",
  "log.databaseExample.inserted": "Inserted rows: {changes}, last ID: {lastId}",

  // errors (internal / logs)
  "error.scan.folderNotExists": "Folder does not exist: {folderPath}",
  "error.scan.scanFolderFailed": "Failed to scan folder {folderPath}",
  "error.scan.parseCardFailed": "Failed to parse card from {filePath}",
  "error.scan.processFileFailed": "Failed to process file {filePath}",
  "error.scan.cleanupDeletedFilesFailed": "Failed to cleanup deleted files",

  "error.png.invalidPng": "File {filePath} is not a valid PNG",
  "error.png.textChunkInsufficientData":
    "Not enough data to read tEXt chunk in file {filePath}",
  "error.png.decodeCcv3Failed":
    "Failed to decode ccv3 card data from {filePath}",
  "error.png.decodeCharaFailed":
    "Failed to decode chara card data from {filePath}",
  "error.png.parseFailed": "Failed to parse PNG file {filePath}",

  "error.cardParser.noMetadata":
    "Could not find card metadata in file: {filePath}",
  "error.cardParser.parsePngFailed": "Failed to parse PNG file {filePath}",
  "error.cardParser.parseCard": "Failed to parse card{fileInfo}",
  "error.cardParser.errorType": "Error type: {errorType}",
  "error.cardParser.details": "Details: {details}",
  "error.cardParser.extractFailed": "Failed to extract card data{fileInfo}",
  "error.cardParser.fileInfo": " (file: {filePath})",
  "error.cardParser.validationUnknown": "Unknown validation error",
  "error.cardParser.errorType.unknownDataStructure": "Unknown data structure",
  "error.cardParser.errorType.invalidSpec": "Invalid spec: {spec}",
  "error.cardParser.errorType.incompleteV1":
    "Incomplete V1 data (missing required fields)",
  "error.cardParser.errorType.missingRequiredFields": "Missing required fields",
  "error.cardParser.errorType.extractionError": "Data extraction error",

  "error.thumbnail.generateFailed":
    "Failed to generate thumbnail for {sourcePath}",
  "error.thumbnail.deleteFailed": "Failed to delete thumbnail {uuid}",

  // api errors (responses)
  "api.internal": "Internal server error",

  "api.settings.invalid_format":
    "Invalid data format. Expected object with cardsFolderPath, sillytavenrPath and (optional) language",
  "api.settings.invalid_language": "Invalid language: {language}",
  "api.settings.path_not_exists": "Path does not exist: {path}",
  "api.settings.get_failed": "Could not get settings",
  "api.settings.update_failed": "Could not update settings",

  "api.importSettings.invalid_format":
    "Invalid data format. Expected object with sourceFolderPath, importMode, duplicatesMode",
  "api.importSettings.get_failed": "Could not get import settings",
  "api.importSettings.update_failed": "Could not update import settings",
  "api.importSettings.invalid_import_mode": "Invalid import mode: {importMode}",
  "api.importSettings.invalid_duplicates_mode":
    "Invalid duplicates mode: {duplicatesMode}",
  "api.importSettings.not_a_directory": "Path is not a directory: {path}",

  "api.viewSettings.invalid_format":
    "Invalid data format. columnsCount must be 3, 5 or 7, isCensored must be boolean",
  "api.viewSettings.get_failed": "Could not get view settings",
  "api.viewSettings.update_failed": "Could not update view settings",

  "api.tags.name_invalid":
    "Field name is required and must be a string up to 255 characters",
  "api.tags.not_found": "Tag with given ID was not found",
  "api.tags.already_exists": "A tag with this name already exists",
  "api.tags.list_failed": "Could not get tags list",
  "api.tags.get_failed": "Could not get tag",
  "api.tags.create_failed": "Could not create tag",
  "api.tags.update_failed": "Could not update tag",
  "api.tags.delete_failed": "Could not delete tag",

  "api.tags.bulk_edit.invalid_format": "Invalid bulk tags edit data format",
  "api.tags.bulk_edit.no_tags_selected": "No tags selected for bulk edit",
  "api.tags.bulk_edit.target_required": "Target tag is required for replace",
  "api.tags.bulk_edit.target_invalid": "Invalid target tag for replace",
  "api.tags.bulk_edit.target_not_found": "Target tag was not found: {rawName}",
  "api.tags.bulk_edit.already_running": "Bulk tags edit is already running",
  "api.tags.bulk_edit.cardsFolderPath_not_set":
    "Library folder is not configured (cardsFolderPath)",
  "api.tags.bulk_edit.start_failed": "Could not start bulk tags edit",

  "api.cards.invalid_created_from": "Invalid created_from",
  "api.cards.invalid_created_to": "Invalid created_to",
  "api.cards.invalid_search_query": "Invalid search query",
  "api.cards.list_failed": "Could not get cards list",
  "api.cards.get_failed": "Could not get card",
  "api.cards.not_found": "Card was not found",
  "api.cards.filters_failed": "Could not get cards filters data",
  "api.cards.export_failed": "Could not export card PNG",
  "api.cards.invalid_card_json": "Invalid card data for save",
  "api.cards.save_failed": "Could not save card",

  "api.cardsImport.invalid_format":
    "Invalid data format. Expected object with sourceFolderPath, importMode, duplicatesMode",
  "api.cardsImport.already_running": "Import is already running",
  "api.cardsImport.path_not_exists": "Path does not exist: {path}",
  "api.cardsImport.not_a_directory": "Path is not a directory: {path}",
  "api.cardsImport.cardsFolderPath_not_set":
    "Library folder is not configured (cardsFolderPath)",
  "api.cardsImport.start_failed": "Could not start import",
  "api.cards.invalid_card_ids":
    "Invalid card_ids (expected a non-empty array of card IDs)",
  "api.cards.some_not_found": "Some cards were not found",
  "api.cards.bulk_delete_failed": "Could not delete selected cards",
  "api.export.invalid_data_json": "Invalid card data for export",

  "api.db.fts5_not_available":
    "Full-text search is not available (FTS5 is missing in SQLite build)",

  // pattern rules API
  "api.pattern_rules.invalid_rules": "Invalid pattern rules",
  "api.pattern_rules.get_failed": "Could not get pattern rules",
  "api.pattern_rules.update_failed": "Could not save pattern rules",
  "api.pattern_rules.status_failed": "Could not get patterns search status",
  "api.pattern_rules.run_failed": "Could not start patterns search",
  "api.pattern_rules.already_running": "Patterns search is already running",

  // lorebooks API
  "api.lorebooks.list_failed": "Could not get lorebooks list",
  "api.lorebooks.get_failed": "Could not get lorebook",
  "api.lorebooks.create_failed": "Could not create lorebook",
  "api.lorebooks.update_failed": "Could not update lorebook",
  "api.lorebooks.delete_failed": "Could not delete lorebook",
  "api.lorebooks.not_found": "Lorebook was not found",
  "api.lorebooks.invalid_data": "Invalid lorebook data",
  "api.lorebooks.duplicate":
    "Lorebook with the same content already exists (content hash duplicate)",
  "api.lorebooks.in_use":
    "Cannot delete lorebook: it is still linked to cards (use force=1 to override)",

  "api.image.not_found": "Image was not found",
  "api.image.file_not_found": "Image file was not found",
  "api.image.get_failed": "Could not get image",

  "api.thumbnail.not_found": "Thumbnail was not found",
  "api.thumbnail.get_failed": "Could not get thumbnail",

  "api.explorer.invalid_format":
    "Invalid data format. Expected object with field path (string) or title (string)",
  "api.explorer.path_not_exists": "Path does not exist: {path}",
  "api.explorer.not_a_file": "Path is not a file: {path}",
  "api.explorer.not_a_directory": "Path is not a directory: {path}",
  "api.explorer.unsupported_platform": "Unsupported platform: {platform}",
  "api.explorer.dialog_not_available":
    "Folder picker dialog is not available on this system",
  "api.explorer.open_failed": "Could not open in file explorer",

  // logs (localized)
  "log.server.readLanguageSettingsFailed": "Failed to read language settings",
  "log.server.started": "Server started on {host}:{port}",
  "log.server.initScannerFailed": "Failed to initialize scanner",
  "log.server.startFsWatcherFailed": "Failed to start FS watcher",
  "log.server.signalReceived":
    "Received signal {signal}, starting graceful shutdown...",
  "log.server.httpClosed": "HTTP server closed",
  "log.server.closeSseWatcherFailed": "Failed to close SSE/watcher",
  "log.server.dbClosed": "Database closed",
  "log.server.dbCloseFailed": "Failed to close database",
  "log.server.forceShutdown": "Graceful shutdown did not finish in time",
  "log.server.startFailed": "Failed to start server",

  "error.settings.restartFsWatcherFailed": "Failed to restart FS watcher",
  "error.settings.postSettingsSyncFailed":
    "Failed to start sync after settings update",

  "log.sse.clientConnected": "SSE client connected: {clientId} (total={total})",
  "log.sse.clientDisconnected":
    "SSE client disconnected: {clientId} (total={total})",
  "error.sse.connectionFailed": "Failed to establish SSE connection",

  "api.st.invalid_cardId": "Invalid cardId",
  "api.st.invalid_ok": "Invalid ok field (expected boolean)",
  "api.st.play_failed": "Could not send Play command to SillyTavern",
  "api.st.import_result_failed":
    "Could not accept import result from SillyTavern",

  "log.st.playRequested": "ST play: request for card {cardId}",
  "log.st.playBroadcasted": "ST play: event broadcasted for card {cardId}",
  "log.st.importResultReceived":
    "ST import-result: received result for card {cardId} (ok={ok})",

  "log.fsWatcher.triggerScan": "FS watcher trigger scan ({reason})",
  "log.fsWatcher.started": "FS watcher started: {folderPath}",
  "error.fsWatcher.error": "FS watcher error",

  "log.cardsSync.scanDone":
    'scan:done origin={origin} at={at} durationMs={durationMs} path="{path}"',
  "log.cardsSync.scanStart": 'scan:start origin={origin} at={at} path="{path}"',
  "log.cardsSync.resynced":
    "cards:resynced rev={revision} origin={origin} +{added} -{removed} ({durationMs}ms)",
  "error.cardsSync.failed": "CardsSyncOrchestrator error",

  "error.cardsImport.copyFailed":
    "Failed to copy file (source={source}, target={target})",
  "error.cardsImport.deleteSourceFailed": "Failed to delete source file: {source}",
  "error.cardsImport.requestScanFailed": "Failed to start scan after import",
  "error.cardsImport.failed": "Cards import failed",

  "warn.pattern_rules.regex_runtime_error":
    "Regex runtime error during patterns search (ruleId={ruleId})",
  "error.pattern_rules.cache_update_failed":
    "Failed to update patterns search cache status in DB",

  "error.tags.bulk_edit_failed": "Bulk tags edit failed",

  "log.scanner.autoStart": "Auto-start scan folder: {folderPath}",
  "warn.scanner.deprecatedInitializeScanner":
    "initializeScanner(db) is deprecated: use initializeScannerWithOrchestrator(orchestrator)",
  "log.scanner.skipNoPath":
    "cardsFolderPath is not set or folder does not exist, scan not started",
  "error.scanner.readSettingsFailed":
    "Failed to read settings for auto-start scan",
} as const;

export default en;
