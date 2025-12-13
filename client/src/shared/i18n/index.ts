import { initReactI18next } from "react-i18next";
import { i18n } from "./i18n";
import en from "./locales/en";
import ru from "./locales/ru";

function detectBrowserLanguage(): "ru" | "en" {
  const candidates = [
    ...(typeof navigator !== "undefined" ? navigator.languages ?? [] : []),
    ...(typeof navigator !== "undefined" ? [navigator.language] : []),
  ].filter(Boolean);

  for (const lang of candidates) {
    const normalized = String(lang).toLowerCase();
    if (normalized.startsWith("ru")) return "ru";
  }
  return "en";
}

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ru: { translation: ru },
    },
    lng: detectBrowserLanguage(),
    fallbackLng: "en",
    supportedLngs: ["en", "ru"],
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  });
}

export default i18n;
