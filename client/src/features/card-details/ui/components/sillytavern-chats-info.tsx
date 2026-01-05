import { Group, Text } from "@mantine/core";
import i18n from "@/shared/i18n/i18n";

export interface SillyTavernFileMetaLike {
  st_chats_count?: number | null;
  st_last_chat_at?: number | null;
  st_first_chat_at?: number | null;
}

function formatDateOrNone(ms: number): string {
  if (!(ms > 0)) return i18n.t("empty.none");
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  return new Date(ms).toLocaleString(locale);
}

export function SillyTavernChatsInfo({
  filesMeta,
}: {
  filesMeta: SillyTavernFileMetaLike[] | null | undefined;
}) {
  const meta = Array.isArray(filesMeta) ? filesMeta : [];

  const totalChats = meta.reduce(
    (acc, m) =>
      acc +
      (Number.isFinite(m.st_chats_count) ? (m.st_chats_count as number) : 0),
    0
  );

  const lastChatAt = meta.reduce(
    (acc, m) =>
      Math.max(
        acc,
        Number.isFinite(m.st_last_chat_at) ? (m.st_last_chat_at as number) : 0
      ),
    0
  );

  const firstChatAt = meta.reduce((acc, m) => {
    const v = Number.isFinite(m.st_first_chat_at)
      ? (m.st_first_chat_at as number)
      : 0;
    if (v <= 0) return acc;
    return acc === 0 ? v : Math.min(acc, v);
  }, 0);

  return (
    <>
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm" c="dimmed">
          {i18n.t("cardDetails.stChatsCount")}
        </Text>
        <Text size="sm">
          {totalChats > 0 ? String(totalChats) : i18n.t("empty.none")}
        </Text>
      </Group>

      <Group justify="space-between" wrap="nowrap">
        <Text size="sm" c="dimmed">
          {i18n.t("cardDetails.stLastChat")}
        </Text>
        <Text size="sm">{formatDateOrNone(lastChatAt)}</Text>
      </Group>

      <Group justify="space-between" wrap="nowrap">
        <Text size="sm" c="dimmed">
          {i18n.t("cardDetails.stFirstChat")}
        </Text>
        <Text size="sm">{formatDateOrNone(firstChatAt)}</Text>
      </Group>
    </>
  );
}
