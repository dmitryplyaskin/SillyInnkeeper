import { useEffect, useMemo, useRef } from "react";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Grid,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import i18n from "@/shared/i18n/i18n";
import type { CardChatMessage, CardChatSummary } from "@/shared/types/card-chats";
import {
  $chat,
  $chatError,
  $chats,
  $chatsError,
  $isChatLoading,
  $isChatsLoading,
  $selectedChatId,
  chatSelected,
} from "../../../model.chats";

function formatDateOrDash(ms: number): string {
  if (!(ms > 0)) return i18n.t("empty.dash");
  const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
  return new Date(ms).toLocaleString(locale);
}

function ChatListItem({
  chat,
  selected,
  onClick,
}: {
  chat: CardChatSummary;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <UnstyledButton onClick={onClick} style={{ width: "100%" }}>
      <Paper
        p="sm"
        withBorder
        style={{
          background: selected ? "rgba(34, 139, 230, 0.10)" : undefined,
          borderColor: selected ? "rgba(34, 139, 230, 0.45)" : undefined,
        }}
      >
        <Stack gap={2}>
          <Text fw={650} lineClamp={1}>
            {chat.title || chat.id}
          </Text>
          <Group justify="space-between" wrap="nowrap">
            <Text size="xs" c="dimmed">
              {i18n.t("cardDetails.chats.messagesCount", {
                count: chat.messages_count,
              })}
            </Text>
            <Text size="xs" c="dimmed">
              {formatDateOrDash(chat.last_message_at)}
            </Text>
          </Group>
        </Stack>
      </Paper>
    </UnstyledButton>
  );
}

function ChatMessage({
  msg,
}: {
  msg: CardChatMessage;
}) {
  const header = useMemo(() => {
    const who = msg.name?.trim() ? msg.name.trim() : msg.is_user ? "You" : "";
    const date = formatDateOrDash(msg.send_date_ms);
    return { who, date };
  }, [msg.is_user, msg.name, msg.send_date_ms]);

  const bg = msg.is_system
    ? "rgba(0, 0, 0, 0.04)"
    : msg.is_user
    ? "rgba(34, 139, 230, 0.06)"
    : "rgba(99, 230, 190, 0.06)";

  return (
    <Paper p="sm" withBorder style={{ background: bg }}>
      <Group justify="space-between" wrap="nowrap" mb={6}>
        <Text size="sm" fw={650} lineClamp={1}>
          {header.who || i18n.t("empty.dash")}
        </Text>
        <Text size="xs" c="dimmed">
          {header.date}
        </Text>
      </Group>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ children, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          pre: ({ children, ...props }) => (
            <pre {...props} style={{ whiteSpace: "pre-wrap" }}>
              {children}
            </pre>
          ),
        }}
      >
        {msg.mes ?? ""}
      </ReactMarkdown>
    </Paper>
  );
}

export function CardChatsTab() {
  const { t } = useTranslation();
  const [
    chats,
    chatsError,
    isChatsLoading,
    selectedChatId,
    selectChat,
    chat,
    isChatLoading,
    chatError,
  ] = useUnit([
    $chats,
    $chatsError,
    $isChatsLoading,
    $selectedChatId,
    chatSelected,
    $chat,
    $isChatLoading,
    $chatError,
  ]);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chat || isChatLoading) return;
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [chat?.id, chat?.messages.length, isChatLoading]);

  const hasChats = chats.length > 0;

  return (
    <Grid gutter="md" columns={24}>
      <Grid.Col span={{ base: 24, md: 7 }}>
        <Paper p="md" withBorder style={{ height: 680 }}>
          <Group justify="space-between" align="center" mb="sm">
            <Text fw={650}>{t("cardDetails.chats.title")}</Text>
            {isChatsLoading ? <Loader size="sm" /> : null}
          </Group>

          {chatsError ? (
            <Alert color="red" variant="light" mb="sm">
              {chatsError}
            </Alert>
          ) : null}

          {!isChatsLoading && !hasChats ? (
            <Text c="dimmed">{t("cardDetails.chats.empty")}</Text>
          ) : (
            <ScrollArea h={610} type="auto" offsetScrollbars>
              <Stack gap="xs" pr={6}>
                {chats.map((c) => (
                  <ChatListItem
                    key={c.id}
                    chat={c}
                    selected={c.id === selectedChatId}
                    onClick={() => selectChat(c.id)}
                  />
                ))}
              </Stack>
            </ScrollArea>
          )}
        </Paper>
      </Grid.Col>

      <Grid.Col span={{ base: 24, md: 17 }}>
        <Paper p="md" withBorder style={{ height: 680 }}>
          <Group justify="space-between" align="center" mb="sm">
            <Text fw={650}>
              {chat?.title
                ? t("cardDetails.chats.chatTitle", { title: chat.title })
                : t("cardDetails.chats.chatTitleEmpty")}
            </Text>
            {isChatLoading ? <Loader size="sm" /> : null}
          </Group>

          {chatError ? (
            <Alert color="red" variant="light" mb="sm">
              {chatError}
            </Alert>
          ) : null}

          {!selectedChatId ? (
            <Text c="dimmed">{t("cardDetails.chats.selectChatHint")}</Text>
          ) : !chat && isChatLoading ? (
            <Group justify="center" align="center" style={{ height: 600 }}>
              <Loader />
            </Group>
          ) : chat ? (
            <ScrollArea h={610} type="auto" offsetScrollbars>
              <Stack gap="sm" pr={6}>
                {chat.messages.map((m, idx) => (
                  <ChatMessage key={`${idx}-${m.send_date_ms}`} msg={m} />
                ))}
                <div ref={bottomRef} />
              </Stack>
            </ScrollArea>
          ) : (
            <Text c="dimmed">{t("empty.dash")}</Text>
          )}
        </Paper>
      </Grid.Col>
    </Grid>
  );
}


