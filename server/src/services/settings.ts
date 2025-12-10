import { accessSync, constants } from 'node:fs'
import { readFile, writeFile, ensureDir } from 'fs-extra'
import { join } from 'node:path'

export interface Settings {
  cardsFolderPath: string | null
  sillytavenrPath: string | null
}

const SETTINGS_FILE_PATH = join(process.cwd(), 'data', 'settings.json')

const DEFAULT_SETTINGS: Settings = {
  cardsFolderPath: null,
  sillytavenrPath: null
}

/**
 * Проверяет существование пути через fs.accessSync
 * @param path Путь для проверки
 * @throws Error если путь не существует
 */
export function validatePath(path: string): void {
  try {
    accessSync(path, constants.F_OK)
  } catch (error) {
    throw new Error(`Путь не существует: ${path}`)
  }
}

/**
 * Читает настройки из файла. Если файл не существует, создает его с дефолтными значениями.
 * @returns Текущие настройки
 */
export async function getSettings(): Promise<Settings> {
  try {
    const data = await readFile(SETTINGS_FILE_PATH, 'utf-8')
    return JSON.parse(data) as Settings
  } catch (error) {
    // Если файл не существует, создаем его с дефолтными значениями
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await ensureDir(join(process.cwd(), 'data'))
      await writeFile(SETTINGS_FILE_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8')
      return DEFAULT_SETTINGS
    }
    throw error
  }
}

/**
 * Обновляет настройки с валидацией путей
 * @param newSettings Новые настройки
 * @throws Error если какой-то из путей не существует
 */
export async function updateSettings(newSettings: Settings): Promise<Settings> {
  // Валидация путей: если путь указан (не null), проверяем его существование
  if (newSettings.cardsFolderPath !== null) {
    validatePath(newSettings.cardsFolderPath)
  }
  
  if (newSettings.sillytavenrPath !== null) {
    validatePath(newSettings.sillytavenrPath)
  }

  // Убеждаемся, что папка data существует
  await ensureDir(join(process.cwd(), 'data'))
  
  // Сохраняем настройки
  await writeFile(SETTINGS_FILE_PATH, JSON.stringify(newSettings, null, 2), 'utf-8')
  
  return newSettings
}

