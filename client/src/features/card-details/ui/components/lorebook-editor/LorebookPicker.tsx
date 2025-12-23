import { useEffect, useMemo } from "react";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import { Button, Group, Paper, Select, Stack, Text } from "@mantine/core";
import { $lorebook } from "../../../model.form";
import {
  $lorebookEditMode,
  $isSavingSharedLorebook,
  $lorebookPickerItems,
  $lorebookPickerLoading,
  $lorebookPickerQuery,
  lorebookEditModeChanged,
  lorebookPickerOpened,
  lorebookPicked,
  lorebookPickerQueryChanged,
  saveLorebookSharedClicked,
} from "../../../model.lorebook-editor";

export function LorebookPicker({
  disabled,
  onCreateNew,
  onClear,
  variant = "standalone",
}: {
  disabled?: boolean;
  onCreateNew: () => void;
  onClear: () => void;
  variant?: "standalone" | "panel";
}) {
  const { t } = useTranslation();

  const [
    lorebook,
    editMode,
    items,
    loading,
    query,
    setQuery,
    pick,
    setEditMode,
    onOpened,
    saveShared,
    isSavingShared,
  ] = useUnit([
    $lorebook,
    $lorebookEditMode,
    $lorebookPickerItems,
    $lorebookPickerLoading,
    $lorebookPickerQuery,
    lorebookPickerQueryChanged,
    lorebookPicked,
    lorebookEditModeChanged,
    lorebookPickerOpened,
    saveLorebookSharedClicked,
    $isSavingSharedLorebook,
  ]);

  // Грузим список один раз; дальнейший поиск — локальный (searchValue).
  useEffect(() => {
    onOpened();
  }, [onOpened]);

  const selectedLorebookId =
    lorebook?.id && lorebook.id.trim().length > 0 ? lorebook.id : null;

  const selectData = useMemo(
    () =>
      items.map((it) => {
        const nm =
          typeof it.name === "string" && it.name.trim() ? it.name.trim() : null;
        const label = nm ? nm : `${t("empty.dash")} (${it.id.slice(0, 8)})`;
        return { value: it.id, label };
      }),
    [items, t]
  );

  const handleClear = () => {
    onClear();
    setQuery("");
  };

  const content = (
    <Stack gap="xs">
      {variant === "standalone" ? (
        <Text fw={600}>
          {t("cardDetails.lorebook.selectTitle", "Select Lorebook")}
        </Text>
      ) : null}

      <Group align="flex-end" wrap="wrap" gap="xs">
        <Select
          label={
            variant === "standalone"
              ? t("cardDetails.lorebook.select", "Lorebook")
              : undefined
          }
          size={variant === "panel" ? "xs" : "sm"}
          placeholder={t(
            "cardDetails.lorebook.selectPlaceholder",
            "Search lorebooks…"
          )}
          searchable
          clearable
          value={selectedLorebookId}
          data={selectData}
          searchValue={query}
          onSearchChange={setQuery}
          onChange={(value) => {
            const id = (value ?? "").trim();
            if (!id) {
              handleClear();
              return;
            }
            pick(id);
          }}
          disabled={disabled}
          nothingFoundMessage={t(
            "cardDetails.lorebook.nothingFound",
            "Nothing found"
          )}
          rightSection={
            loading ? (
              <Text size="xs" c="dimmed">
                …
              </Text>
            ) : undefined
          }
          style={{ flex: 1, minWidth: 260 }}
        />

        <Select
          label={
            variant === "standalone"
              ? t("cardDetails.lorebook.editMode", "Edit mode")
              : undefined
          }
          size={variant === "panel" ? "xs" : "sm"}
          value={editMode}
          onChange={(value) =>
            setEditMode(value === "shared" ? "shared" : "copy")
          }
          data={[
            {
              value: "copy",
              label: t(
                "cardDetails.lorebook.modeCopy",
                "Copy (saved with card)"
              ),
            },
            {
              value: "shared",
              label: t(
                "cardDetails.lorebook.modeShared",
                "Shared (save to lorebooks)"
              ),
            },
          ]}
          disabled={disabled}
          w={variant === "panel" ? 220 : 260}
        />

        <Group justify="flex-end" gap="xs">
          <Button
            variant="light"
            size={variant === "panel" ? "xs" : "sm"}
            onClick={() => saveShared()}
            disabled={
              disabled ||
              editMode !== "shared" ||
              isSavingShared ||
              !selectedLorebookId
            }
            loading={isSavingShared}
          >
            {t("cardDetails.lorebook.save", "Save Lorebook")}
          </Button>
          <Button
            variant="light"
            size={variant === "panel" ? "xs" : "sm"}
            onClick={onCreateNew}
            disabled={disabled}
          >
            {t("cardDetails.lorebook.createNew", "Create New")}
          </Button>
          <Button
            variant="subtle"
            size={variant === "panel" ? "xs" : "sm"}
            color="red"
            onClick={handleClear}
            disabled={disabled}
          >
            {t("cardDetails.lorebook.clear", "Clear")}
          </Button>
        </Group>
      </Group>

      <Text size="xs" c="dimmed">
        {selectedLorebookId
          ? `${t(
              "cardDetails.lorebook.selectedId",
              "Selected ID"
            )}: ${selectedLorebookId}`
          : t(
              "cardDetails.lorebook.inlineHint",
              "Inline lorebook (saved inside the card)"
            )}
      </Text>

      {variant === "panel" ? (
        <Text size="xs" c="dimmed">
          {editMode === "shared"
            ? t(
                "cardDetails.lorebook.saveHintSharedShort",
                "Shared mode: use “Save Lorebook” to persist to database."
              )
            : t(
                "cardDetails.lorebook.saveHintShort",
                "Copy mode: changes are saved with the card (use main Save)."
              )}
        </Text>
      ) : null}
    </Stack>
  );

  if (variant === "panel") return content;

  return <Paper p="md">{content}</Paper>;
}
