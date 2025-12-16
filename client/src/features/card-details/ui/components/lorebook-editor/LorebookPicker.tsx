import { useEffect, useMemo } from "react";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import { Button, Group, Paper, Select, Stack, Text } from "@mantine/core";
import { $lorebook } from "../../../model.form";
import {
  $lorebookEditMode,
  $lorebookPickerItems,
  $lorebookPickerLoading,
  $lorebookPickerQuery,
  lorebookEditModeChanged,
  lorebookPickerOpened,
  lorebookPicked,
  lorebookPickerQueryChanged,
} from "../../../model.lorebook-editor";

export function LorebookPicker({
  disabled,
  onCreateNew,
  onClear,
}: {
  disabled?: boolean;
  onCreateNew: () => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();

  const [
    lorebook,
    items,
    loading,
    query,
    setQuery,
    pick,
    editMode,
    setEditMode,
    onOpened,
  ] = useUnit([
    $lorebook,
    $lorebookPickerItems,
    $lorebookPickerLoading,
    $lorebookPickerQuery,
    lorebookPickerQueryChanged,
    lorebookPicked,
    $lorebookEditMode,
    lorebookEditModeChanged,
    lorebookPickerOpened,
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

  return (
    <Paper p="md">
      <Stack gap="xs">
        <Text fw={600}>
          {t("cardDetails.lorebook.selectTitle", "Select Lorebook")}
        </Text>
        <Group align="flex-end" grow>
          <Select
            label={t("cardDetails.lorebook.select", "Lorebook")}
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
              if (!id) return;
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
          />
          <Select
            label={t("cardDetails.lorebook.editMode", "Edit mode")}
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
            w={260}
          />
          <Group justify="flex-end" gap="xs">
            <Button variant="light" onClick={onCreateNew} disabled={disabled}>
              {t("cardDetails.lorebook.createNew", "Create New")}
            </Button>
            <Button
              variant="subtle"
              color="red"
              onClick={onClear}
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
      </Stack>
    </Paper>
  );
}
