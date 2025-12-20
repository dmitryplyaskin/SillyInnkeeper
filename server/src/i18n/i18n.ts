import type { Language } from "../services/settings";
import { getCurrentLanguage } from "./language";
import en from "../locales/en";
import ru from "../locales/ru";
import zhCN from "../locales/zh-CN";

type Dict = Record<string, string>;

const dictionaries: Record<Language, Dict> = {
  en,
  ru,
  "zh-CN": zhCN,
};

export type I18nParams = Record<string, unknown>;

function interpolate(template: string, params?: I18nParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = params[name];
    return value == null ? `{${name}}` : String(value);
  });
}

export function t(key: string, params?: I18nParams, lang?: Language): string {
  const resolvedLang = lang ?? getCurrentLanguage();
  const dict = dictionaries[resolvedLang] ?? dictionaries.en;
  const fallback = dictionaries.en;
  const template = dict[key] ?? fallback[key] ?? key;
  return interpolate(template, params);
}
