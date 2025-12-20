import { Center } from "@mantine/core";
import { useUnit } from "effector-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { $settings } from "@/entities/settings";
import { SettingsForm } from "@/features/settings-form";
import i18n from "@/shared/i18n/i18n";
import type { Settings } from "@/shared/types/settings";

function getBrowserLanguage(): "ru" | "en" | "zh-CN" {
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

export function PathsSetupScreen() {
  const settings = useUnit($settings);
  const browserLanguage = getBrowserLanguage();
  const { t } = useTranslation();

  useEffect(() => {
    void i18n.changeLanguage(browserLanguage);
  }, [browserLanguage]);

  const initialSettings: Settings = {
    cardsFolderPath: null,
    sillytavenrPath: settings?.sillytavenrPath ?? null,
    language: browserLanguage,
  };

  return (
    <Center h="100vh" p="md">
      <SettingsForm
        initialSettings={initialSettings}
        title={t("setup.firstRunTitle")}
        description={t("setup.firstRunDescription")}
        applyLanguageOnChange
      />
    </Center>
  );
}
