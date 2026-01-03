import { useUnit } from "effector-react";
import { Divider, Select, SimpleGrid, Text, TextInput } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { CardsSort } from "@/shared/types/cards-query";
import { $filters, setName, setSort } from "../../model";

const SORT_DATA = [
  { value: "created_at_desc", label: "filters.sortNewFirst" },
  { value: "created_at_asc", label: "filters.sortOldFirst" },
  { value: "name_asc", label: "filters.sortNameAsc" },
  { value: "name_desc", label: "filters.sortNameDesc" },
  { value: "prompt_tokens_desc", label: "filters.sortTokensDesc" },
  { value: "prompt_tokens_asc", label: "filters.sortTokensAsc" },
  { value: "st_chats_count_desc", label: "filters.sortChatsCountDesc" },
  { value: "st_chats_count_asc", label: "filters.sortChatsCountAsc" },
  { value: "st_last_chat_at_desc", label: "filters.sortLastChatDesc" },
  { value: "st_last_chat_at_asc", label: "filters.sortLastChatAsc" },
  { value: "relevance", label: "filters.sortRelevance" },
] as const;

const $name = $filters.map((s) => s.name);
const $sort = $filters.map((s) => s.sort);
const $q = $filters.map((s) => s.q);
const $qMode = $filters.map((s) => s.q_mode);

export function SearchAndSortSection() {
  const { t } = useTranslation();
  const [name, sort, q, qMode, onSetName, onSetSort] = useUnit([
    $name,
    $sort,
    $q,
    $qMode,
    setName,
    setSort,
  ]);

  const isRelevanceWithoutQuery = sort === "relevance" && q.trim().length === 0;
  const isRelevanceInLikeMode =
    sort === "relevance" && q.trim().length > 0 && qMode !== "fts";

  return (
    <>
      <Divider label={t("filters.searchAndSort")} />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <TextInput
          label={t("filters.name")}
          placeholder={t("filters.namePlaceholder")}
          value={name}
          onChange={(e) => onSetName(e.currentTarget.value)}
        />

        <Select
          label={t("filters.sort")}
          data={SORT_DATA.map((x) => ({ value: x.value, label: t(x.label) }))}
          value={sort}
          onChange={(v) => {
            if (v) onSetSort(v as CardsSort);
          }}
        />
      </SimpleGrid>

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
    </>
  );
}


