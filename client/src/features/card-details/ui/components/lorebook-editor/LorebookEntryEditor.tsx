import { Stack } from "@mantine/core";
import type { LorebookEntry } from "@/shared/types/lorebooks";
import { getStExt } from "@/shared/types/lorebooks/sillytavern";
import { EntryStLikeFields } from "./entry-editor/entry-st-like-fields";

export function LorebookEntryEditor({
  entry,
  index,
  disabled,
  onUpdate,
}: {
  entry: LorebookEntry;
  index: number;
  disabled?: boolean;
  onUpdate: (updater: (entry: LorebookEntry) => LorebookEntry) => void;
}) {
  const st = getStExt(entry).entry ?? {};

  const resetKeyBase = `${index}:${entry.insertion_order}:${
    entry.enabled ? 1 : 0
  }`;

  return (
    <Stack gap="xs" mt="xs">
      <EntryStLikeFields
        entry={entry}
        disabled={disabled}
        st={st}
        resetKeyBase={resetKeyBase}
        onUpdate={onUpdate}
      />
    </Stack>
  );
}
