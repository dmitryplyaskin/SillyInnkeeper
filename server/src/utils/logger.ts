import { consola } from "consola";
import { t, type I18nParams } from "../i18n/i18n";

const level = process.env.NODE_ENV === "development" ? 7 : 5; // debug : info
const base = consola.create({ level }).withTag("server");

function isTruthyEnv(v: unknown): boolean {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function shouldSuppressUnparsableCardErrorLog(key: string): boolean {
  // NOTE: env is loaded via `server/src/config/env.ts`, but `logger` can be imported before that module executes.
  // Therefore we read process.env lazily on every call.
  if (!isTruthyEnv(process.env.DISABLE_SERVER_CARD_ERROR_LOGS)) {
    return false;
  }

  // Suppress only "card cannot be parsed" noise (scan/card-parser/png-parser).
  if (key === "error.scan.parseCardFailed") return true;
  if (key.startsWith("error.cardParser.")) return true;
  if (key.startsWith("error.png.")) return true;

  return false;
}

/**
 * Единый logger (красивый вывод через consola).
 * Поддерживает как «готовые строки», так и ключи i18n.
 */
export const logger = {
  info: (message: string, ...args: any[]): void => {
    base.info(message, ...args);
  },
  infoKey: (key: string, params?: I18nParams, ...args: any[]): void => {
    base.info(t(key, params), ...args);
  },

  warn: (message: string, ...args: any[]): void => {
    base.warn(message, ...args);
  },
  warnKey: (key: string, params?: I18nParams, ...args: any[]): void => {
    base.warn(t(key, params), ...args);
  },

  debug: (message: string, ...args: any[]): void => {
    base.debug(message, ...args);
  },
  debugKey: (key: string, params?: I18nParams, ...args: any[]): void => {
    base.debug(t(key, params), ...args);
  },

  error: (error: unknown, message?: string, ...args: any[]): void => {
    if (message) {
      base.error(message, error, ...args);
      return;
    }
    base.error(error, ...args);
  },
  errorMessage: (message: string, ...args: any[]): void => {
    base.error(message, ...args);
  },
  errorKey: (
    error: unknown,
    key: string,
    params?: I18nParams,
    ...args: any[]
  ): void => {
    if (shouldSuppressUnparsableCardErrorLog(key)) return;
    base.error(t(key, params), error, ...args);
  },
  errorMessageKey: (key: string, params?: I18nParams, ...args: any[]): void => {
    if (shouldSuppressUnparsableCardErrorLog(key)) return;
    base.error(t(key, params), ...args);
  },
};
