import { useUnit } from "effector-react";
import {
  Alert,
  Button,
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
} from "@mantine/core";
import {
  $filters,
  $filtersData,
  $filtersError,
  $filtersLoading,
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
  setName,
  setSort,
  setSpecVersions,
  setTags,
} from "../model";
import type { TriState } from "@/shared/types/cards-query";

const TRI_STATE_DATA: Array<{ value: TriState; label: string }> = [
  { value: "any", label: "Не важно" },
  { value: "1", label: "Только с" },
  { value: "0", label: "Только без" },
];

const SORT_DATA = [
  { value: "created_at_desc", label: "Сначала новые" },
  { value: "created_at_asc", label: "Сначала старые" },
  { value: "name_asc", label: "Имя: А → Я" },
  { value: "name_desc", label: "Имя: Я → А" },
] as const;

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip label={text} withArrow multiline maw={280}>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="sm"
        radius="xl"
        aria-label="Пояснение"
      >
        i
      </ActionIcon>
    </Tooltip>
  );
}

export function CardsFiltersPanel() {
  const [
    filters,
    filtersData,
    filtersError,
    filtersLoading,
    loadFilters,
    onSetSort,
    onSetName,
    onSetCreators,
    onSetSpecVersions,
    onSetTags,
    onSetCreatedFrom,
    onSetCreatedTo,
    onSetHasCreatorNotes,
    onSetHasSystemPrompt,
    onSetHasPostHistoryInstructions,
    onSetHasPersonality,
    onSetHasScenario,
    onSetHasMesExample,
    onSetHasCharacterBook,
    onSetHasAlternateGreetings,
    onSetAlternateGreetingsMin,
    onReset,
  ] = useUnit([
    $filters,
    $filtersData,
    $filtersError,
    $filtersLoading,
    loadCardsFiltersFx,
    setSort,
    setName,
    setCreators,
    setSpecVersions,
    setTags,
    setCreatedFrom,
    setCreatedTo,
    setHasCreatorNotes,
    setHasSystemPrompt,
    setHasPostHistoryInstructions,
    setHasPersonality,
    setHasScenario,
    setHasMesExample,
    setHasCharacterBook,
    setHasAlternateGreetings,
    setAlternateGreetingsMin,
    resetFilters,
  ]);

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
            Сбросить
          </Button>
          <Button
            variant="light"
            loading={filtersLoading}
            onClick={() => {
              loadFilters();
            }}
          >
            Обновить списки
          </Button>
        </Group>
      </Group>

      {filtersError && (
        <Alert color="red" title="Ошибка загрузки фильтров">
          {filtersError}
        </Alert>
      )}

      <Divider label="Поиск и сортировка" />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <TextInput
          label="Имя"
          placeholder="Поиск по имени..."
          value={filters.name}
          onChange={(e) => onSetName(e.currentTarget.value)}
        />

        <Select
          label="Сортировка"
          data={[...SORT_DATA] as any}
          value={filters.sort}
          onChange={(v) => {
            if (v) onSetSort(v as any);
          }}
        />
      </SimpleGrid>

      <Divider
        label={
          <Group gap={6}>
            <Text size="sm">Метаданные</Text>
          </Group>
        }
      />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <MultiSelect
          label="Создатель"
          data={creatorOptions}
          value={filters.creator}
          onChange={onSetCreators}
          searchable
          clearable
        />

        <MultiSelect
          label="Версия спеки"
          data={specVersionOptions}
          value={filters.spec_version}
          onChange={onSetSpecVersions}
          searchable
          clearable
        />

        <MultiSelect
          label={
            <Group gap={6}>
              <Text size="sm">Теги</Text>
              <InfoTip text="Работает по AND: карточка должна содержать все выбранные теги." />
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
            <Text size="sm">Дата создания</Text>
            <InfoTip text="Фильтрация по суткам в локальном времени." />
          </Group>
        }
      />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <TextInput
          label="Создано: от"
          type="date"
          value={filters.created_from || ""}
          onChange={(e) =>
            onSetCreatedFrom(
              e.currentTarget.value.trim().length > 0
                ? e.currentTarget.value
                : undefined
            )
          }
        />

        <TextInput
          label="Создано: до"
          type="date"
          value={filters.created_to || ""}
          onChange={(e) =>
            onSetCreatedTo(
              e.currentTarget.value.trim().length > 0
                ? e.currentTarget.value
                : undefined
            )
          }
        />
      </SimpleGrid>

      <Divider label="Альтернативные приветствия" />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Select
          label={
            <Group gap={6}>
              <Text size="sm">Наличие</Text>
              <InfoTip text="«Есть» — минимум 1 (или больше, если задано «Минимум»). «Нет» — строго 0. «Не важно» — учитывается только «Минимум»." />
            </Group>
          }
          data={TRI_STATE_DATA as any}
          value={filters.has_alternate_greetings}
          onChange={(v) => onSetHasAlternateGreetings((v as TriState) || "any")}
        />

        <NumberInput
          label="Минимум, шт."
          min={0}
          value={filters.alternate_greetings_min}
          onChange={(v) => onSetAlternateGreetingsMin(Number(v) || 0)}
        />
      </SimpleGrid>

      <Divider label="Наличие полей" />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Select
          label="Заметки автора"
          data={TRI_STATE_DATA as any}
          value={filters.has_creator_notes}
          onChange={(v) => onSetHasCreatorNotes((v as TriState) || "any")}
        />
        <Select
          label="Системный промпт"
          data={TRI_STATE_DATA as any}
          value={filters.has_system_prompt}
          onChange={(v) => onSetHasSystemPrompt((v as TriState) || "any")}
        />
        <Select
          label="Инструкции истории"
          data={TRI_STATE_DATA as any}
          value={filters.has_post_history_instructions}
          onChange={(v) =>
            onSetHasPostHistoryInstructions((v as TriState) || "any")
          }
        />
        <Select
          label="Личность"
          data={TRI_STATE_DATA as any}
          value={filters.has_personality}
          onChange={(v) => onSetHasPersonality((v as TriState) || "any")}
        />
        <Select
          label="Сценарий"
          data={TRI_STATE_DATA as any}
          value={filters.has_scenario}
          onChange={(v) => onSetHasScenario((v as TriState) || "any")}
        />
        <Select
          label="Пример сообщений"
          data={TRI_STATE_DATA as any}
          value={filters.has_mes_example}
          onChange={(v) => onSetHasMesExample((v as TriState) || "any")}
        />
        <Select
          label="Лорбук"
          data={TRI_STATE_DATA as any}
          value={filters.has_character_book}
          onChange={(v) => onSetHasCharacterBook((v as TriState) || "any")}
        />
      </SimpleGrid>

      <Text size="sm" c="dimmed">
        Примечание: полнотекстовый поиск по description/first_mes будет добавлен
        позже через FTS5.
      </Text>
    </Stack>
  );
}
