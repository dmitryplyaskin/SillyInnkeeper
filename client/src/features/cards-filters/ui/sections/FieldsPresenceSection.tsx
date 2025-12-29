import { Divider, Select, SimpleGrid } from "@mantine/core";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import type { TriState } from "@/shared/types/cards-query";
import {
  $filters,
  setHasCharacterBook,
  setHasCreatorNotes,
  setHasMesExample,
  setHasPersonality,
  setHasPostHistoryInstructions,
  setHasScenario,
  setHasSystemPrompt,
} from "../../model";

const $hasCreatorNotes = $filters.map((s) => s.has_creator_notes);
const $hasSystemPrompt = $filters.map((s) => s.has_system_prompt);
const $hasPostHistoryInstructions = $filters.map(
  (s) => s.has_post_history_instructions
);
const $hasPersonality = $filters.map((s) => s.has_personality);
const $hasScenario = $filters.map((s) => s.has_scenario);
const $hasMesExample = $filters.map((s) => s.has_mes_example);
const $hasCharacterBook = $filters.map((s) => s.has_character_book);

export function FieldsPresenceSection() {
  const { t } = useTranslation();
  const [
    hasCreatorNotes,
    hasSystemPrompt,
    hasPostHistoryInstructions,
    hasPersonality,
    hasScenario,
    hasMesExample,
    hasCharacterBook,
    onSetHasCreatorNotes,
    onSetHasSystemPrompt,
    onSetHasPostHistoryInstructions,
    onSetHasPersonality,
    onSetHasScenario,
    onSetHasMesExample,
    onSetHasCharacterBook,
  ] = useUnit([
    $hasCreatorNotes,
    $hasSystemPrompt,
    $hasPostHistoryInstructions,
    $hasPersonality,
    $hasScenario,
    $hasMesExample,
    $hasCharacterBook,
    setHasCreatorNotes,
    setHasSystemPrompt,
    setHasPostHistoryInstructions,
    setHasPersonality,
    setHasScenario,
    setHasMesExample,
    setHasCharacterBook,
  ]);

  const TRI_STATE_DATA: Array<{ value: TriState; label: string }> = [
    { value: "any", label: t("filters.triAny") },
    { value: "1", label: t("filters.triHas") },
    { value: "0", label: t("filters.triHasNot") },
  ];

  return (
    <>
      <Divider label={t("filters.fieldsPresence")} />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Select
          label={t("filters.hasCreatorNotes")}
          data={TRI_STATE_DATA as any}
          value={hasCreatorNotes}
          onChange={(v) => onSetHasCreatorNotes((v as TriState) || "any")}
        />
        <Select
          label={t("filters.hasSystemPrompt")}
          data={TRI_STATE_DATA as any}
          value={hasSystemPrompt}
          onChange={(v) => onSetHasSystemPrompt((v as TriState) || "any")}
        />
        <Select
          label={t("filters.hasPostHistoryInstructions")}
          data={TRI_STATE_DATA as any}
          value={hasPostHistoryInstructions}
          onChange={(v) => onSetHasPostHistoryInstructions((v as TriState) || "any")}
        />
        <Select
          label={t("filters.hasPersonality")}
          data={TRI_STATE_DATA as any}
          value={hasPersonality}
          onChange={(v) => onSetHasPersonality((v as TriState) || "any")}
        />
        <Select
          label={t("filters.hasScenario")}
          data={TRI_STATE_DATA as any}
          value={hasScenario}
          onChange={(v) => onSetHasScenario((v as TriState) || "any")}
        />
        <Select
          label={t("filters.hasMesExample")}
          data={TRI_STATE_DATA as any}
          value={hasMesExample}
          onChange={(v) => onSetHasMesExample((v as TriState) || "any")}
        />
        <Select
          label={t("filters.hasCharacterBook")}
          data={TRI_STATE_DATA as any}
          value={hasCharacterBook}
          onChange={(v) => onSetHasCharacterBook((v as TriState) || "any")}
        />
      </SimpleGrid>
    </>
  );
}


