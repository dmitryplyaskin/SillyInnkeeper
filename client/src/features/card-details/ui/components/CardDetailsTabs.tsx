import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Button,
  Code,
  CopyButton,
  Grid,
  Group,
  Paper,
  ScrollArea,
  Skeleton,
  Stack,
  Tabs,
  Text,
  Image,
} from "@mantine/core";
import { useUnit } from "effector-react";
import type { CardDetails } from "@/shared/types/cards";
import i18n from "@/shared/i18n/i18n";
import {
  $altGreetingIds,
  $altGreetingValues,
  $groupGreetingIds,
  $groupGreetingValues,
  $isDirty,
  greetingAdded,
  greetingDeleted,
  greetingDuplicated,
  greetingMoved,
  greetingValueChanged,
} from "../../model.form";
import { DraftCreatorField } from "./fields/DraftCreatorField";
import { DraftMdField } from "./fields/DraftMdField";
import { DraftNameField } from "./fields/DraftNameField";
import { DraftTagsField } from "./fields/DraftTagsField";
import { EditableGreetingsList } from "./EditableGreetingsList";
import { LorebookEditor } from "./LorebookEditor";

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

export function CardDetailsTabs({
  openedId,
  details,
  isLoading,
  error,
  isCensored,
  imageSrc,
  onOpenImage,
}: {
  openedId: string | null;
  details: CardDetails | null;
  isLoading: boolean;
  error: string | null;
  isCensored: boolean;
  imageSrc: string | undefined;
  onOpenImage: () => void;
}) {
  const { t } = useTranslation();

  const resetKey = openedId ?? "closed";
  const disabled = !details;
  const canEdit = Boolean(details);

  const [
    altIds,
    groupIds,
    addGreeting,
    duplicateGreeting,
    deleteGreeting,
    moveGreeting,
    setGreeting,
    isDirty,
  ] = useUnit([
    $altGreetingIds,
    $groupGreetingIds,
    greetingAdded,
    greetingDuplicated,
    greetingDeleted,
    greetingMoved,
    greetingValueChanged,
    $isDirty,
  ]);

  return (
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

      {details && isDirty && (
        <Alert color="yellow" variant="light">
          {t("cardDetails.unsavedChangesHint")}
        </Alert>
      )}

      <Tabs defaultValue="main" keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="main">{t("cardDetails.tabsMain")}</Tabs.Tab>
          <Tabs.Tab value="alt">{t("cardDetails.tabsAlt")}</Tabs.Tab>
          <Tabs.Tab value="system">{t("cardDetails.tabsSystem")}</Tabs.Tab>
          <Tabs.Tab value="lorebook">{t("cardDetails.tabsLorebook", "Lorebook")}</Tabs.Tab>
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
                      onClick={onOpenImage}
                      disabled={!openedId}
                    >
                      {t("cardDetails.zoomButton")}
                    </Button>
                  </Group>
                  <Image
                    src={imageSrc}
                    alt={details?.name || t("cardDetails.imageAltFallback")}
                    fit="contain"
                    fallbackSrc="/favicon.svg"
                    style={{
                      maxHeight: 380,
                      filter: isCensored ? "blur(12px)" : "none",
                      cursor: openedId ? "zoom-in" : "default",
                    }}
                    onClick={() => {
                      if (!openedId) return;
                      onOpenImage();
                    }}
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 8 }}>
                  <Stack gap="sm">
                    <DraftNameField disabled={disabled} />
                    <DraftTagsField disabled={disabled} resetKey={resetKey} />
                    <DraftCreatorField disabled={disabled} />
                    <DraftMdField
                      field="creator_notes"
                      label={t("creatorNotes.title")}
                      resetKey={resetKey}
                      disabled={disabled}
                    />
                  </Stack>
                </Grid.Col>
              </Grid>
            </Paper>

            <DraftMdField
              field="description"
              label={t("cardDetails.description")}
              resetKey={resetKey}
              disabled={disabled}
            />
            <DraftMdField
              field="personality"
              label={t("cardDetails.personality")}
              resetKey={resetKey}
              disabled={disabled}
            />
            <DraftMdField
              field="scenario"
              label={t("cardDetails.scenario")}
              resetKey={resetKey}
              disabled={disabled}
            />
            <DraftMdField
              field="first_mes"
              label={t("cardDetails.firstMessage")}
              resetKey={resetKey}
              disabled={disabled}
            />
            <DraftMdField
              field="mes_example"
              label={t("cardDetails.messageExample")}
              resetKey={resetKey}
              disabled={disabled}
            />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="alt" pt="md">
          <Stack gap="md">
            <EditableGreetingsList
              title={t("cardDetails.altGreetingsTitle")}
              ids={altIds}
              valuesStore={$altGreetingValues}
              onChangeValue={(id, next) => {
                if (!canEdit) return;
                setGreeting({ list: "alt", id, value: next });
              }}
              onAdd={() => {
                if (!canEdit) return;
                addGreeting({ list: "alt" });
              }}
              onDuplicate={(id) => {
                if (!canEdit) return;
                duplicateGreeting({ list: "alt", id });
              }}
              onDelete={(id) => {
                if (!canEdit) return;
                deleteGreeting({ list: "alt", id });
              }}
              onMoveUp={(id) => {
                if (!canEdit) return;
                moveGreeting({ list: "alt", id, direction: "up" });
              }}
              onMoveDown={(id) => {
                if (!canEdit) return;
                moveGreeting({ list: "alt", id, direction: "down" });
              }}
              resetKey={resetKey}
            />
            <EditableGreetingsList
              title={t("cardDetails.groupOnlyGreetingsTitle")}
              ids={groupIds}
              valuesStore={$groupGreetingValues}
              onChangeValue={(id, next) => {
                if (!canEdit) return;
                setGreeting({ list: "group", id, value: next });
              }}
              onAdd={() => {
                if (!canEdit) return;
                addGreeting({ list: "group" });
              }}
              onDuplicate={(id) => {
                if (!canEdit) return;
                duplicateGreeting({ list: "group", id });
              }}
              onDelete={(id) => {
                if (!canEdit) return;
                deleteGreeting({ list: "group", id });
              }}
              onMoveUp={(id) => {
                if (!canEdit) return;
                moveGreeting({ list: "group", id, direction: "up" });
              }}
              onMoveDown={(id) => {
                if (!canEdit) return;
                moveGreeting({ list: "group", id, direction: "down" });
              }}
              resetKey={resetKey}
            />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="system" pt="md">
          <Stack gap="md">
            <DraftMdField
              field="system_prompt"
              label={t("cardDetails.systemPrompt")}
              resetKey={resetKey}
              disabled={disabled}
            />
            <DraftMdField
              field="post_history_instructions"
              label={t("cardDetails.postHistoryInstructions")}
              resetKey={resetKey}
              disabled={disabled}
            />
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="lorebook" pt="md">
          <LorebookEditor openedId={openedId} disabled={disabled} />
        </Tabs.Panel>

        <Tabs.Panel value="raw" pt="md">
          <JsonBlock value={details?.data_json ?? null} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
