import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { logger } from "../utils/logger";

declare global {
  var __SI_ENV_LOADED__: boolean | undefined;
}

function fileExists(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function parseEnvFile(p: string): Record<string, string> | null {
  try {
    const raw = fs.readFileSync(p, "utf8");
    return dotenv.parse(raw);
  } catch (error) {
    logger.warn(`Failed to read env file: ${p}`, error);
    return null;
  }
}

/**
 * Загружаем env из:
 * - корня репозитория (.env)
 * - server/.env
 *
 * Приоритет:
 * - переменные окружения ОС/процесса имеют наивысший приоритет
 * - server/.env может переопределить значения, пришедшие из корневого .env
 */
export function loadEnvOnce(): void {
  if (globalThis.__SI_ENV_LOADED__) return;
  globalThis.__SI_ENV_LOADED__ = true;

  // __dirname = server/src/config
  const repoRootEnvPath = path.resolve(__dirname, "../../../.env");
  const serverEnvPath = path.resolve(__dirname, "../../.env");

  const keysFromRoot = new Set<string>();

  const rootParsed = fileExists(repoRootEnvPath)
    ? parseEnvFile(repoRootEnvPath)
    : null;
  if (rootParsed) {
    for (const [k, v] of Object.entries(rootParsed)) {
      if (process.env[k] === undefined) {
        process.env[k] = v;
        keysFromRoot.add(k);
      }
    }
  }

  const serverParsed = fileExists(serverEnvPath)
    ? parseEnvFile(serverEnvPath)
    : null;
  if (serverParsed) {
    for (const [k, v] of Object.entries(serverParsed)) {
      // Не трогаем переменные, которые уже заданы ОС/процессом.
      // Но разрешаем server/.env переопределить значения, которые мы выставили из корневого .env.
      if (process.env[k] === undefined || keysFromRoot.has(k)) {
        process.env[k] = v;
      }
    }
  }
}

// side-effect import support
loadEnvOnce();
