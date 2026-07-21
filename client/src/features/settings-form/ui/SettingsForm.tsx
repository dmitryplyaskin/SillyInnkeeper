import {
  TextInput,
  Button,
  Text,
  Stack,
  Alert,
  Paper,
  Select,
  ActionIcon,
  Tooltip,
  Loader,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useUnit } from "effector-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { notifications } from "@mantine/notifications";
import { saveSettingsFx, $error, $isLoading } from "@/entities/settings";
import i18n from "@/shared/i18n/i18n";
import type { Settings } from "@/shared/types/settings";
import { pickFolder } from "@/shared/api/explorer";

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
  const [isPickingFolder, setIsPickingFolder] = useState(false);
  const [isPickingSillyTavernFolder, setIsPickingSillyTavernFolder] =
    useState(false);

  const isAndroid = /android/i.test(navigator.userAgent);

  const handleFolderClick = async (
    setPicking: (v: boolean) => void,
    setField: (path: string) => void,
    validate: (() => void) | undefined
  ) => {
    if (isLoading) return;
    setPicking(true);
    try {
      const res = await pickFolder(t("settingsForm.pickFolderDialogTitle"));
      if (res.path) {
        setField(res.path);
        validate?.();
        return;
      }
      if (!res.cancelled) {
        // Dialog not available (no Termux:API app). User can type path manually.
        notifications.show({
          title: t("settingsForm.cardsFolderPathLabel"),
          message: t("settingsForm.pickFolderFailed"),
          color: "orange",
        });
      }
      // cancelled=true: user cancelled or timed out — silently do nothing
    } catch (e) {
      const msg =
        e instanceof Error && e.message.trim()
          ? e.message
          : t("settingsForm.pickFolderFailed");
      notifications.show({
        title: t("settingsForm.cardsFolderPathLabel"),
        message: msg,
        color: "red",
      });
    } finally {
      setPicking(false);
    }
  };

  const FolderIcon = ({ size = 16 }: { size?: number }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  );

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
          placeholder={
            isAndroid
              ? t("settingsForm.androidPlaceholder")
              : t("settingsForm.cardsFolderPathPlaceholder")
          }
          required
          rightSectionWidth={isAndroid ? 0 : 42}
          rightSection={
            isAndroid ? null : (
              <Tooltip
                label={t("settingsForm.pickFolderTooltip")}
                withArrow
                position="top"
              >
                <ActionIcon
                  variant="subtle"
                  onClick={() =>
                    handleFolderClick(
                      setIsPickingFolder,
                      (p) => {
                        form.setFieldValue("cardsFolderPath", p);
                        form.validateField("cardsFolderPath");
                      },
                      () => form.validateField("cardsFolderPath")
                    )
                  }
                  disabled={isLoading || isPickingFolder}
                  aria-label={t("settingsForm.pickFolderAria")}
                >
                  {isPickingFolder ? <Loader size={16} /> : <FolderIcon />}
                </ActionIcon>
              </Tooltip>
            )
          }
          {...form.getInputProps("cardsFolderPath")}
        />

        <TextInput
          label={t("settingsForm.sillyTavernPathLabel")}
          placeholder={
            isAndroid
              ? t("settingsForm.androidPlaceholder")
              : t("settingsForm.sillyTavernPathPlaceholder")
          }
          rightSectionWidth={isAndroid ? 0 : 42}
          rightSection={
            isAndroid ? null : (
              <Tooltip
                label={t("settingsForm.pickFolderTooltip")}
                withArrow
                position="top"
              >
                <ActionIcon
                  variant="subtle"
                  onClick={() =>
                    handleFolderClick(
                      setIsPickingSillyTavernFolder,
                      (p) => form.setFieldValue("sillytavenrPath", p),
                      undefined
                    )
                  }
                  disabled={isLoading || isPickingSillyTavernFolder}
                  aria-label={t("settingsForm.pickFolderAria")}
                >
                  {isPickingSillyTavernFolder ? (
                    <Loader size={16} />
                  ) : (
                    <FolderIcon />
                  )}
                </ActionIcon>
              </Tooltip>
            )
          }
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
