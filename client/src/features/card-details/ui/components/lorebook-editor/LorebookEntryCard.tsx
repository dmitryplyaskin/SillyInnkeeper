import { memo, useMemo } from "react";
import { useStoreMap, useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import {
  ActionIcon,
  Checkbox,
  Collapse,
  Group,
  Paper,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import type { LorebookEntry } from "@/shared/types/lorebooks";
import { getStExt } from "@/shared/types/lorebooks/sillytavern";
import {
  $lorebookExpanded,
  lorebookToggleEntryExpanded,
} from "../../../model.lorebook-editor";
import { LorebookEntryEditor } from "./LorebookEntryEditor";

export const LorebookEntryCard = memo(function LorebookEntryCard({
  entry,
  index,
  totalEntries,
  disabled,
  onUpdateEntry,
  onDeleteEntry,
  onDuplicateEntry,
  onMoveEntry,
}: {
  entry: LorebookEntry;
  index: number;
  totalEntries: number;
  disabled?: boolean;
  onUpdateEntry: (
    index: number,
    updater: (entry: LorebookEntry) => LorebookEntry
  ) => void;
  onDeleteEntry: (index: number) => void;
  onDuplicateEntry: (index: number) => void;
  onMoveEntry: (index: number, dir: "up" | "down") => void;
}) {
  const { t } = useTranslation();
  const toggleExpanded = useUnit(lorebookToggleEntryExpanded);
  const expanded = useStoreMap({
    store: $lorebookExpanded,
    keys: [index],
    fn: (map, [idx]) => Boolean(map[idx]),
  });

  const st = useMemo(() => getStExt(entry).entry ?? {}, [entry]);

  const title =
    entry.name || `${t("cardDetails.lorebook.entry", "Entry")} ${index + 1}`;
  const keysText =
    entry.keys.length > 0 ? entry.keys.join(", ") : t("empty.dash");
  const triggerText =
    typeof st.trigger_percent === "number"
      ? String(st.trigger_percent)
      : t("empty.dash");
  const priorityText =
    typeof entry.priority === "number"
      ? String(entry.priority)
      : t("empty.dash");
  const positionText =
    typeof st.insertion_position === "string"
      ? st.insertion_position
      : entry.position ?? t("empty.dash");
  const strategyText =
    typeof st.strategy === "string"
      ? st.strategy
      : entry.constant
      ? "constant"
      : t("empty.dash");

  return (
    <Paper p="xs" withBorder>
      <UnstyledButton
        onClick={() => toggleExpanded(index)}
        style={{ width: "100%" }}
      >
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Group wrap="nowrap" gap="xs" style={{ flex: 1, minWidth: 0 }}>
            <Text
              size="sm"
              c="dimmed"
              style={{ width: 16, textAlign: "center" }}
            >
              {expanded ? "▾" : "▸"}
            </Text>
            <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" fw={500} lineClamp={1}>
                {title}
              </Text>
              <Text size="xs" c="dimmed" lineClamp={1}>
                {keysText}
              </Text>
            </Stack>
          </Group>

          <Group gap="xs" wrap="nowrap">
            <Text size="xs" c="dimmed" visibleFrom="sm">
              {positionText} · S:{strategyText} · #{entry.insertion_order} · P:
              {priorityText} · T:{triggerText}
            </Text>
            <Checkbox
              size="xs"
              checked={entry.enabled}
              onClick={(e) => e.stopPropagation()}
              onChange={(ev) =>
                onUpdateEntry(index, (ent) => ({
                  ...ent,
                  enabled: ev.currentTarget.checked,
                }))
              }
              disabled={disabled}
              aria-label={t("cardDetails.lorebook.enabled", "Enabled")}
            />
          </Group>

          <Group gap={4} wrap="nowrap">
            <ActionIcon
              variant="light"
              onClick={(e) => {
                e.stopPropagation();
                onMoveEntry(index, "up");
              }}
              disabled={disabled || index === 0}
              aria-label={t("cardDetails.lorebook.moveUp", "Move up")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 15l-6-6-6 6" />
              </svg>
            </ActionIcon>
            <ActionIcon
              variant="light"
              onClick={(e) => {
                e.stopPropagation();
                onMoveEntry(index, "down");
              }}
              disabled={disabled || index === totalEntries - 1}
              aria-label={t("cardDetails.lorebook.moveDown", "Move down")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </ActionIcon>
            <ActionIcon
              variant="light"
              color="blue"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicateEntry(index);
              }}
              disabled={disabled}
              aria-label={t("cardDetails.lorebook.duplicate", "Duplicate")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </ActionIcon>
            <ActionIcon
              variant="light"
              color="red"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteEntry(index);
              }}
              disabled={disabled}
              aria-label={t("cardDetails.lorebook.delete", "Delete")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </ActionIcon>
          </Group>
        </Group>
      </UnstyledButton>

      <Collapse in={expanded}>
        {expanded ? (
          <LorebookEntryEditor
            entry={entry}
            index={index}
            disabled={disabled}
            onUpdate={(updater) => onUpdateEntry(index, updater)}
          />
        ) : null}
      </Collapse>
    </Paper>
  );
});
