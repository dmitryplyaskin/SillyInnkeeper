import { useMemo } from "react";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import type { LorebookEntry } from "@/shared/types/lorebooks";
import {
  $lorebookEntrySearch,
  $lorebookPage,
  $lorebookPageSize,
  lorebookCollapseAll,
  lorebookEntrySearchChanged,
  lorebookPageChanged,
  lorebookPageSizeChanged,
} from "../../../model.lorebook-editor";
import { LorebookEntryCard } from "./LorebookEntryCard";

export function LorebookEntries({
  disabled,
  entries,
  onAdd,
  onUpdateEntry,
  onDeleteEntry,
  onDuplicateEntry,
  onMoveEntry,
}: {
  disabled?: boolean;
  entries: LorebookEntry[];
  onAdd: () => void;
  onUpdateEntry: (
    index: number,
    updater: (entry: LorebookEntry) => LorebookEntry
  ) => void;
  onDeleteEntry: (index: number) => void;
  onDuplicateEntry: (index: number) => void;
  onMoveEntry: (index: number, dir: "up" | "down") => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch, page, setPage, pageSize, setPageSize, collapseAll] =
    useUnit([
      $lorebookEntrySearch,
      lorebookEntrySearchChanged,
      $lorebookPage,
      lorebookPageChanged,
      $lorebookPageSize,
      lorebookPageSizeChanged,
      lorebookCollapseAll,
    ]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const items = entries.map((entry, index) => ({ entry, index }));
    if (!q) return items;
    return items.filter(({ entry, index }) => {
      const title = (entry.name ?? "").toString().toLowerCase();
      const keys = (entry.keys ?? []).join(",").toLowerCase();
      const content = (entry.content ?? "").toLowerCase();
      const idx = String(index + 1);
      return (
        title.includes(q) ||
        keys.includes(q) ||
        content.includes(q) ||
        idx === q
      );
    });
  }, [entries, search]);

  const paged = useMemo(() => {
    const safePageSize = Math.max(1, Math.min(200, Math.trunc(pageSize)));
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / safePageSize));
    const safePage = Math.max(1, Math.min(totalPages, Math.trunc(page)));
    const start = (safePage - 1) * safePageSize;
    const end = start + safePageSize;
    return {
      items: filtered.slice(start, end),
      total,
      totalPages,
      page: safePage,
      pageSize: safePageSize,
    };
  }, [filtered, page, pageSize]);

  return (
    <Paper p="sm">
      <Group
        justify="space-between"
        mb="xs"
        wrap="wrap"
        gap="xs"
        align="center"
      >
        <Text size="sm" fw={600}>
          {t("cardDetails.lorebook.entries", "Entries")} ({entries.length})
        </Text>

        <Group
          gap="xs"
          wrap="wrap"
          style={{ flex: 1, justifyContent: "flex-end" }}
        >
          <TextInput
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            placeholder={t(
              "cardDetails.lorebook.searchEntriesPlaceholder",
              "Title, keys, content…"
            )}
            disabled={disabled}
            size="xs"
            style={{ flex: 1, minWidth: 220 }}
          />
          <Select
            value={String(pageSize)}
            onChange={(v) => setPageSize(Number(v ?? 25))}
            data={[
              { value: "10", label: "10" },
              { value: "25", label: "25" },
              { value: "50", label: "50" },
              { value: "100", label: "100" },
            ]}
            disabled={disabled}
            size="xs"
            w={96}
          />
          <NumberInput
            value={paged.page}
            onChange={(v) =>
              setPage(typeof v === "number" && Number.isFinite(v) ? v : 1)
            }
            min={1}
            max={paged.totalPages}
            disabled={disabled}
            size="xs"
            w={96}
          />
          <Button onClick={onAdd} disabled={disabled} size="xs">
            {t("cardDetails.lorebook.addEntry", "Add Entry")}
          </Button>
          <Button
            variant="subtle"
            onClick={() => collapseAll()}
            disabled={disabled}
            size="xs"
          >
            {t("cardDetails.lorebook.collapseAll", "Collapse all")}
          </Button>
        </Group>
      </Group>

      <Text size="xs" c="dimmed" mb="xs">
        {t("cardDetails.lorebook.showing", "Showing")}{" "}
        {paged.total === 0
          ? "0"
          : `${(paged.page - 1) * paged.pageSize + 1}-${Math.min(
              paged.page * paged.pageSize,
              paged.total
            )}`}{" "}
        {t("cardDetails.lorebook.of", "of")} {paged.total}
      </Text>

      {entries.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="xl">
          {t(
            "cardDetails.lorebook.noEntries",
            "No entries yet. Add one to get started."
          )}
        </Text>
      ) : paged.total === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="xl">
          {t(
            "cardDetails.lorebook.noSearchResults",
            "No entries match your search."
          )}
        </Text>
      ) : (
        <Stack gap="xs">
          {paged.items.map(({ entry, index }) => (
            <LorebookEntryCard
              key={index}
              index={index}
              entry={entry}
              totalEntries={entries.length}
              disabled={disabled}
              onUpdateEntry={onUpdateEntry}
              onDeleteEntry={onDeleteEntry}
              onDuplicateEntry={onDuplicateEntry}
              onMoveEntry={onMoveEntry}
            />
          ))}
        </Stack>
      )}
    </Paper>
  );
}
