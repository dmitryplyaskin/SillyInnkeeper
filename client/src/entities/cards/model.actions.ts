import { combine, createEffect, createEvent, createStore, sample } from "effector";
import { notifications } from "@mantine/notifications";
import i18n from "@/shared/i18n/i18n";
import { deleteCard, renameCardMainFile, setCardHidden } from "@/shared/api/cards";
import { showFile } from "@/shared/api/explorer";
import { refreshCardsSilent } from "./model";
import { getFilenameFromPath, stripPngExt } from "./lib/path";

async function readErrorText(response: Response): Promise<string> {
  const txt = (await response.text().catch(() => "")).trim();
  return txt;
}

export const cardUpdated = createEvent<string>();
export const cardDeleted = createEvent<string>();

export const playInSillyTavernRequested = createEvent<{ cardId: string }>();
export const toggleHiddenRequested = createEvent<{
  cardId: string;
  isHidden: boolean;
}>();
export const openInExplorerRequested = createEvent<{ filePath: string }>();

export const openRenameMainFileModal = createEvent<{
  cardId: string;
  filePath: string;
}>();
export const closeRenameMainFileModal = createEvent<void>();
export const renameMainFileValueChanged = createEvent<string>();
export const renameMainFileConfirmed = createEvent<void>();

export const openDeleteCardModal = createEvent<{
  cardId: string;
  isSillyTavern: boolean;
}>();
export const closeDeleteCardModal = createEvent<void>();
export const deleteCardConfirmed = createEvent<void>();
export const deleteChatsToggled = createEvent<boolean>();

const playInSillyTavernFx = createEffect<{ cardId: string }, void, Error>(
  async ({ cardId }) => {
    const res = await fetch("/api/st/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId }),
    });
    if (!res.ok) {
      const errText = await readErrorText(res);
      throw new Error(errText || res.statusText);
    }
  }
);

const toggleHiddenFx = createEffect<
  { cardId: string; isHidden: boolean },
  { cardId: string; nextHidden: boolean },
  Error
>(async ({ cardId, isHidden }) => {
  await setCardHidden(cardId, !isHidden);
  return { cardId, nextHidden: !isHidden };
});

const openInExplorerFx = createEffect<{ filePath: string }, void, Error>(
  async ({ filePath }) => {
    await showFile(filePath);
  }
);

const renameMainFileFx = createEffect<
  { cardId: string; filename: string },
  { cardId: string },
  Error
>(async ({ cardId, filename }) => {
  await renameCardMainFile(cardId, filename);
  return { cardId };
});

const deleteCardFx = createEffect<
  { cardId: string; deleteChats: boolean },
  { cardId: string; chats_deleted?: boolean; chats_delete_error?: string },
  Error
>(async ({ cardId, deleteChats }) => {
  const res = await deleteCard(cardId, { deleteChats });
  return { cardId, ...res };
});

export const $isPlayingInSillyTavern = combine(
  playInSillyTavernFx.pending,
  (p) => p
);
export const $isTogglingHidden = combine(toggleHiddenFx.pending, (p) => p);
export const $isOpeningInExplorer = combine(openInExplorerFx.pending, (p) => p);
export const $isRenamingMainFile = combine(renameMainFileFx.pending, (p) => p);
export const $isDeletingCard = combine(deleteCardFx.pending, (p) => p);

type RenameModalState = {
  opened: boolean;
  cardId: string | null;
  filePath: string | null;
  value: string;
};

type DeleteModalState = {
  opened: boolean;
  cardId: string | null;
  isSillyTavern: boolean;
  deleteChats: boolean;
};

export const $renameMainFileModal = createStore<RenameModalState>({
  opened: false,
  cardId: null,
  filePath: null,
  value: "",
})
  .on(openRenameMainFileModal, (_, p) => {
    const base = stripPngExt(getFilenameFromPath(p.filePath));
    return {
      opened: true,
      cardId: p.cardId,
      filePath: p.filePath,
      value: base,
    };
  })
  .on(closeRenameMainFileModal, () => ({
    opened: false,
    cardId: null,
    filePath: null,
    value: "",
  }))
  .on(renameMainFileValueChanged, (s, v) => ({ ...s, value: v }));

export const $deleteCardModal = createStore<DeleteModalState>({
  opened: false,
  cardId: null,
  isSillyTavern: false,
  deleteChats: false,
})
  .on(openDeleteCardModal, (_, p) => ({
    opened: true,
    cardId: p.cardId,
    isSillyTavern: p.isSillyTavern,
    deleteChats: false,
  }))
  .on(closeDeleteCardModal, () => ({
    opened: false,
    cardId: null,
    isSillyTavern: false,
    deleteChats: false,
  }))
  .on(deleteChatsToggled, (s, v) => ({
    ...s,
    deleteChats: Boolean(v),
  }));

sample({
  clock: playInSillyTavernRequested,
  target: playInSillyTavernFx,
});

playInSillyTavernFx.done.watch(() => {
  notifications.show({
    title: i18n.t("cardDetails.playInSillyTavern"),
    message: i18n.t("cardDetails.playSent"),
    color: "green",
  });
});
playInSillyTavernFx.fail.watch(() => {
  notifications.show({
    title: i18n.t("cardDetails.playInSillyTavern"),
    message: i18n.t("cardDetails.playFailed"),
    color: "red",
  });
});

sample({
  clock: toggleHiddenRequested,
  target: toggleHiddenFx,
});

toggleHiddenFx.doneData.watch(({ nextHidden }) => {
  notifications.show({
    title: i18n.t("cardDetails.actions"),
    message: nextHidden
      ? i18n.t("cardDetails.hideOk")
      : i18n.t("cardDetails.showOk"),
    color: "green",
  });
});
toggleHiddenFx.fail.watch(() => {
  notifications.show({
    title: i18n.t("cardDetails.actions"),
    message: i18n.t("cardDetails.hideFailed"),
    color: "red",
  });
});

sample({
  clock: toggleHiddenFx.doneData,
  fn: ({ cardId }) => cardId,
  target: cardUpdated,
});

sample({
  clock: toggleHiddenFx.doneData,
  fn: () => undefined,
  target: refreshCardsSilent,
});

sample({
  clock: openInExplorerRequested,
  target: openInExplorerFx,
});

openInExplorerFx.done.watch(() => {
  notifications.show({
    title: i18n.t("cardDetails.openInExplorer"),
    message: i18n.t("cardDetails.openInExplorerHint"),
    color: "blue",
    autoClose: 3500,
  });
});
openInExplorerFx.failData.watch((e: Error) => {
  notifications.show({
    title: i18n.t("cardDetails.openInExplorer"),
    message: e.message.trim() ? e.message : i18n.t("cardDetails.openInExplorerFailed"),
    color: "red",
  });
});

sample({
  clock: renameMainFileConfirmed,
  source: $renameMainFileModal,
  filter: (m) =>
    Boolean(m.opened && m.cardId && m.filePath && m.value.trim().length > 0),
  fn: (m) => ({
    cardId: m.cardId as string,
    filename: m.value.trim(),
  }),
  target: renameMainFileFx,
});

renameMainFileFx.doneData.watch(() => {
  notifications.show({
    title: i18n.t("cardDetails.rename"),
    message: i18n.t("cardDetails.renameOk"),
    color: "green",
  });
});
renameMainFileFx.fail.watch(() => {
  notifications.show({
    title: i18n.t("cardDetails.rename"),
    message: i18n.t("cardDetails.renameFailed"),
    color: "red",
  });
});

sample({
  clock: renameMainFileFx.doneData,
  fn: () => undefined,
  target: closeRenameMainFileModal,
});

sample({
  clock: renameMainFileFx.doneData,
  fn: ({ cardId }) => cardId,
  target: cardUpdated,
});

sample({
  clock: renameMainFileFx.doneData,
  fn: () => undefined,
  target: refreshCardsSilent,
});

sample({
  clock: deleteCardConfirmed,
  source: $deleteCardModal,
  filter: (m) => Boolean(m.opened && m.cardId),
  fn: (m) => ({
    cardId: m.cardId as string,
    deleteChats: Boolean(m.isSillyTavern && m.deleteChats),
  }),
  target: deleteCardFx,
});

deleteCardFx.doneData.watch(({ chats_delete_error }) => {
  notifications.show({
    title: i18n.t("cardDetails.delete"),
    message: i18n.t("cardDetails.cardDeleted"),
    color: "green",
  });

  const err = (chats_delete_error ?? "").trim();
  if (err) {
    notifications.show({
      title: i18n.t("cardDetails.delete"),
      message: i18n.t("cardDetails.chatsDeleteFailed"),
      color: "yellow",
      autoClose: 6500,
    });
  }
});
deleteCardFx.fail.watch(() => {
  notifications.show({
    title: i18n.t("cardDetails.delete"),
    message: i18n.t("cardDetails.cardDeleteFailed"),
    color: "red",
  });
});

sample({
  clock: deleteCardFx.doneData,
  fn: () => undefined,
  target: closeDeleteCardModal,
});

sample({
  clock: deleteCardFx.doneData,
  fn: ({ cardId }) => cardId,
  target: cardDeleted,
});

sample({
  clock: deleteCardFx.doneData,
  fn: () => undefined,
  target: refreshCardsSilent,
});


