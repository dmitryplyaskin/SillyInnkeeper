import { Center } from "@mantine/core";
import { useUnit } from "effector-react";
import { $settings } from "@/entities/settings";
import { SettingsForm } from "@/features/settings-form";
import type { Settings } from "@/shared/types/settings";

function getBrowserLanguage(): "ru" | "en" {
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

export function PathsSetupScreen() {
  const settings = useUnit($settings);
  const browserLanguage = getBrowserLanguage();

  const initialSettings: Settings = {
    cardsFolderPath: null,
    sillytavenrPath: settings?.sillytavenrPath ?? null,
    language: browserLanguage,
  };

  return (
    <Center h="100vh" p="md">
      <SettingsForm
        initialSettings={initialSettings}
        title="Первый запуск"
        description="Выберите язык и укажите пути, необходимые для работы приложения"
      />
    </Center>
  );
}
