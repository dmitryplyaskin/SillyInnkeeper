import { memo } from "react";
import {
  Modal,
  Stack,
  Tabs,
  Text,
  Group,
  Button,
  Select,
  MultiSelect,
  TextInput,
  SegmentedControl,
} from "@mantine/core";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import {
  $action,
  $canApply,
  $from,
  $loading,
  $opened,
  $replaceMode,
  $tags,
  $tagsError,
  $toExistingRawName,
  $toNewName,
  actionChanged,
  applyClicked,
  closeTagsBulkEditModal,
  fromTagsChanged,
  replaceModeChanged,
  toExistingRawNameChanged,
  toNewNameChanged,
} from "../model";

const FromTagsSelect = memo(function FromTagsSelect({
  label,
  placeholder,
}: {
  label: string;
  placeholder: string;
}) {
  const { t } = useTranslation();
  const [from, tags, loading] = useUnit([$from, $tags, $loading]);
  const onFromChanged = useUnit(fromTagsChanged);

  const tagOptions = tags.map((x) => ({ value: x.rawName, label: x.name }));

  return (
    <MultiSelect
      label={label}
      placeholder={placeholder}
      data={tagOptions}
      searchable
      clearable
      value={from}
      onChange={(v) => onFromChanged(v)}
      disabled={loading.starting}
      nothingFoundMessage={t("tagsBulkEdit.nothingFound")}
    />
  );
});

const ReplaceTargetControls = memo(function ReplaceTargetControls() {
  const { t } = useTranslation();
  const [replaceMode, toExisting, toNew, tags, loading] = useUnit([
    $replaceMode,
    $toExistingRawName,
    $toNewName,
    $tags,
    $loading,
  ]);
  const [onReplaceModeChanged, onToExistingChanged, onToNewChanged] = useUnit([
    replaceModeChanged,
    toExistingRawNameChanged,
    toNewNameChanged,
  ]);

  const tagOptions = tags.map((x) => ({ value: x.rawName, label: x.name }));

  return (
    <Stack gap="sm">
      <SegmentedControl
        value={replaceMode}
        onChange={(v) => onReplaceModeChanged(v === "new" ? "new" : "existing")}
        data={[
          { value: "existing", label: t("tagsBulkEdit.replaceMode.existing") },
          { value: "new", label: t("tagsBulkEdit.replaceMode.new") },
        ]}
      />

      {replaceMode === "existing" ? (
        <Select
          label={t("tagsBulkEdit.toExistingLabel")}
          placeholder={t("tagsBulkEdit.toExistingPlaceholder")}
          data={tagOptions}
          searchable
          clearable
          value={toExisting}
          onChange={(v) => onToExistingChanged(v)}
          disabled={loading.starting}
          nothingFoundMessage={t("tagsBulkEdit.nothingFound")}
        />
      ) : (
        <TextInput
          label={t("tagsBulkEdit.toNewLabel")}
          placeholder={t("tagsBulkEdit.toNewPlaceholder")}
          value={toNew}
          onChange={(ev) => onToNewChanged(ev.currentTarget.value)}
          disabled={loading.starting}
        />
      )}
    </Stack>
  );
});

export function TagsBulkEditModal() {
  const { t } = useTranslation();
  const [opened, action, tagsError, loading, canApply] = useUnit([
    $opened,
    $action,
    $tagsError,
    $loading,
    $canApply,
  ]);

  const [
    onClose,
    onApply,
    onActionChanged,
  ] = useUnit([
    closeTagsBulkEditModal,
    applyClicked,
    actionChanged,
  ]);

  return (
    <Modal opened={opened} onClose={() => onClose()} title={t("tagsBulkEdit.title")} size="lg">
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t("tagsBulkEdit.description")}
        </Text>

        {tagsError && (
          <Text size="sm" c="dimmed">
            {tagsError}
          </Text>
        )}

        <Tabs
          value={action}
          onChange={(v) => onActionChanged(v === "delete" ? "delete" : "replace")}
        >
          <Tabs.List>
            <Tabs.Tab value="replace">{t("tagsBulkEdit.tabs.replace")}</Tabs.Tab>
            <Tabs.Tab value="delete">{t("tagsBulkEdit.tabs.delete")}</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="replace" pt="md">
            <Stack gap="sm">
              <FromTagsSelect
                label={t("tagsBulkEdit.fromLabel")}
                placeholder={t("tagsBulkEdit.fromPlaceholder")}
              />
              <ReplaceTargetControls />
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="delete" pt="md">
            <Stack gap="sm">
              <FromTagsSelect
                label={t("tagsBulkEdit.fromLabel")}
                placeholder={t("tagsBulkEdit.fromPlaceholder")}
              />

              <Text size="sm" c="dimmed">
                {t("tagsBulkEdit.deleteWarning")}
              </Text>
            </Stack>
          </Tabs.Panel>
        </Tabs>

        <Group justify="flex-end">
          <Button variant="default" onClick={() => onClose()} disabled={loading.starting}>
            {t("actions.close")}
          </Button>
          <Button onClick={() => onApply()} loading={loading.starting} disabled={!canApply}>
            {t("actions.apply")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}


