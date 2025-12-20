import { initReactI18next } from "react-i18next";
import { i18n } from "./i18n";
import en from "./locales/en";
import ru from "./locales/ru";
import zhCN from "./locales/zh-CN";

function detectBrowserLanguage(): "ru" | "en" | "zh-CN" {
  const candidates = [
    ...(typeof navigator !== "undefined" ? navigator.languages ?? [] : []),
    ...(typeof navigator !== "undefined" ? [navigator.language] : []),
  ].filter(Boolean);

  for (const lang of candidates) {
    const normalized = String(lang).toLowerCase();
    if (normalized.startsWith("ru")) return "ru";
    if (normalized.startsWith("zh")) return "zh-CN";
  }
  return "en";
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ru: { translation: ru },
      "zh-CN": { translation: zhCN },
    },
    lng: detectBrowserLanguage(),
    fallbackLng: "en",
    supportedLngs: ["en", "ru", "zh-CN"],
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  });
}

export default i18n;
