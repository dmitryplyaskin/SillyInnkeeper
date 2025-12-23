import {
  Checkbox,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { LorebookEntry } from "@/shared/types/lorebooks";
import type { StLorebookEntryExt } from "@/shared/types/lorebooks/sillytavern";
import { clampInt, setStEntryExt } from "@/shared/types/lorebooks/sillytavern";
import { DeferredCommaListInput } from "../fields/DeferredCommaListInput";

export function EntryBasicFields({
  entry,
  disabled,
  st,
  resetKeyBase,
  onUpdate,
}: {
  entry: LorebookEntry;
  disabled?: boolean;
  st: StLorebookEntryExt;
  resetKeyBase: string;
  onUpdate: (updater: (entry: LorebookEntry) => LorebookEntry) => void;
}) {
  const { t } = useTranslation();

  return (
    <Stack gap="xs">
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
        <TextInput
          value={entry.name ?? ""}
          onChange={(ev) =>
            onUpdate((ent) => ({
              ...ent,
              name: ev.currentTarget.value.trim() || undefined,
            }))
          }
          disabled={disabled}
          size="xs"
          placeholder={t("cardDetails.lorebook.entryName", "Entry Name")}
        />

        <Select
          value={entry.position ?? ""}
          onChange={(value) =>
            onUpdate((ent) => ({
              ...ent,
              position:
                value === "before_char" || value === "after_char"
                  ? value
                  : undefined,
            }))
          }
          data={[
            {
              value: "",
              label: t("cardDetails.lorebook.optional", "Optional"),
            },
            {
              value: "before_char",
              label: t(
                "cardDetails.lorebook.posBeforeChar",
                "Before Char Defs"
              ),
            },
            {
              value: "after_char",
              label: t("cardDetails.lorebook.posAfterChar", "After Char Defs"),
            },
          ]}
          disabled={disabled}
          size="xs"
          placeholder={t("cardDetails.lorebook.position", "Position")}
        />
      </SimpleGrid>

      <DeferredCommaListInput
        label={t("cardDetails.lorebook.keys", "Keys")}
        placeholder={t(
          "cardDetails.lorebook.keysPlaceholder",
          "Comma separated list"
        )}
        disabled={disabled}
        values={entry.keys}
        onCommit={(keys) => onUpdate((ent) => ({ ...ent, keys }))}
        resetKey={`${resetKeyBase}:keys:${entry.keys.join("|")}`}
      />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
        <Checkbox
          label={t("cardDetails.lorebook.selective", "Selective")}
          checked={entry.selective ?? false}
          onChange={(ev) =>
            onUpdate((ent) => ({
              ...ent,
              selective: ev.currentTarget.checked || undefined,
            }))
          }
          disabled={disabled}
          size="xs"
        />

        <DeferredCommaListInput
          label={t("cardDetails.lorebook.secondaryKeys", "Secondary Keys")}
          placeholder={t(
            "cardDetails.lorebook.keysPlaceholder",
            "Comma separated list"
          )}
          disabled={disabled || entry.use_regex}
          values={entry.secondary_keys ?? []}
          onCommit={(secondary) =>
            onUpdate((ent) => ({
              ...ent,
              secondary_keys: secondary.length > 0 ? secondary : undefined,
            }))
          }
          resetKey={`${resetKeyBase}:secondary:${(
            entry.secondary_keys ?? []
          ).join("|")}`}
        />
      </SimpleGrid>

      <Textarea
        value={entry.content}
        onChange={(ev) =>
          onUpdate((ent) => ({ ...ent, content: ev.currentTarget.value }))
        }
        disabled={disabled}
        minRows={3}
        autosize
        size="xs"
        placeholder={t("cardDetails.lorebook.content", "Content")}
      />

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
        <NumberInput
          label={t("cardDetails.lorebook.insertionOrder", "Insertion Order")}
          value={entry.insertion_order}
          onChange={(value) =>
            onUpdate((ent) => ({
              ...ent,
              insertion_order:
                typeof value === "number" && Number.isFinite(value) ? value : 0,
            }))
          }
          disabled={disabled}
          min={0}
          size="xs"
        />
        <NumberInput
          label={t("cardDetails.lorebook.priority", "Priority")}
          value={entry.priority ?? ""}
          onChange={(value) =>
            onUpdate((ent) => ({
              ...ent,
              priority:
                typeof value === "number" && Number.isFinite(value)
                  ? value
                  : undefined,
            }))
          }
          disabled={disabled}
          placeholder={t("cardDetails.lorebook.optional", "Optional")}
          size="xs"
        />
        <NumberInput
          label={t("cardDetails.lorebook.trigger", "Trigger %")}
          value={
            typeof st.trigger_percent === "number" ? st.trigger_percent : 100
          }
          onChange={(value) =>
            onUpdate((ent) =>
              setStEntryExt(ent, {
                trigger_percent: clampInt(value, {
                  min: 0,
                  max: 100,
                  fallback: 100,
                }),
              })
            )
          }
          disabled={disabled}
          min={0}
          max={100}
          size="xs"
        />
        <Group gap="xs" align="flex-end">
          <Checkbox
            label={t("cardDetails.lorebook.useRegex", "Use Regex")}
            checked={entry.use_regex}
            onChange={(ev) =>
              onUpdate((ent) => ({
                ...ent,
                use_regex: ev.currentTarget.checked,
              }))
            }
            disabled={disabled}
            size="xs"
          />
        </Group>
      </SimpleGrid>

      <Group gap="md" wrap="wrap">
        <Checkbox
          label={t("cardDetails.lorebook.caseSensitive", "Case Sensitive")}
          checked={entry.case_sensitive ?? false}
          onChange={(ev) =>
            onUpdate((ent) => ({
              ...ent,
              case_sensitive: ev.currentTarget.checked || undefined,
            }))
          }
          disabled={disabled}
          size="xs"
        />
        <Checkbox
          label={t("cardDetails.lorebook.constant", "Constant")}
          checked={entry.constant ?? false}
          onChange={(ev) =>
            onUpdate((ent) => ({
              ...ent,
              constant: ev.currentTarget.checked || undefined,
            }))
          }
          disabled={disabled}
          size="xs"
        />
      </Group>
    </Stack>
  );
}
