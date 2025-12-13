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
import { saveSettingsFx, $error, $isLoading } from "@/entities/settings";
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
  title = "Настройки приложения",
  description = "Укажите пути к необходимым папкам для работы приложения",
  variant = "paper",
  showHeader = true,
}: SettingsFormProps) {
  const [error, isLoading, saveSettingsFn] = useUnit([
    $error,
    $isLoading,
    saveSettingsFx,
  ]);

  const form = useForm<SettingsFormValues>({
    initialValues: {
      cardsFolderPath: initialSettings.cardsFolderPath ?? "",
      sillytavenrPath: initialSettings.sillytavenrPath ?? "",
      language: initialSettings.language ?? "ru",
    },
    validate: {
      cardsFolderPath: (value) => {
        if (!value || value.trim() === "") {
          return "Путь к папке с картами обязателен";
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
              {title}
            </Text>

            <Text size="sm" c="dimmed">
              {description}
            </Text>
          </>
        )}

        {error && (
          <Alert color="red" title="Ошибка">
            {error}
          </Alert>
        )}

        <Select
          label="Язык"
          placeholder="Выберите язык"
          data={[
            { value: "ru", label: "Русский" },
            { value: "en", label: "English" },
          ]}
          {...form.getInputProps("language")}
        />

        <TextInput
          label="Путь к папке с картами"
          placeholder="C:\\path\\to\\cards"
          required
          {...form.getInputProps("cardsFolderPath")}
        />

        <TextInput
          label="Путь к SillyTavern"
          placeholder="C:\\path\\to\\sillytavern (опционально)"
          {...form.getInputProps("sillytavenrPath")}
        />

        <Button type="submit" loading={isLoading} fullWidth>
          Сохранить
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
