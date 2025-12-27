import {
  Alert,
  Button,
  Group,
  Loader,
  Modal,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Tooltip,
  ActionIcon,
} from "@mantine/core";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import {
  $error,
  $importSettings,
  $isLoading,
  $isPickingFolder,
  $isStartingImport,
  $opened,
  closeImportModal,
  duplicatesModeChanged,
  importModeChanged,
  importRequested,
  pickSourceFolderRequested,
  sourceFolderPathChanged,
} from "../model";

function FolderIcon({ size = 16 }: { size?: number }) {
  return (
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
}

export function CardsImportModal() {
  const { t } = useTranslation();
  const [
    opened,
    settings,
    error,
    isLoading,
    isPickingFolder,
    isStarting,
    onClose,
    onPick,
    onChangePath,
    onChangeImportMode,
    onChangeDuplicates,
    onImport,
  ] = useUnit([
    $opened,
    $importSettings,
    $error,
    $isLoading,
    $isPickingFolder,
    $isStartingImport,
    closeImportModal,
    pickSourceFolderRequested,
    sourceFolderPathChanged,
    importModeChanged,
    duplicatesModeChanged,
    importRequested,
  ]);

  const isMove = settings.importMode === "move";
  const canImport = Boolean(settings.sourceFolderPath?.trim());
  const setImportMode = (v: string) => {
    if (v === "copy" || v === "move") onChangeImportMode(v);
  };
  const setDuplicatesMode = (v: string) => {
    if (v === "skip" || v === "copy") onChangeDuplicates(v);
  };

  return (
    <Modal
      opened={opened}
      onClose={() => onClose()}
      title={t("cardsImport.title")}
      centered
      size="md"
      padding="lg"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t("cardsImport.description")}
        </Text>

        {error && (
          <Alert color="red" title={t("errors.generic")}>
            {error}
          </Alert>
        )}

        <TextInput
          label={t("cardsImport.sourceFolderLabel")}
          placeholder={t("cardsImport.sourceFolderPlaceholder")}
          value={settings.sourceFolderPath ?? ""}
          onChange={(e) => onChangePath(e.currentTarget.value)}
          rightSectionWidth={42}
          rightSection={
            <Tooltip
              label={t("cardsImport.pickFolderTooltip")}
              withArrow
              position="top"
            >
              <ActionIcon
                variant="subtle"
                onClick={() => {
                  if (isLoading) return;
                  onPick();
                }}
                disabled={isLoading}
                aria-label={t("cardsImport.pickFolderAria")}
              >
                {isPickingFolder ? <Loader size={16} /> : <FolderIcon />}
              </ActionIcon>
            </Tooltip>
          }
        />

        <Stack gap={6}>
          <Text size="sm" fw={500}>
            {t("cardsImport.importModeLabel")}
          </Text>
          <SegmentedControl
            fullWidth
            value={settings.importMode}
            onChange={setImportMode}
            data={[
              { value: "copy", label: t("cardsImport.importModeCopy") },
              { value: "move", label: t("cardsImport.importModeMove") },
            ]}
          />
          {isMove && (
            <Alert color="yellow" title={t("cardsImport.moveWarningTitle")}>
              {t("cardsImport.moveWarningText")}
            </Alert>
          )}
        </Stack>

        <Stack gap={6}>
          <Text size="sm" fw={500}>
            {t("cardsImport.duplicatesModeLabel")}
          </Text>
          <SegmentedControl
            fullWidth
            value={settings.duplicatesMode}
            onChange={setDuplicatesMode}
            data={[
              { value: "skip", label: t("cardsImport.duplicatesModeSkip") },
              { value: "copy", label: t("cardsImport.duplicatesModeCopy") },
            ]}
          />
        </Stack>

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={() => onClose()} disabled={isLoading}>
            {t("actions.cancel")}
          </Button>
          <Button
            color="green"
            onClick={() => onImport()}
            disabled={!canImport || isLoading}
            loading={isStarting}
          >
            {t("cardsImport.importButton")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}


