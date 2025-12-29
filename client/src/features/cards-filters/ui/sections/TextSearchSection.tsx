import { useUnit } from "effector-react";
import {
  Checkbox,
  Group,
  SegmentedControl,
  SimpleGrid,
  Text,
  TextInput,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import type {
  CardsFtsField,
  CardsTextSearchMode,
} from "@/shared/types/cards-query";
import { InfoTip } from "../shared/InfoTip";
import { $filters, setQ, setQFields, setQMode } from "../../model";

const FTS_FIELDS: Array<{ value: CardsFtsField; labelKey: string }> = [
  { value: "description", labelKey: "filters.qFieldDescription" },
  { value: "personality", labelKey: "filters.qFieldPersonality" },
  { value: "scenario", labelKey: "filters.qFieldScenario" },
  { value: "first_mes", labelKey: "filters.qFieldFirstMes" },
  { value: "mes_example", labelKey: "filters.qFieldMesExample" },
  { value: "creator_notes", labelKey: "filters.qFieldCreatorNotes" },
  { value: "system_prompt", labelKey: "filters.qFieldSystemPrompt" },
  {
    value: "post_history_instructions",
    labelKey: "filters.qFieldPostHistoryInstructions",
  },
  {
    value: "alternate_greetings",
    labelKey: "filters.qFieldAlternateGreetings",
  },
  {
    value: "group_only_greetings",
    labelKey: "filters.qFieldGroupOnlyGreetings",
  },
];

const $q = $filters.map((s) => s.q);
const $qMode = $filters.map((s) => s.q_mode);
const $qFields = $filters.map((s) => s.q_fields);

export function TextSearchSection() {
  const { t } = useTranslation();
  const [q, qMode, qFields, onSetQ, onSetQMode, onSetQFields] = useUnit([
    $q,
    $qMode,
    $qFields,
    setQ,
    setQMode,
    setQFields,
  ]);

  return (
    <>
      <TextInput
        label={
          <Group gap={6}>
            <Text size="sm">{t("filters.textSearch")}</Text>
            <SegmentedControl
              size="xs"
              value={qMode}
              onChange={(v) => onSetQMode((v as any) ?? "like")}
              data={[
                { value: "like", label: t("filters.searchModeLike") },
                { value: "fts", label: t("filters.searchModeFts") },
              ]}
            />
            <InfoTip
              text={
                qMode === "fts"
                  ? t("filters.textSearchTip")
                  : t("filters.textSearchTipLike")
              }
            />
          </Group>
        }
        placeholder={t("filters.textSearchPlaceholder")}
        value={q}
        onChange={(e) => onSetQ(e.currentTarget.value)}
      />

      <Checkbox.Group
        label={t("filters.textSearchFields")}
        value={qFields as string[]}
        onChange={(values) => onSetQFields(values as CardsFtsField[])}
      >
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
          {FTS_FIELDS.map((f) => (
            <Checkbox
              key={f.value}
              value={f.value}
              label={t(f.labelKey)}
            />
          ))}
        </SimpleGrid>
      </Checkbox.Group>

      <Text size="sm" c="dimmed">
        {qMode === "fts" ? t("filters.noteFts") : t("filters.noteLike")}
      </Text>
    </>
  );
}


