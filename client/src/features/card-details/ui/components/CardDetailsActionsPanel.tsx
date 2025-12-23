import { useState } from "react";
import {
  ActionIcon,
  Button,
  Code,
  Divider,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useUnit } from "effector-react";
import type { CardDetails } from "@/shared/types/cards";
import i18n from "@/shared/i18n/i18n";
import { deleteCard, deleteCardFileDuplicate } from "@/shared/api/cards";
import {
  renameCardMainFile,
  saveCard,
  setCardMainFile,
} from "@/shared/api/cards";
import { showFile } from "@/shared/api/explorer";
import { CopyableTruncatedText } from "@/shared/ui/CopyableTruncatedText";
import { closeCard, openCard } from "../../model";
import {
  $altGreetingIds,
  $altGreetingValues,
  $draft,
  $groupGreetingIds,
  $groupGreetingValues,
  $lorebook,
  draftSaved,
} from "../../model.form";

function getFilenameFromPath(filePath: string | null | undefined): string {
  const p = (filePath ?? "").trim();
  if (!p) return i18n.t("empty.dash");
  const parts = p.split(/[/\\]+/);
  return parts[parts.length - 1] || i18n.t("empty.dash");
}

function stripPngExt(name: string): string {
  return name.replace(/\.png$/i, "");
}

export function CardDetailsActionsPanel({
  details,
}: {
  details: CardDetails | null;
}) {
  const [isSendingPlay, setIsSendingPlay] = useState(false);
  const [confirmDeleteDuplicateOpened, setConfirmDeleteDuplicateOpened] =
    useState(false);
  const [confirmDeleteCardOpened, setConfirmDeleteCardOpened] = useState(false);
  const [renameOpened, setRenameOpened] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [selectedDuplicatePath, setSelectedDuplicatePath] = useState<
    string | null
  >(null);
  const [isDeletingDuplicate, setIsDeletingDuplicate] = useState(false);
  const [isDeletingCard, setIsDeletingCard] = useState(false);
  const [isSettingMainFile, setIsSettingMainFile] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [isOpeningInExplorer, setIsOpeningInExplorer] = useState(false);
  const [openingDuplicatePath, setOpeningDuplicatePath] = useState<
    string | null
  >(null);
  const [saveOpened, setSaveOpened] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingCardJson, setPendingCardJson] = useState<unknown | null>(null);

  const [draft, altIds, altValues, groupIds, groupValues, lorebook, markSaved] = useUnit([
    $draft,
    $altGreetingIds,
    $altGreetingValues,
    $groupGreetingIds,
    $groupGreetingValues,
    $lorebook,
    draftSaved,
  ]);

  function canonicalizeForCompare(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    if (Array.isArray(value)) return value.map(canonicalizeForCompare);
    if (typeof value !== "object") return value;

    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      if (key === "creation_date" || key === "modification_date") continue;
      out[key] = canonicalizeForCompare(obj[key]);
    }
    return out;
  }

  function canonicalJsonString(value: unknown): string {
    try {
      return JSON.stringify(canonicalizeForCompare(value));
    } catch {
      return String(value);
    }
  }

  function buildCcv3ToSave(): unknown | null {
    if (!details) return null;

    const baseObj =
      details.data_json &&
      typeof details.data_json === "object" &&
      details.data_json !== null
        ? (details.data_json as any)
        : {};
    const baseData =
      baseObj.data && typeof baseObj.data === "object" && baseObj.data !== null
        ? baseObj.data
        : {};

    const alternate_greetings = altIds.map((id) => groupTrim(altValues[id]));
    const group_only_greetings = groupIds.map((id) =>
      groupTrim(groupValues[id])
    );

    const creator_notes_multilingual =
      baseData.creator_notes_multilingual &&
      typeof baseData.creator_notes_multilingual === "object" &&
      baseData.creator_notes_multilingual !== null
        ? {
            ...(baseData.creator_notes_multilingual as any),
            en: draft.creator_notes,
          }
        : undefined;

    const nextData: any = {
      ...baseData,
      name: draft.name,
      creator: draft.creator,
      tags: draft.tags,
      description: draft.description,
      personality: draft.personality,
      scenario: draft.scenario,
      first_mes: draft.first_mes,
      mes_example: draft.mes_example,
      creator_notes: draft.creator_notes,
      ...(creator_notes_multilingual
        ? { creator_notes_multilingual }
        : undefined),
      system_prompt: draft.system_prompt,
      post_history_instructions: draft.post_history_instructions,
      alternate_greetings,
      group_only_greetings,
      extensions:
        baseData.extensions &&
        typeof baseData.extensions === "object" &&
        baseData.extensions !== null
          ? baseData.extensions
          : {},
    };

    // Include lorebook data if present
    if (lorebook?.data) {
      nextData.character_book = lorebook.data;
    } else {
      // Remove character_book if lorebook was cleared
      delete nextData.character_book;
    }

    // v3-required arrays
    if (!Array.isArray(nextData.alternate_greetings))
      nextData.alternate_greetings = [];
    if (!Array.isArray(nextData.group_only_greetings))
      nextData.group_only_greetings = [];

    return {
      ...baseObj,
      spec: "chara_card_v3",
      spec_version: "3.0",
      data: nextData,
    };
  }

  function groupTrim(value: unknown): string {
    return typeof value === "string" ? value : String(value ?? "");
  }

  const exportPngUrl = details?.id
    ? `/api/cards/${encodeURIComponent(details.id)}/export.png?download=1`
    : undefined;

  async function playInSillyTavern(): Promise<void> {
    if (!details?.id) return;
    if (isSendingPlay) return;
    setIsSendingPlay(true);
    try {
      const res = await fetch("/api/st/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: details.id }),
      });
      if (!res.ok) {
        const errText = (await res.text().catch(() => "")).trim();
        throw new Error(errText || res.statusText);
      }
      notifications.show({
        title: i18n.t("cardDetails.playInSillyTavern"),
        message: i18n.t("cardDetails.playSent"),
        color: "green",
      });
    } catch (e) {
      notifications.show({
        title: i18n.t("cardDetails.playInSillyTavern"),
        message: i18n.t("cardDetails.playFailed"),
        color: "red",
      });
    } finally {
      setIsSendingPlay(false);
    }
  }

  const duplicates = details?.duplicates ?? [];
  const hasDuplicates = duplicates.length > 0;

  function openSaveModalOrNotifyNoChanges(): void {
    if (!details?.id) return;

    const next = buildCcv3ToSave();
    if (!next) return;

    const prev = details.data_json ?? null;
    if (canonicalJsonString(prev) === canonicalJsonString(next)) {
      notifications.show({
        title: i18n.t("cardDetails.save"),
        message: i18n.t("cardDetails.saveNoChanges"),
        color: "blue",
        autoClose: 2500,
      });
      return;
    }

    setPendingCardJson(next);
    setSaveOpened(true);
  }

  async function doSave(mode: Parameters<typeof saveCard>[0]["mode"]) {
    if (!details?.id) return;
    if (!pendingCardJson) return;
    if (isSaving) return;

    setIsSaving(true);
    try {
      const resp = await saveCard({
        cardId: details.id,
        mode,
        card_json: pendingCardJson,
      });

      if (!resp.changed) {
        notifications.show({
          title: i18n.t("cardDetails.save"),
          message: i18n.t("cardDetails.saveNoChanges"),
          color: "blue",
          autoClose: 2500,
        });
        setSaveOpened(false);
        return;
      }

      notifications.show({
        title: i18n.t("cardDetails.save"),
        message: i18n.t("cardDetails.saveOk"),
        color: "green",
      });
      markSaved();
      setSaveOpened(false);
      setPendingCardJson(null);
      openCard(resp.card_id);
    } catch (e) {
      notifications.show({
        title: i18n.t("cardDetails.save"),
        message: i18n.t("cardDetails.saveFailed"),
        color: "red",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function openMainInExplorer(): Promise<void> {
    const p = (details?.file_path ?? "").trim();
    if (!p) return;
    if (isOpeningInExplorer) return;
    setIsOpeningInExplorer(true);
    try {
      await showFile(p);
      notifications.show({
        title: i18n.t("cardDetails.openInExplorer"),
        message: i18n.t("cardDetails.openInExplorerHint"),
        color: "blue",
        autoClose: 3500,
      });
    } catch (e) {
      const msg =
        e instanceof Error && e.message.trim()
          ? e.message
          : i18n.t("cardDetails.openInExplorerFailed");
      notifications.show({
        title: i18n.t("cardDetails.openInExplorer"),
        message: msg,
        color: "red",
      });
    } finally {
      setIsOpeningInExplorer(false);
    }
  }

  async function openDuplicateInExplorer(p: string): Promise<void> {
    const fp = (p ?? "").trim();
    if (!fp) return;
    if (openingDuplicatePath) return;
    setOpeningDuplicatePath(fp);
    try {
      await showFile(fp);
      notifications.show({
        title: i18n.t("cardDetails.showInExplorer"),
        message: i18n.t("cardDetails.openInExplorerHint"),
        color: "blue",
        autoClose: 3500,
      });
    } catch (e) {
      const msg =
        e instanceof Error && e.message.trim()
          ? e.message
          : i18n.t("cardDetails.openInExplorerFailed");
      notifications.show({
        title: i18n.t("cardDetails.showInExplorer"),
        message: msg,
        color: "red",
      });
    } finally {
      setOpeningDuplicatePath(null);
    }
  }

  async function deleteDuplicateConfirmed(): Promise<void> {
    if (!details?.id) return;
    if (!selectedDuplicatePath) return;
    if (isDeletingDuplicate) return;

    setIsDeletingDuplicate(true);
    try {
      await deleteCardFileDuplicate(details.id, selectedDuplicatePath);
      notifications.show({
        title: i18n.t("cardDetails.duplicatesTitle"),
        message: i18n.t("cardDetails.duplicateDeleted"),
        color: "green",
      });
      setConfirmDeleteDuplicateOpened(false);
      setSelectedDuplicatePath(null);
      openCard(details.id);
    } catch (e) {
      notifications.show({
        title: i18n.t("cardDetails.duplicatesTitle"),
        message: i18n.t("cardDetails.duplicateDeleteFailed"),
        color: "red",
      });
    } finally {
      setIsDeletingDuplicate(false);
    }
  }

  async function deleteCardConfirmed(): Promise<void> {
    if (!details?.id) return;
    if (isDeletingCard) return;
    setIsDeletingCard(true);
    try {
      await deleteCard(details.id);
      notifications.show({
        title: i18n.t("cardDetails.delete"),
        message: i18n.t("cardDetails.cardDeleted"),
        color: "green",
      });
      setConfirmDeleteCardOpened(false);
      closeCard();
    } catch (e) {
      notifications.show({
        title: i18n.t("cardDetails.delete"),
        message: i18n.t("cardDetails.cardDeleteFailed"),
        color: "red",
      });
    } finally {
      setIsDeletingCard(false);
    }
  }

  async function renameMainFileConfirmed(): Promise<void> {
    if (!details?.id) return;
    if (!details?.file_path) return;
    if (isRenaming) return;

    const next = renameValue.trim();
    if (next.length === 0) return;

    setIsRenaming(true);
    try {
      await renameCardMainFile(details.id, next);
      notifications.show({
        title: i18n.t("cardDetails.rename"),
        message: i18n.t("cardDetails.renameOk"),
        color: "green",
      });
      setRenameOpened(false);
      openCard(details.id);
    } catch (e) {
      notifications.show({
        title: i18n.t("cardDetails.rename"),
        message: i18n.t("cardDetails.renameFailed"),
        color: "red",
      });
    } finally {
      setIsRenaming(false);
    }
  }

  async function makeDuplicateMain(filePath: string): Promise<void> {
    if (!details?.id) return;
    if (isSettingMainFile) return;
    setIsSettingMainFile(true);
    try {
      await setCardMainFile(details.id, filePath);
      notifications.show({
        title: i18n.t("cardDetails.mainFile"),
        message: i18n.t("cardDetails.mainFileUpdated"),
        color: "green",
      });
      openCard(details.id);
    } catch {
      notifications.show({
        title: i18n.t("cardDetails.mainFile"),
        message: i18n.t("cardDetails.mainFileUpdateFailed"),
        color: "red",
      });
    } finally {
      setIsSettingMainFile(false);
    }
  }

  return (
    <>
      <Paper
        p="md"
        style={{
          position: "sticky",
          top: 60,
          marginTop: 52,
        }}
      >
        <Stack gap="sm">
          <Text fw={650}>{i18n.t("cardDetails.actions")}</Text>

          <Button
            fullWidth
            variant="filled"
            color="green"
            onClick={() => void playInSillyTavern()}
            loading={isSendingPlay}
            disabled={!details?.id}
          >
            {i18n.t("cardDetails.playInSillyTavern")}
          </Button>
          <Button
            fullWidth
            variant="filled"
            color="blue"
            onClick={openSaveModalOrNotifyNoChanges}
            disabled={!details?.id}
          >
            {i18n.t("cardDetails.save")}
          </Button>

          <Button
            fullWidth
            variant="light"
            color="blue"
            onClick={() => {
              if (!exportPngUrl) return;
              // Скачивание через navigation: имя берём из Content-Disposition сервера
              window.location.href = exportPngUrl;
            }}
            disabled={!exportPngUrl}
          >
            {i18n.t("cardDetails.download")}
          </Button>

          <Button
            fullWidth
            variant="subtle"
            color="gray"
            onClick={() => void openMainInExplorer()}
            disabled={!details?.file_path}
            loading={isOpeningInExplorer}
          >
            {i18n.t("cardDetails.openInExplorer")}
          </Button>
          <Button
            fullWidth
            variant="subtle"
            color="orange"
            disabled={!details?.file_path}
            onClick={() => {
              const base = stripPngExt(getFilenameFromPath(details?.file_path));
              setRenameValue(base === i18n.t("empty.dash") ? "" : base);
              setRenameOpened(true);
            }}
          >
            {i18n.t("cardDetails.rename")}
          </Button>
          <Button
            fullWidth
            variant="light"
            color="red"
            disabled={!details?.id}
            onClick={() => setConfirmDeleteCardOpened(true)}
          >
            {i18n.t("cardDetails.delete")}
          </Button>

          <Divider my="sm" />

          <Text fw={650}>{i18n.t("cardDetails.metadata")}</Text>

          <Stack gap={6}>
            <Group justify="space-between" wrap="nowrap" align="flex-start">
              <Text size="sm" c="dimmed">
                {i18n.t("cardDetails.mainFile")}
              </Text>
              <CopyableTruncatedText
                value={getFilenameFromPath(details?.file_path)}
                copyValue={details?.file_path ?? ""}
                tooltip={details?.file_path ?? i18n.t("empty.dash")}
                keepStart={16}
                keepEnd={14}
                maxWidth={250}
                onCopiedMessage={i18n.t("cardDetails.copiedPath")}
                onCopyFailedMessage={i18n.t("cardDetails.copyFailed")}
              />
            </Group>

            <Group justify="space-between" wrap="nowrap">
              <Text size="sm" c="dimmed">
                ID
              </Text>
              <CopyableTruncatedText
                value={details?.id ?? i18n.t("empty.dash")}
                copyValue={details?.id ?? ""}
                tooltip={details?.id ?? i18n.t("empty.dash")}
                keepStart={10}
                keepEnd={10}
                maxWidth={250}
                onCopiedMessage={i18n.t("cardDetails.copiedId")}
                onCopyFailedMessage={i18n.t("cardDetails.copyFailed")}
              />
            </Group>

            <Group justify="space-between" wrap="nowrap">
              <Text size="sm" c="dimmed">
                Spec
              </Text>
              <Text size="sm">{details?.spec_version ?? "—"}</Text>
            </Group>

            <Group justify="space-between" wrap="nowrap">
              <Text size="sm" c="dimmed">
                {i18n.t("cardDetails.createdAt")}
              </Text>
              <Text size="sm">
                {typeof details?.created_at === "number"
                  ? new Date(details.created_at).toLocaleString(
                      i18n.language === "ru" ? "ru-RU" : "en-US"
                    )
                  : i18n.t("empty.dash")}
              </Text>
            </Group>

            <Group justify="space-between" wrap="nowrap">
              <Text size="sm" c="dimmed">
                {i18n.t("cardDetails.tokensApprox")}
              </Text>
              <Text size="sm">
                {details
                  ? String(details.prompt_tokens_est ?? 0)
                  : i18n.t("empty.dash")}
              </Text>
            </Group>
          </Stack>

          {hasDuplicates && (
            <>
              <Divider my="sm" />

              <Text fw={650}>{i18n.t("cardDetails.duplicatesTitle")}</Text>
              <Stack gap={8}>
                {duplicates.map((p) => (
                  <Paper key={p} p="xs">
                    <Group
                      justify="space-between"
                      align="flex-start"
                      wrap="nowrap"
                    >
                      <CopyableTruncatedText
                        value={p}
                        copyValue={p}
                        tooltip={p}
                        keepStart={18}
                        keepEnd={18}
                        maxWidth="100%"
                        onCopiedMessage={i18n.t("cardDetails.copiedPath")}
                        onCopyFailedMessage={i18n.t("cardDetails.copyFailed")}
                      />
                      <Group gap={6} wrap="nowrap">
                        <Tooltip
                          label={i18n.t("cardDetails.makeMainFile")}
                          withArrow
                        >
                          <ActionIcon
                            variant="light"
                            color="indigo"
                            onClick={() => void makeDuplicateMain(p)}
                            loading={isSettingMainFile}
                            aria-label={i18n.t("cardDetails.makeMainFile")}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M12 2l2.4 6.9H22l-5.8 4.2L18.6 20 12 15.8 5.4 20l2.4-6.9L2 8.9h7.6z" />
                            </svg>
                          </ActionIcon>
                        </Tooltip>

                        <Tooltip
                          label={i18n.t("cardDetails.showInExplorer")}
                          withArrow
                        >
                          <ActionIcon
                            variant="light"
                            onClick={() => void openDuplicateInExplorer(p)}
                            loading={openingDuplicatePath === p}
                            aria-label={i18n.t("cardDetails.showInExplorer")}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 7h5l2 3h11v9a2 2 0 0 1-2 2H3z" />
                              <path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v2" />
                            </svg>
                          </ActionIcon>
                        </Tooltip>

                        <Tooltip
                          label={i18n.t("cardDetails.deleteDuplicate")}
                          withArrow
                        >
                          <ActionIcon
                            variant="light"
                            color="red"
                            onClick={() => {
                              setSelectedDuplicatePath(p);
                              setConfirmDeleteDuplicateOpened(true);
                            }}
                            aria-label={i18n.t("cardDetails.deleteDuplicate")}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6" />
                              <path d="M14 11v6" />
                            </svg>
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </>
          )}
        </Stack>
      </Paper>

      <Modal
        opened={confirmDeleteDuplicateOpened}
        onClose={() => setConfirmDeleteDuplicateOpened(false)}
        title={i18n.t("cardDetails.confirmDeleteDuplicateTitle")}
      >
        <Stack gap="md">
          <Text size="sm">
            {i18n.t("cardDetails.confirmDeleteDuplicateMessage")}
          </Text>
          {selectedDuplicatePath && <Code block>{selectedDuplicatePath}</Code>}
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setConfirmDeleteDuplicateOpened(false)}
              disabled={isDeletingDuplicate}
            >
              {i18n.t("actions.cancel")}
            </Button>
            <Button
              color="red"
              onClick={() => void deleteDuplicateConfirmed()}
              loading={isDeletingDuplicate}
            >
              {i18n.t("cardDetails.deleteDuplicate")}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={confirmDeleteCardOpened}
        onClose={() => setConfirmDeleteCardOpened(false)}
        title={i18n.t("cardDetails.confirmDeleteCardTitle")}
      >
        <Stack gap="md">
          <Text size="sm">
            {i18n.t("cardDetails.confirmDeleteCardMessage")}
          </Text>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setConfirmDeleteCardOpened(false)}
              disabled={isDeletingCard}
            >
              {i18n.t("actions.cancel")}
            </Button>
            <Button
              color="red"
              onClick={() => void deleteCardConfirmed()}
              loading={isDeletingCard}
            >
              {i18n.t("cardDetails.delete")}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={renameOpened}
        onClose={() => setRenameOpened(false)}
        title={i18n.t("cardDetails.renameMainFileTitle")}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {i18n.t("cardDetails.renameMainFileHint")}
          </Text>
          <TextInput
            label={i18n.t("cardDetails.renameMainFileInputLabel")}
            value={renameValue}
            onChange={(e) => setRenameValue(e.currentTarget.value)}
            placeholder={i18n.t("cardDetails.renameMainFilePlaceholder")}
            rightSection={<Text c="dimmed">.png</Text>}
          />
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setRenameOpened(false)}
              disabled={isRenaming}
            >
              {i18n.t("actions.cancel")}
            </Button>
            <Button
              onClick={() => void renameMainFileConfirmed()}
              loading={isRenaming}
              disabled={renameValue.trim().length === 0}
            >
              {i18n.t("actions.save")}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={saveOpened}
        onClose={() => setSaveOpened(false)}
        title={i18n.t("cardDetails.saveModalTitle")}
      >
        <Stack gap="md">
          {!hasDuplicates ? (
            <>
              <Button
                onClick={() => void doSave("overwrite_main")}
                loading={isSaving}
              >
                {i18n.t("cardDetails.saveOverwrite")}
              </Button>
              <Button
                variant="light"
                onClick={() => void doSave("save_new")}
                loading={isSaving}
              >
                {i18n.t("cardDetails.saveAsNew")}
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => void doSave("save_new")}
                loading={isSaving}
              >
                {i18n.t("cardDetails.saveAsNew")}
              </Button>
              <Button
                color="orange"
                variant="light"
                onClick={() => void doSave("save_new_delete_old_main")}
                loading={isSaving}
              >
                {i18n.t("cardDetails.saveAsNewDeleteOld")}
              </Button>
              <Button
                color="red"
                variant="light"
                onClick={() => void doSave("overwrite_all_files")}
                loading={isSaving}
              >
                {i18n.t("cardDetails.saveOverwriteWithDuplicates")}
              </Button>
            </>
          )}
          <Button
            variant="default"
            onClick={() => setSaveOpened(false)}
            disabled={isSaving}
          >
            {i18n.t("actions.cancel")}
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
