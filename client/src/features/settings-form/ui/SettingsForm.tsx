import {
  TextInput,
  Button,
  Text,
  Stack,
  Alert,
  Paper,
  Select,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useUnit } from "effector-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { saveSettingsFx, $error, $isLoading } from "@/entities/settings";
import i18n from "@/shared/i18n/i18n";
import type { Settings } from "@/shared/types/settings";

type SettingsFormValues = {
  cardsFolderPath: string;
  sillytavenrPath: string;
  language: "ru" | "en";
};

export type SettingsFormProps = {
  initialSettings: Settings;
  onSaved?: () => void;
  title?: string;
  description?: string;
  /**
   * Apply language immediately when user changes language in the select.
   * Useful for first-run setup screen; should be false in settings modal.
   */
  applyLanguageOnChange?: boolean;
  /**
   * `paper` — самостоятельная карточка (для fullscreen setup).
   * `plain` — без внешнего контейнера (для использования внутри Modal).
   */
  variant?: "paper" | "plain";
  /**
   * Показывать ли заголовок/описание внутри формы (в модалке обычно false).
   */
  showHeader?: boolean;
};

export function SettingsForm({
  initialSettings,
  onSaved,
  title,
  description,
  applyLanguageOnChange = false,
  variant = "paper",
  showHeader = true,
}: SettingsFormProps) {
  const { t } = useTranslation();
  const [error, isLoading, saveSettingsFn] = useUnit([
    $error,
    $isLoading,
    saveSettingsFx,
  ]);

  const resolvedTitle = title ?? t("setup.appSettingsTitle");
  const resolvedDescription = description ?? t("settingsForm.description");

  const form = useForm<SettingsFormValues>({
    initialValues: {
      cardsFolderPath: initialSettings.cardsFolderPath ?? "",
      sillytavenrPath: initialSettings.sillytavenrPath ?? "",
      language: initialSettings.language ?? "ru",
    },
    validate: {
      cardsFolderPath: (value) => {
        if (!value || value.trim() === "") {
          return i18n.t("settingsForm.cardsFolderPathRequired");
        }
        return null;
      },
    },
  });

  useEffect(() => {
    form.setValues({
      cardsFolderPath: initialSettings.cardsFolderPath ?? "",
      sillytavenrPath: initialSettings.sillytavenrPath ?? "",
      language: initialSettings.language ?? "ru",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    initialSettings.cardsFolderPath,
    initialSettings.sillytavenrPath,
    initialSettings.language,
  ]);

  const handleSubmit = form.onSubmit(async (values) => {
    const transformed: Settings = {
      cardsFolderPath: values.cardsFolderPath?.trim() || null,
      sillytavenrPath: values.sillytavenrPath?.trim() || null,
      language: values.language,
    };
    try {
      await saveSettingsFn(transformed);
      onSaved?.();
    } catch {
      // Ошибка уже попадёт в $error (через failData)
    }
  });

  const content = (
    <form onSubmit={handleSubmit}>
      <Stack gap="md">
        {showHeader && (
          <>
            <Text size="lg" fw={500}>
              {resolvedTitle}
            </Text>

            <Text size="sm" c="dimmed">
              {resolvedDescription}
            </Text>
          </>
        )}

        {error && (
          <Alert color="red" title={t("errors.generic")}>
            {error}
          </Alert>
        )}

        <Select
          label={t("language.labelBilingual")}
          placeholder={t("language.placeholder")}
          data={[
            { value: "ru", label: t("language.ruBilingual") },
            { value: "en", label: t("language.enBilingual") },
          ]}
          value={form.values.language}
          onChange={(v) => {
            if (!v) return;
            form.setFieldValue("language", v as SettingsFormValues["language"]);
            if (applyLanguageOnChange) {
              void i18n.changeLanguage(v);
            }
          }}
        />

        <TextInput
          label={t("settingsForm.cardsFolderPathLabel")}
          placeholder={t("settingsForm.cardsFolderPathPlaceholder")}
          required
          {...form.getInputProps("cardsFolderPath")}
        />

        <TextInput
          label={t("settingsForm.sillyTavernPathLabel")}
          placeholder={t("settingsForm.sillyTavernPathPlaceholder")}
          {...form.getInputProps("sillytavenrPath")}
        />

        <Button type="submit" loading={isLoading} fullWidth>
          {t("actions.save")}
        </Button>
      </Stack>
    </form>
  );

  if (variant === "plain") return content;

  return (
    <Paper shadow="md" p="xl" radius="md" withBorder maw={520} w="100%">
      {content}
    </Paper>
  );
}
