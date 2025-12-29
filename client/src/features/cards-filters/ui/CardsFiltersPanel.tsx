import { useUnit } from "effector-react";
import {
  Alert,
  Button,
  Checkbox,
  Divider,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  MultiSelect,
  Tooltip,
  ActionIcon,
  SegmentedControl,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import {
  $filters,
  $filtersData,
  $filtersError,
  $filtersLoading,
  $patternRulesStatus,
  loadCardsFiltersFx,
  resetFilters,
  setAlternateGreetingsMin,
  setCreatedFrom,
  setCreatedTo,
  setCreators,
  setHasCharacterBook,
  setHasCreatorNotes,
  setHasMesExample,
  setHasPersonality,
  setHasPostHistoryInstructions,
  setHasScenario,
  setHasSystemPrompt,
  setHasAlternateGreetings,
  setIsSillyTavern,
  setName,
  setQ,
  setQMode,
  setQFields,
  setPromptTokensMax,
  setPromptTokensMin,
  setSort,
  setSpecVersions,
  setTags,
  setPatterns,
} from "../model";
import type { CardsFtsField, TriState } from "@/shared/types/cards-query";
import { openPatternRulesModal } from "@/features/pattern-rules";

function InfoTip({ text }: { text: string }) {
  const { t } = useTranslation();
  return (
    <Tooltip label={text} withArrow multiline maw={280}>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="sm"
        radius="xl"
        aria-label={t("filters.infoTipAria")}
      >
        i
      </ActionIcon>
    </Tooltip>
  );
}

export function CardsFiltersPanel() {
  const { t } = useTranslation();
  const [
    filters,
    filtersData,
    filtersError,
    filtersLoading,
    patternRulesStatus,
    loadFilters,
    onOpenPatternRules,
    onSetSort,
    onSetName,
    onSetQ,
    onSetQMode,
    onSetQFields,
    onSetCreators,
    onSetSpecVersions,
    onSetTags,
    onSetCreatedFrom,
    onSetCreatedTo,
    onSetPromptTokensMin,
    onSetPromptTokensMax,
    onSetIsSillyTavern,
    onSetHasCreatorNotes,
    onSetHasSystemPrompt,
    onSetHasPostHistoryInstructions,
    onSetHasPersonality,
    onSetHasScenario,
    onSetHasMesExample,
    onSetHasCharacterBook,
    onSetHasAlternateGreetings,
    onSetAlternateGreetingsMin,
    onSetPatterns,
    onReset,
  ] = useUnit([
    $filters,
    $filtersData,
    $filtersError,
    $filtersLoading,
    $patternRulesStatus,
    loadCardsFiltersFx,
    openPatternRulesModal,
    setSort,
    setName,
    setQ,
    setQMode,
    setQFields,
    setCreators,
    setSpecVersions,
    setTags,
    setCreatedFrom,
    setCreatedTo,
    setPromptTokensMin,
    setPromptTokensMax,
    setIsSillyTavern,
    setHasCreatorNotes,
    setHasSystemPrompt,
    setHasPostHistoryInstructions,
    setHasPersonality,
    setHasScenario,
    setHasMesExample,
    setHasCharacterBook,
    setHasAlternateGreetings,
    setAlternateGreetingsMin,
    setPatterns,
    resetFilters,
  ]);

  const TRI_STATE_DATA: Array<{ value: TriState; label: string }> = [
    { value: "any", label: t("filters.triAny") },
    { value: "1", label: t("filters.triHas") },
    { value: "0", label: t("filters.triHasNot") },
  ];

  const SORT_DATA = [
    { value: "created_at_desc", label: t("filters.sortNewFirst") },
    { value: "created_at_asc", label: t("filters.sortOldFirst") },
    { value: "name_asc", label: t("filters.sortNameAsc") },
    { value: "name_desc", label: t("filters.sortNameDesc") },
    { value: "prompt_tokens_desc", label: t("filters.sortTokensDesc") },
    { value: "prompt_tokens_asc", label: t("filters.sortTokensAsc") },
    { value: "relevance", label: t("filters.sortRelevance") },
  ] as const;

  const isRelevanceWithoutQuery =
    filters.sort === "relevance" && filters.q.trim().length === 0;

  const isRelevanceInLikeMode =
    filters.sort === "relevance" &&
    filters.q.trim().length > 0 &&
    filters.q_mode !== "fts";

  const FTS_FIELDS: Array<{ value: CardsFtsField; label: string }> = [
    { value: "description", label: t("filters.qFieldDescription") },
    { value: "personality", label: t("filters.qFieldPersonality") },
    { value: "scenario", label: t("filters.qFieldScenario") },
    { value: "first_mes", label: t("filters.qFieldFirstMes") },
    { value: "mes_example", label: t("filters.qFieldMesExample") },
    { value: "creator_notes", label: t("filters.qFieldCreatorNotes") },
    { value: "system_prompt", label: t("filters.qFieldSystemPrompt") },
    {
      value: "post_history_instructions",
      label: t("filters.qFieldPostHistoryInstructions"),
    },
    {
      value: "alternate_greetings",
      label: t("filters.qFieldAlternateGreetings"),
    },
    {
      value: "group_only_greetings",
      label: t("filters.qFieldGroupOnlyGreetings"),
    },
  ];

  function mergeOptions(
    selected: string[],
    serverOptions: Array<{ value: string; count: number }>
  ): Array<{ value: string; label: string }> {
    const map = new Map<string, number>();
    for (const opt of serverOptions) map.set(opt.value, opt.count);
    for (const sel of selected) {
      if (!map.has(sel)) map.set(sel, 0);
    }
    return Array.from(map.entries()).map(([value, count]) => ({
      value,
      label: `${value} (${count})`,
    }));
  }

  const creatorOptions = mergeOptions(filters.creator, filtersData.creators);
  const specVersionOptions = mergeOptions(
    filters.spec_version,
    filtersData.spec_versions
  );
  const tagOptions = mergeOptions(filters.tags, filtersData.tags);

  const patternsEnabled = filters.patterns === "1";
  const patternsAvailable =
    patternRulesStatus == null ? true : patternRulesStatus.hasEnabledRules;
  const patternsDisabled = !patternsAvailable;
  const patternsNeedsRun =
    patternsEnabled &&
    patternRulesStatus != null &&
    patternRulesStatus.lastReady == null;

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Group gap="sm">
          <Button
            variant="default"
            onClick={() => {
              onReset();
            }}
          >
            {t("actions.reset")}
          </Button>
          <Button
            variant="light"
            loading={filtersLoading}
            onClick={() => {
              loadFilters();
            }}
          >
            {t("actions.refreshLists")}
          </Button>
        </Group>
      </Group>

      {filtersError && (
        <Alert color="red" title={t("errors.loadFiltersTitle")}>
          {filtersError}
        </Alert>
      )}

      <Divider label={t("filters.searchAndSort")} />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <TextInput
          label={t("filters.name")}
          placeholder={t("filters.namePlaceholder")}
          value={filters.name}
          onChange={(e) => onSetName(e.currentTarget.value)}
        />

        <Select
          label={t("filters.sort")}
          data={[...SORT_DATA] as any}
          value={filters.sort}
          onChange={(v) => {
            if (v) onSetSort(v as any);
          }}
        />
      </SimpleGrid>

      <Stack gap={4}>
        <Text size="sm" fw={500}>
          {t("filters.source")}
        </Text>
        <SegmentedControl
          fullWidth
          value={filters.is_sillytavern}
          onChange={(value) => onSetIsSillyTavern(value as TriState)}
          data={[
            { value: "any", label: t("filters.sourceAll") },
            { value: "1", label: t("filters.sourceOnlySt") },
            { value: "0", label: t("filters.sourceOnlyFolder") },
          ]}
        />
      </Stack>

      {isRelevanceWithoutQuery && (
        <Text size="sm" c="dimmed">
          {t("filters.relevanceNeedsQuery")}
        </Text>
      )}

      {isRelevanceInLikeMode && (
        <Text size="sm" c="dimmed">
          {t("filters.relevanceNeedsFts")}
        </Text>
      )}

      <TextInput
        label={
          <Group gap={6}>
            <Text size="sm">{t("filters.textSearch")}</Text>
            <SegmentedControl
              size="xs"
              value={filters.q_mode}
              onChange={(v) => onSetQMode((v as any) ?? "like")}
              data={[
                { value: "like", label: t("filters.searchModeLike") },
                { value: "fts", label: t("filters.searchModeFts") },
              ]}
            />
            <InfoTip
              text={
                filters.q_mode === "fts"
                  ? t("filters.textSearchTip")
                  : t("filters.textSearchTipLike")
              }
            />
          </Group>
        }
        placeholder={t("filters.textSearchPlaceholder")}
        value={filters.q}
        onChange={(e) => onSetQ(e.currentTarget.value)}
      />

      <Checkbox.Group
        label={t("filters.textSearchFields")}
        value={filters.q_fields as string[]}
        onChange={(values) => onSetQFields(values as CardsFtsField[])}
      >
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
          {FTS_FIELDS.map((f) => (
            <Checkbox key={f.value} value={f.value} label={f.label} />
          ))}
        </SimpleGrid>
      </Checkbox.Group>

      <Divider
        label={
          <Group gap={6}>
            <Text size="sm">{t("filters.meta")}</Text>
          </Group>
        }
      />

      <Group gap="xs" align="center" wrap="wrap">
        <Checkbox
          label={t("filters.patterns")}
          checked={patternsEnabled}
          disabled={patternsDisabled}
          onChange={(e) => onSetPatterns(e.currentTarget.checked ? "1" : "any")}
        />
        <InfoTip text={t("filters.patternsTip")} />
        <Button
          variant="subtle"
          size="xs"
          onClick={() => onOpenPatternRules()}
          aria-label={t("filters.openPatternRulesAria")}
        >
          {t("filters.openPatternRules")}
        </Button>
      </Group>
      <Text size="sm" c="dimmed">
        {patternsDisabled
          ? t("filters.patternsDisabled")
          : patternsNeedsRun
          ? t("filters.patternsNeedsRun")
          : t("filters.patternsHint")}
      </Text>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <MultiSelect
          label={t("filters.creator")}
          data={creatorOptions}
          value={filters.creator}
          onChange={onSetCreators}
          searchable
          clearable
        />

        <MultiSelect
          label={t("filters.specVersion")}
          data={specVersionOptions}
          value={filters.spec_version}
          onChange={onSetSpecVersions}
          searchable
          clearable
        />

        <MultiSelect
          label={
            <Group gap={6}>
              <Text size="sm">{t("filters.tags")}</Text>
              <InfoTip text={t("filters.tagsTip")} />
            </Group>
          }
          data={tagOptions}
          value={filters.tags}
          onChange={onSetTags}
          searchable
          clearable
        />
      </SimpleGrid>

      <Divider
        label={
          <Group gap={6}>
            <Text size="sm">{t("filters.createdAt")}</Text>
            <InfoTip text={t("filters.localDayTip")} />
          </Group>
        }
      />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <TextInput
          label={t("filters.createdFrom")}
          type="date"
          value={filters.created_from || ""}
          rightSection={
            filters.created_from ? (
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                aria-label={t("filters.clearDateFromAria")}
                onClick={() => onSetCreatedFrom(undefined)}
              >
                ×
              </ActionIcon>
            ) : null
          }
          rightSectionPointerEvents="all"
          onChange={(e) =>
            onSetCreatedFrom(
              e.currentTarget.value.trim().length > 0
                ? e.currentTarget.value
                : undefined
            )
          }
        />

        <TextInput
          label={t("filters.createdTo")}
          type="date"
          value={filters.created_to || ""}
          rightSection={
            filters.created_to ? (
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                aria-label={t("filters.clearDateToAria")}
                onClick={() => onSetCreatedTo(undefined)}
              >
                ×
              </ActionIcon>
            ) : null
          }
          rightSectionPointerEvents="all"
          onChange={(e) =>
            onSetCreatedTo(
              e.currentTarget.value.trim().length > 0
                ? e.currentTarget.value
                : undefined
            )
          }
        />
      </SimpleGrid>

      <Divider label={t("filters.tokensEstimate")} />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <NumberInput
          label={
            (
              <Group gap={6}>
                <Text size="sm">{t("filters.min")}</Text>
                <InfoTip text={t("filters.tokensMinTip")} />
              </Group>
            ) as any
          }
          min={0}
          value={filters.prompt_tokens_min}
          onChange={(v) => onSetPromptTokensMin(Number(v) || 0)}
        />
        <NumberInput
          label={
            (
              <Group gap={6}>
                <Text size="sm">{t("filters.max")}</Text>
                <InfoTip text={t("filters.tokensMaxTip")} />
              </Group>
            ) as any
          }
          min={0}
          value={filters.prompt_tokens_max}
          onChange={(v) => onSetPromptTokensMax(Number(v) || 0)}
        />
      </SimpleGrid>

      <Divider label={t("filters.altGreetings")} />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Select
          label={
            <Group gap={6}>
              <Text size="sm">{t("filters.presence")}</Text>
              <InfoTip text={t("filters.presenceTip")} />
            </Group>
          }
          data={TRI_STATE_DATA as any}
          value={filters.has_alternate_greetings}
          onChange={(v) => onSetHasAlternateGreetings((v as TriState) || "any")}
        />

        <NumberInput
          label={t("filters.minCount")}
          min={0}
          value={filters.alternate_greetings_min}
          onChange={(v) => onSetAlternateGreetingsMin(Number(v) || 0)}
        />
      </SimpleGrid>

      <Divider label={t("filters.fieldsPresence")} />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Select
          label={t("filters.hasCreatorNotes")}
          data={TRI_STATE_DATA as any}
          value={filters.has_creator_notes}
          onChange={(v) => onSetHasCreatorNotes((v as TriState) || "any")}
        />
        <Select
          label={t("filters.hasSystemPrompt")}
          data={TRI_STATE_DATA as any}
          value={filters.has_system_prompt}
          onChange={(v) => onSetHasSystemPrompt((v as TriState) || "any")}
        />
        <Select
          label={t("filters.hasPostHistoryInstructions")}
          data={TRI_STATE_DATA as any}
          value={filters.has_post_history_instructions}
          onChange={(v) =>
            onSetHasPostHistoryInstructions((v as TriState) || "any")
          }
        />
        <Select
          label={t("filters.hasPersonality")}
          data={TRI_STATE_DATA as any}
          value={filters.has_personality}
          onChange={(v) => onSetHasPersonality((v as TriState) || "any")}
        />
        <Select
          label={t("filters.hasScenario")}
          data={TRI_STATE_DATA as any}
          value={filters.has_scenario}
          onChange={(v) => onSetHasScenario((v as TriState) || "any")}
        />
        <Select
          label={t("filters.hasMesExample")}
          data={TRI_STATE_DATA as any}
          value={filters.has_mes_example}
          onChange={(v) => onSetHasMesExample((v as TriState) || "any")}
        />
        <Select
          label={t("filters.hasCharacterBook")}
          data={TRI_STATE_DATA as any}
          value={filters.has_character_book}
          onChange={(v) => onSetHasCharacterBook((v as TriState) || "any")}
        />
      </SimpleGrid>

      <Text size="sm" c="dimmed">
        {filters.q_mode === "fts"
          ? t("filters.noteFts")
          : t("filters.noteLike")}
      </Text>
    </Stack>
  );
}
