import { useMemo } from "react";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import { Accordion, Alert, List, Spoiler, Stack, Text } from "@mantine/core";
import type {
  Lorebook,
  LorebookDetails,
  LorebookEntry,
} from "@/shared/types/lorebooks";
import {
  $lorebook,
  lorebookChanged,
  lorebookCleared,
} from "../../../model.form";
import { LorebookPicker } from "./LorebookPicker";
import { LorebookEntries } from "./LorebookEntries";
import { LorebookSettings } from "./LorebookSettings";

function createEmptyEntry(): LorebookEntry {
  return {
    keys: [],
    content: "",
    extensions: {},
    enabled: true,
    insertion_order: 0,
    use_regex: false,
  };
}

function ensureLorebookStructure(data: unknown): Lorebook {
  const isPlainObject = (v: unknown): v is Record<string, any> =>
    Boolean(v) && typeof v === "object" && !Array.isArray(v);

  const normalizeEntry = (raw: unknown): LorebookEntry => {
    if (!isPlainObject(raw)) return createEmptyEntry();

    const keysOk =
      Array.isArray(raw.keys) &&
      raw.keys.every((k: unknown) => typeof k === "string");
    const contentOk = typeof raw.content === "string";
    const extensionsOk = isPlainObject(raw.extensions);
    const enabledOk = typeof raw.enabled === "boolean";
    const insertionOrderOk = typeof raw.insertion_order === "number";
    const useRegexOk = typeof raw.use_regex === "boolean";

    // Fast path: keep reference to avoid re-rendering all entries on each change.
    if (
      keysOk &&
      contentOk &&
      extensionsOk &&
      enabledOk &&
      insertionOrderOk &&
      useRegexOk
    ) {
      return raw as LorebookEntry;
    }

    return {
      ...createEmptyEntry(),
      ...raw,
      keys: Array.isArray(raw.keys)
        ? raw.keys.filter((k) => typeof k === "string")
        : [],
      content: typeof raw.content === "string" ? raw.content : "",
      extensions: isPlainObject(raw.extensions) ? raw.extensions : {},
      enabled: typeof raw.enabled === "boolean" ? raw.enabled : true,
      insertion_order:
        typeof raw.insertion_order === "number" ? raw.insertion_order : 0,
      use_regex: typeof raw.use_regex === "boolean" ? raw.use_regex : false,
    };
  };

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {
      extensions: {},
      entries: [],
    };
  }

  const lb = data as Partial<Lorebook>;
  return {
    name: lb.name,
    description: lb.description,
    scan_depth: lb.scan_depth,
    token_budget: lb.token_budget,
    recursive_scanning: lb.recursive_scanning,
    extensions:
      lb.extensions &&
      typeof lb.extensions === "object" &&
      !Array.isArray(lb.extensions)
        ? (lb.extensions as Record<string, any>)
        : {},
    entries: Array.isArray(lb.entries) ? lb.entries.map(normalizeEntry) : [],
  };
}

export function LorebookEditor({
  openedId,
  disabled = false,
}: {
  openedId: string | null;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const contentKey = openedId ?? "none";

  const [lorebook, changeLorebook, clearLorebook] = useUnit([
    $lorebook,
    lorebookChanged,
    lorebookCleared,
  ]);
  const isLorebookAttached = Boolean(lorebook);

  const lorebookData = useMemo(() => {
    if (!lorebook?.data) return ensureLorebookStructure(null);
    return ensureLorebookStructure(lorebook.data);
  }, [lorebook?.data]);

  const updateLorebookData = (updater: (data: Lorebook) => Lorebook) => {
    if (!lorebook) return;
    const updated = updater(lorebookData);
    changeLorebook({ ...lorebook, data: updated });
  };

  const updateEntry = (
    index: number,
    updater: (entry: LorebookEntry) => LorebookEntry
  ) => {
    updateLorebookData((data) => {
      const entries = [...data.entries];
      entries[index] = updater(entries[index] || createEmptyEntry());
      return { ...data, entries };
    });
  };

  const addEntry = () => {
    updateLorebookData((data) => {
      const newEntry = {
        ...createEmptyEntry(),
        insertion_order: data.entries.length,
      };
      return { ...data, entries: [...data.entries, newEntry] };
    });
  };

  const deleteEntry = (index: number) => {
    updateLorebookData((data) => {
      const remaining = data.entries.filter((_, idx) => idx !== index);
      const entries = remaining.map((entry, idx) =>
        entry.insertion_order === idx
          ? entry
          : { ...entry, insertion_order: idx }
      );
      return { ...data, entries };
    });
  };

  const duplicateEntry = (index: number) => {
    updateLorebookData((data) => {
      const entries = [...data.entries];
      const entry = entries[index];
      if (!entry) return data;
      const duplicated = { ...entry, extensions: { ...entry.extensions } };
      duplicated.insertion_order = entries.length;
      entries.push(duplicated);
      return { ...data, entries };
    });
  };

  const moveEntry = (index: number, direction: "up" | "down") => {
    updateLorebookData((data) => {
      const entries = data.entries;
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= entries.length) return data;

      const a = entries[index];
      const b = entries[newIndex];
      if (!a || !b) return data;

      const next = entries.slice();
      next[index] = { ...b, insertion_order: index };
      next[newIndex] = { ...a, insertion_order: newIndex };
      return { ...data, entries: next };
    });
  };

  const handleCreateNew = () => {
    const emptyLorebook: LorebookDetails = {
      id: "",
      name: null,
      description: null,
      spec: "lorebook_v3",
      created_at: 0,
      updated_at: 0,
      data: ensureLorebookStructure(null),
      cards: [],
    };
    changeLorebook(emptyLorebook);
  };

  return (
    <Stack key={contentKey} gap="sm">
      <Accordion multiple defaultValue={["lorebook"]} variant="contained">
        <Accordion.Item value="lorebook">
          <Accordion.Control>
            {t("cardDetails.lorebook.controls", "Lorebook")}
          </Accordion.Control>
          <Accordion.Panel>
            <LorebookPicker
              disabled={disabled}
              onCreateNew={handleCreateNew}
              onClear={clearLorebook}
              variant="panel"
            />

            <Alert
              mt="sm"
              color="blue"
              variant="light"
              title={t("cardDetails.lorebook.helpTitle", "How saving works")}
            >
              <Spoiler
                maxHeight={42}
                showLabel={t("actions.show", "Show")}
                hideLabel={t("actions.hide", "Hide")}
              >
                <List spacing={4} size="xs">
                  <List.Item>
                    {t(
                      "cardDetails.lorebook.helpLine1",
                      "There are two places: card file (PNG) and lorebooks database."
                    )}
                  </List.Item>
                  <List.Item>
                    {t(
                      "cardDetails.lorebook.helpLine2",
                      "Main “Save” (Actions) writes the lorebook into the card PNG."
                    )}
                  </List.Item>
                  <List.Item>
                    {t(
                      "cardDetails.lorebook.helpLine3",
                      "“Save Lorebook” (Shared mode) updates the lorebook in the database, but does not change the card PNG."
                    )}
                  </List.Item>
                  <List.Item>
                    {t(
                      "cardDetails.lorebook.helpLine4",
                      "To make sure export PNG contains your changes, save the card."
                    )}
                  </List.Item>
                  <List.Item>
                    {t(
                      "cardDetails.lorebook.helpLine5",
                      "Copy affects only this card; Shared affects the selected lorebook (which other cards may use)."
                    )}
                  </List.Item>
                  <List.Item>
                    {t(
                      "cardDetails.lorebook.helpLine6",
                      "Changes are not automatically applied to other cards. To update other cards, you need to save those cards (rewrite their PNG files)."
                    )}
                  </List.Item>
                </List>
              </Spoiler>
            </Alert>

            {!isLorebookAttached ? (
              <Text size="xs" c="dimmed" mt="xs">
                {t(
                  "cardDetails.lorebook.noLorebook",
                  "No lorebook attached to this card."
                )}
              </Text>
            ) : null}
          </Accordion.Panel>
        </Accordion.Item>

        {isLorebookAttached ? (
          <Accordion.Item value="settings">
            <Accordion.Control>
              {t("cardDetails.lorebook.settings", "Lorebook Settings")}
            </Accordion.Control>
            <Accordion.Panel>
              <LorebookSettings
                disabled={disabled}
                data={lorebookData}
                onChange={updateLorebookData}
                variant="panel"
              />
            </Accordion.Panel>
          </Accordion.Item>
        ) : null}
      </Accordion>

      {isLorebookAttached ? (
        <LorebookEntries
          disabled={disabled}
          entries={lorebookData.entries}
          onAdd={addEntry}
          onUpdateEntry={updateEntry}
          onDeleteEntry={deleteEntry}
          onDuplicateEntry={duplicateEntry}
          onMoveEntry={moveEntry}
        />
      ) : null}
    </Stack>
  );
}
