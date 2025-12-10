import { TextInput, Button, Text, Stack, Alert, Paper } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useUnit } from "effector-react";
import { saveSettingsFx, $error, $isLoading } from "@/entities/settings";
import type { Settings } from "@/shared/types/settings";

export function SettingsForm() {
  const [error, isLoading, saveSettingsFn] = useUnit([
    $error,
    $isLoading,
    saveSettingsFx,
  ]);

  const form = useForm<{ cardsFolderPath: string; sillytavenrPath: string }>({
    initialValues: {
      cardsFolderPath: "",
      sillytavenrPath: "",
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

  const handleSubmit = form.onSubmit((values) => {
    const transformed: Settings = {
      cardsFolderPath: values.cardsFolderPath?.trim() || null,
      sillytavenrPath: values.sillytavenrPath?.trim() || null,
    };
    saveSettingsFn(transformed);
  });

  return (
    <Paper shadow="md" p="xl" radius="md" withBorder maw={500}>
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Text size="lg" fw={500}>
            Настройки приложения
          </Text>

          <Text size="sm" c="dimmed">
            Укажите пути к необходимым папкам для работы приложения
          </Text>

          {error && (
            <Alert color="red" title="Ошибка">
              {error}
            </Alert>
          )}

          <TextInput
            label="Путь к папке с картами"
            placeholder="C:\path\to\cards"
            required
            {...form.getInputProps("cardsFolderPath")}
          />

          <TextInput
            label="Путь к SillyTavern"
            placeholder="C:\path\to\sillytavern (опционально)"
            {...form.getInputProps("sillytavenrPath")}
          />

          <Button type="submit" loading={isLoading}>
            Сохранить
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}
