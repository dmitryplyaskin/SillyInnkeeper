import { combine, createEffect, createEvent, createStore, sample } from "effector";
import { getCardChat, getCardChats } from "@/shared/api/cards";
import type { CardChatDetails, CardChatSummary } from "@/shared/types/card-chats";
import { $details, $openedId, closeCard, openCard } from "./model";

type LoadChatsParams = { requestId: number; cardId: string };
type LoadChatsResult = { requestId: number; chats: CardChatSummary[] };

type LoadChatParams = { requestId: number; cardId: string; chatId: string };
type LoadChatResult = { requestId: number; chat: CardChatDetails };

const loadChatsInternalFx = createEffect<LoadChatsParams, LoadChatsResult, Error>(
  async ({ requestId, cardId }) => {
    const chats = await getCardChats(cardId);
    return { requestId, chats };
  }
);

const loadChatInternalFx = createEffect<LoadChatParams, LoadChatResult, Error>(
  async ({ requestId, cardId, chatId }) => {
    const chat = await getCardChat(cardId, chatId);
    return { requestId, chat };
  }
);

export const chatSelected = createEvent<string>();
const resetSelection = createEvent<void>();

export const $chats = createStore<CardChatSummary[]>([])
  .reset(closeCard)
  .reset(openCard);
export const $chatsError = createStore<string | null>(null)
  .reset(closeCard)
  .reset(openCard);
const $chatsRequestId = createStore(0).reset(closeCard).reset(openCard);

export const $selectedChatId = createStore<string | null>(null)
  .on(chatSelected, (_, id) => id)
  .on(resetSelection, () => null)
  .reset(closeCard)
  .reset(openCard);

export const $chat = createStore<CardChatDetails | null>(null)
  .reset(closeCard)
  .reset(openCard);
export const $chatError = createStore<string | null>(null)
  .reset(closeCard)
  .reset(openCard);
const $chatRequestId = createStore(0).reset(closeCard).reset(openCard);

export const $isChatsLoading = combine(loadChatsInternalFx.pending, (p) => p);
export const $isChatLoading = combine(loadChatInternalFx.pending, (p) => p);

const setChats = createEvent<CardChatSummary[]>();
const setChatsError = createEvent<string | null>();
const setChat = createEvent<CardChatDetails | null>();
const setChatError = createEvent<string | null>();

$chats.on(setChats, (_, v) => v);
$chatsError.on(setChatsError, (_, v) => v);
$chat.on(setChat, (_, v) => v);
$chatError.on(setChatError, (_, v) => v);

// Load chats list when card details are loaded (ST cards only)
sample({
  clock: $details.updates,
  source: { openedId: $openedId, lastRequestId: $chatsRequestId },
  filter: ({ openedId }, details) =>
    Boolean(
      openedId &&
        details &&
        details.id === openedId &&
        details.is_sillytavern === true
    ),
  fn: ({ openedId, lastRequestId }): LoadChatsParams => ({
    requestId: lastRequestId + 1,
    cardId: openedId as string,
  }),
  target: loadChatsInternalFx,
});

$chatsRequestId.on(loadChatsInternalFx, (_, p) => p.requestId);

sample({
  clock: loadChatsInternalFx.doneData,
  source: $chatsRequestId,
  filter: (lastId, done) => done.requestId === lastId,
  fn: (_, done) => done.chats,
  target: setChats,
});

sample({
  clock: loadChatsInternalFx.doneData,
  fn: () => null,
  target: setChatsError,
});

sample({
  clock: loadChatsInternalFx.failData,
  fn: (e: Error) => e.message,
  target: setChatsError,
});

// When non-ST details arrive, clear chats UI state
sample({
  clock: $details.updates,
  filter: (details) => Boolean(details && !details.is_sillytavern),
  fn: () => [],
  target: setChats,
});

sample({
  clock: $details.updates,
  filter: (details) => Boolean(details && !details.is_sillytavern),
  fn: () => undefined,
  target: resetSelection,
});

sample({
  clock: resetSelection,
  fn: () => null,
  target: [setChatsError, setChat, setChatError],
});

// Load selected chat
sample({
  clock: chatSelected,
  source: { openedId: $openedId, lastRequestId: $chatRequestId },
  filter: ({ openedId }, chatId) =>
    Boolean(openedId && typeof chatId === "string" && chatId.trim().length > 0),
  fn: ({ openedId, lastRequestId }, chatId): LoadChatParams => ({
    requestId: lastRequestId + 1,
    cardId: openedId as string,
    chatId: chatId.trim(),
  }),
  target: loadChatInternalFx,
});

$chatRequestId.on(loadChatInternalFx, (_, p) => p.requestId);

sample({
  clock: loadChatInternalFx,
  fn: () => null,
  target: [setChat, setChatError],
});

sample({
  clock: loadChatInternalFx.doneData,
  source: $chatRequestId,
  filter: (lastId, done) => done.requestId === lastId,
  fn: (_, done) => done.chat,
  target: setChat,
});

sample({
  clock: loadChatInternalFx.doneData,
  fn: () => null,
  target: setChatError,
});

sample({
  clock: loadChatInternalFx.failData,
  fn: (e: Error) => e.message,
  target: setChatError,
});


