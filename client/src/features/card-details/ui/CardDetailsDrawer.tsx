import { useMemo, useState } from "react";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import {
  Accordion,
  ActionIcon,
  Badge,
  Button,
  Code,
  CopyButton,
  Divider,
  Drawer,
  Grid,
  Group,
  Paper,
  ScrollArea,
  Skeleton,
  Spoiler,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
  Tooltip,
  Image,
  Modal,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import type { CardDetails } from "@/shared/types/cards";
import {
  $details,
  $error,
  $isLoading,
  $openedId,
  closeCard,
  openCard,
} from "../model";
import { $isCensored } from "@/features/view-settings";
import { CreatorNotesRenderer } from "./CreatorNotesRenderer";
import i18n from "@/shared/i18n/i18n";
import { deleteCard, deleteCardFileDuplicate } from "@/shared/api/cards";
import { CopyableTruncatedText } from "@/shared/ui/CopyableTruncatedText";
import { renameCardMainFile, setCardMainFile } from "@/shared/api/cards";
import { showFile } from "@/shared/api/explorer";

function formatDate(ms: number | null | undefined, locale: string): string {
  const t = typeof ms === "number" ? ms : Number(ms);
  if (!Number.isFinite(t) || t <= 0) return i18n.t("empty.dash");
  return new Date(t).toLocaleString(locale);
}

function getFilenameFromPath(filePath: string | null | undefined): string {
  const p = (filePath ?? "").trim();
  if (!p) return i18n.t("empty.dash");
  const parts = p.split(/[/\\]+/);
  return parts[parts.length - 1] || i18n.t("empty.dash");
}

function stripPngExt(name: string): string {
  return name.replace(/\.png$/i, "");
}

function CollapsibleFieldBlock({
  label,
  value,
  maxHeight = 160,
  dimmedEmptyText = i18n.t("empty.dash"),
}: {
  label: string;
  value: string | null | undefined;
  maxHeight?: number;
  dimmedEmptyText?: string;
}) {
  const has = Boolean(value && value.trim().length > 0);
  return (
    <Paper p="md" style={{ minHeight: 110 }}>
      <Text size="sm" fw={600} mb={6}>
        {label}
      </Text>
      {has ? (
        <Spoiler
          maxHeight={maxHeight}
          showLabel={i18n.t("actions.show")}
          hideLabel={i18n.t("actions.hide")}
        >
          <Text style={{ whiteSpace: "pre-wrap" }}>{value}</Text>
        </Spoiler>
      ) : (
        <Text c="dimmed">{dimmedEmptyText}</Text>
      )}
    </Paper>
  );
}

function JsonBlock({ value }: { value: unknown | null }) {
  const pretty = useMemo(() => {
    if (value == null) return "";
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);

  return (
    <Paper p="md">
      <Group justify="space-between" align="center" mb={8}>
        <Text size="sm" fw={600}>
          {i18n.t("cardDetails.rawJson")}
        </Text>
        <CopyButton value={pretty}>
          {({ copied, copy }) => (
            <Button variant="light" size="xs" onClick={copy}>
              {copied ? i18n.t("actions.copied") : i18n.t("actions.copy")}
            </Button>
          )}
        </CopyButton>
      </Group>
      <ScrollArea h={520} type="auto">
        <Code block>{pretty || i18n.t("empty.dash")}</Code>
      </ScrollArea>
    </Paper>
  );
}

function GreetingsAccordion({
  title,
  greetings,
}: {
  title: string;
  greetings: string[];
}) {
  if (!greetings || greetings.length === 0) {
    return (
      <Paper p="md">
        <Text size="sm" fw={600} mb={6}>
          {title}
        </Text>
        <Text c="dimmed">{i18n.t("empty.dash")}</Text>
      </Paper>
    );
  }

  return (
    <Paper p="md">
      <Group justify="space-between" align="center" mb={8}>
        <Text size="sm" fw={600}>
          {title}
        </Text>
        <Badge variant="light" color="gray">
          {greetings.length}
        </Badge>
      </Group>

      <Accordion variant="contained" radius="md">
        {greetings.map((g, idx) => {
          const preview =
            (g || "").split("\n")[0]?.trim() || i18n.t("empty.dash");
          return (
            <Accordion.Item key={idx} value={String(idx)}>
              <Accordion.Control>
                <Group justify="space-between" wrap="nowrap">
                  <Text lineClamp={1}>
                    {idx + 1}. {preview}
                  </Text>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Group justify="flex-end" mb={8}>
                  <CopyButton value={g || ""}>
                    {({ copied, copy }) => (
                      <Button variant="light" size="xs" onClick={copy}>
                        {copied
                          ? i18n.t("actions.copied")
                          : i18n.t("actions.copy")}
                      </Button>
                    )}
                  </CopyButton>
                </Group>
                <Spoiler
                  maxHeight={220}
                  showLabel={i18n.t("actions.show")}
                  hideLabel={i18n.t("actions.hide")}
                >
                  <Text style={{ whiteSpace: "pre-wrap" }}>
                    {g || i18n.t("empty.dash")}
                  </Text>
                </Spoiler>
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </Paper>
  );
}

function ActionsPanel({
  details,
  locale,
}: {
  details: CardDetails | null;
  locale: string;
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
            variant="light"
            color="indigo"
            onClick={() => {
              if (!exportPngUrl) return;
              // Скачивание через navigation: имя берём из Content-Disposition сервера
              window.location.href = exportPngUrl;
            }}
            disabled={!exportPngUrl}
          >
            {i18n.t("cardDetails.download")}
          </Button>

          <Tooltip label={i18n.t("cardDetails.soon")} withArrow>
            <Button fullWidth variant="light" disabled>
              {i18n.t("cardDetails.save")}
            </Button>
          </Tooltip>

          <Button
            fullWidth
            variant="light"
            onClick={() => void openMainInExplorer()}
            disabled={!details?.file_path}
            loading={isOpeningInExplorer}
          >
            {i18n.t("cardDetails.openInExplorer")}
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
          <Button
            fullWidth
            variant="light"
            disabled={!details?.file_path}
            onClick={() => {
              const base = stripPngExt(getFilenameFromPath(details?.file_path));
              setRenameValue(base === i18n.t("empty.dash") ? "" : base);
              setRenameOpened(true);
            }}
          >
            {i18n.t("cardDetails.rename")}
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
              <Text size="sm">{formatDate(details?.created_at, locale)}</Text>
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
    </>
  );
}

export function CardDetailsDrawer() {
  const { t, i18n: i18nRt } = useTranslation();
  const [openedId, details, isLoading, error, isCensored] = useUnit([
    $openedId,
    $details,
    $isLoading,
    $error,
    $isCensored,
  ]);

  const locale = i18nRt.language === "ru" ? "ru-RU" : "en-US";

  const opened = Boolean(openedId);
  const [imgOpened, setImgOpened] = useState(false);

  const tags = details?.tags ?? [];
  const imageSrc = openedId ? `/api/image/${openedId}` : undefined;

  return (
    <>
      <Drawer
        opened={opened}
        onClose={() => closeCard()}
        position="right"
        size="100%"
        title={
          <Title order={4} lineClamp={1}>
            {details?.name || t("cardDetails.detailsTitleFallback")}
          </Title>
        }
      >
        <Grid gutter="md" columns={24}>
          {/* Left pane */}
          <Grid.Col span={{ base: 24, md: 18, lg: 19 }}>
            <Stack gap="md">
              {isLoading && (
                <Paper p="md">
                  <Group gap="md" wrap="nowrap">
                    <Skeleton h={220} w={160} radius="md" />
                    <Stack gap="xs" style={{ flex: 1 }}>
                      <Skeleton h={18} w="40%" />
                      <Skeleton h={14} w="75%" />
                      <Skeleton h={14} w="65%" />
                    </Stack>
                  </Group>
                </Paper>
              )}

              {error && (
                <Paper p="md">
                  <Text c="red" fw={600}>
                    {t("cardDetails.loadingTitle")}
                  </Text>
                  <Text c="dimmed">{error}</Text>
                </Paper>
              )}

              <Tabs defaultValue="main" keepMounted={false}>
                <Tabs.List>
                  <Tabs.Tab value="main">{t("cardDetails.tabsMain")}</Tabs.Tab>
                  <Tabs.Tab value="alt">{t("cardDetails.tabsAlt")}</Tabs.Tab>
                  <Tabs.Tab value="system">
                    {t("cardDetails.tabsSystem")}
                  </Tabs.Tab>
                  <Tabs.Tab value="raw">{t("cardDetails.tabsRaw")}</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="main" pt="md">
                  <Stack gap="md">
                    {/* Header block: image left (~35%), meta right */}
                    <Paper p="md">
                      <Grid gutter="md" align="stretch">
                        <Grid.Col span={{ base: 12, md: 4 }}>
                          <Group justify="space-between" align="center" mb={8}>
                            <Text fw={600}>{t("cardDetails.image")}</Text>
                            <Button
                              variant="light"
                              size="xs"
                              onClick={() => setImgOpened(true)}
                              disabled={!openedId}
                            >
                              {t("cardDetails.zoomButton")}
                            </Button>
                          </Group>
                          <Image
                            src={imageSrc}
                            alt={
                              details?.name || t("cardDetails.imageAltFallback")
                            }
                            fit="contain"
                            fallbackSrc="/favicon.svg"
                            style={{
                              maxHeight: 380,
                              filter: isCensored ? "blur(12px)" : "none",
                              cursor: openedId ? "zoom-in" : "default",
                            }}
                            onClick={() => {
                              if (!openedId) return;
                              setImgOpened(true);
                            }}
                          />
                        </Grid.Col>

                        <Grid.Col span={{ base: 12, md: 8 }}>
                          <Stack gap="sm">
                            <div>
                              <Text size="sm" fw={600} mb={4}>
                                {t("cardDetails.fieldName")}
                              </Text>
                              <Title order={3} lh={1.15}>
                                {details?.name || t("empty.dash")}
                              </Title>
                            </div>

                            <div>
                              <Text size="sm" fw={600} mb={6}>
                                {t("cardDetails.fieldTags")}
                              </Text>
                              {tags.length > 0 ? (
                                <Group gap={6} wrap="wrap">
                                  {tags.map((t) => (
                                    <Badge
                                      key={t}
                                      variant="light"
                                      color="indigo"
                                    >
                                      {t}
                                    </Badge>
                                  ))}
                                </Group>
                              ) : (
                                <Text c="dimmed">{t("empty.dash")}</Text>
                              )}
                            </div>

                            <div>
                              <Text size="sm" fw={600} mb={6}>
                                {t("cardDetails.fieldCreator")}
                              </Text>
                              <Text>{details?.creator || t("empty.dash")}</Text>
                            </div>

                            <div>
                              <CreatorNotesRenderer
                                value={details?.creator_notes}
                                defaultMaxHeight={140}
                              />
                            </div>
                          </Stack>
                        </Grid.Col>
                      </Grid>
                    </Paper>

                    <CollapsibleFieldBlock
                      label={t("cardDetails.description")}
                      value={details?.description}
                      maxHeight={180}
                    />
                    <CollapsibleFieldBlock
                      label={t("cardDetails.personality")}
                      value={details?.personality}
                      maxHeight={160}
                    />
                    <CollapsibleFieldBlock
                      label={t("cardDetails.scenario")}
                      value={details?.scenario}
                      maxHeight={160}
                    />
                    <CollapsibleFieldBlock
                      label={t("cardDetails.firstMessage")}
                      value={details?.first_mes}
                      maxHeight={220}
                    />
                    <CollapsibleFieldBlock
                      label={t("cardDetails.messageExample")}
                      value={details?.mes_example}
                      maxHeight={220}
                    />
                  </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="alt" pt="md">
                  <Stack gap="md">
                    <GreetingsAccordion
                      title={t("cardDetails.altGreetingsTitle")}
                      greetings={details?.alternate_greetings ?? []}
                    />
                    {details?.group_only_greetings &&
                      details.group_only_greetings.length > 0 && (
                        <GreetingsAccordion
                          title={t("cardDetails.groupOnlyGreetingsTitle")}
                          greetings={details.group_only_greetings}
                        />
                      )}
                  </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="system" pt="md">
                  <Stack gap="md">
                    <CollapsibleFieldBlock
                      label={t("cardDetails.systemPrompt")}
                      value={details?.system_prompt}
                      maxHeight={220}
                    />
                    <CollapsibleFieldBlock
                      label={t("cardDetails.postHistoryInstructions")}
                      value={details?.post_history_instructions}
                      maxHeight={220}
                    />
                  </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="raw" pt="md">
                  <JsonBlock value={details?.data_json ?? null} />
                </Tabs.Panel>
              </Tabs>
            </Stack>
          </Grid.Col>

          {/* Right pane */}
          <Grid.Col span={{ base: 24, md: 6, lg: 5 }}>
            <ActionsPanel details={details} locale={locale} />
          </Grid.Col>
        </Grid>
      </Drawer>

      <Modal
        opened={imgOpened}
        onClose={() => setImgOpened(false)}
        size="xl"
        title={details?.name || t("cardDetails.imageAltFallback")}
      >
        <Image
          src={imageSrc}
          alt={details?.name || t("cardDetails.imageAltFallback")}
          fit="contain"
          fallbackSrc="/favicon.svg"
          style={{
            maxWidth: "100%",
            maxHeight: "80vh",
            filter: isCensored ? "blur(12px)" : "none",
          }}
        />
      </Modal>
    </>
  );
}
