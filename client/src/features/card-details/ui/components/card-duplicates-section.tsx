import { ActionIcon, Group, Paper, Stack, Text, Tooltip } from "@mantine/core";
import { IconFolder, IconStar, IconTrash } from "@tabler/icons-react";
import i18n from "@/shared/i18n/i18n";
import { CopyableTruncatedText } from "@/shared/ui/CopyableTruncatedText";

export function CardDuplicatesSection({
  duplicates,
  isSettingMainFile,
  openingDuplicatePath,
  onMakeMain,
  onOpenInExplorer,
  onRequestDelete,
}: {
  duplicates: string[];
  isSettingMainFile: boolean;
  openingDuplicatePath: string | null;
  onMakeMain: (filePath: string) => void;
  onOpenInExplorer: (filePath: string) => void;
  onRequestDelete: (filePath: string) => void;
}) {
  if (!duplicates || duplicates.length === 0) return null;

  return (
    <>
      <Text fw={650}>{i18n.t("cardDetails.duplicatesTitle")}</Text>
      <Stack gap={8}>
        {duplicates.map((p) => (
          <Paper key={p} p="xs">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
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
                <Tooltip label={i18n.t("cardDetails.makeMainFile")} withArrow>
                  <ActionIcon
                    variant="light"
                    color="indigo"
                    onClick={() => onMakeMain(p)}
                    loading={isSettingMainFile}
                    aria-label={i18n.t("cardDetails.makeMainFile")}
                  >
                    <IconStar size={18} />
                  </ActionIcon>
                </Tooltip>

                <Tooltip label={i18n.t("cardDetails.showInExplorer")} withArrow>
                  <ActionIcon
                    variant="light"
                    onClick={() => onOpenInExplorer(p)}
                    loading={openingDuplicatePath === p}
                    aria-label={i18n.t("cardDetails.showInExplorer")}
                  >
                    <IconFolder size={18} />
                  </ActionIcon>
                </Tooltip>

                <Tooltip label={i18n.t("cardDetails.deleteDuplicate")} withArrow>
                  <ActionIcon
                    variant="light"
                    color="red"
                    onClick={() => onRequestDelete(p)}
                    aria-label={i18n.t("cardDetails.deleteDuplicate")}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
          </Paper>
        ))}
      </Stack>
    </>
  );
}


