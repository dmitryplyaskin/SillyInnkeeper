import { ActionIcon, Loader, Menu } from "@mantine/core";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import {
  IconDotsVertical,
  IconDownload,
  IconEye,
  IconEyeOff,
  IconFolder,
  IconPencil,
  IconPlayerPlay,
  IconTrash,
} from "@tabler/icons-react";
import {
  $isOpeningInExplorer,
  $isPlayingInSillyTavern,
  $isTogglingHidden,
  openDeleteCardModal,
  openInExplorerRequested,
  openRenameMainFileModal,
  playInSillyTavernRequested,
  toggleHiddenRequested,
} from "../model.actions";

export type CardActionsMenuProps = {
  cardId: string;
  filePath: string | null;
  isHidden: boolean;
  isSillyTavern: boolean;
};

export function CardActionsMenu({
  cardId,
  filePath,
  isHidden,
  isSillyTavern,
}: CardActionsMenuProps) {
  const { t } = useTranslation();

  const [isPlaying, isTogglingHidden, isOpeningInExplorer] = useUnit([
    $isPlayingInSillyTavern,
    $isTogglingHidden,
    $isOpeningInExplorer,
  ]);

  const [
    onPlay,
    onToggleHidden,
    onOpenInExplorer,
    onOpenRename,
    onOpenDelete,
  ] = useUnit([
    playInSillyTavernRequested,
    toggleHiddenRequested,
    openInExplorerRequested,
    openRenameMainFileModal,
    openDeleteCardModal,
  ]);

  const exportPngUrl = `/api/cards/${encodeURIComponent(cardId)}/export.png?download=1`;
  const canUseFile = Boolean(filePath?.trim());

  return (
    <Menu withinPortal position="bottom-end" shadow="md">
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          size="lg"
          radius="md"
          aria-label={t("cardDetails.actions")}
          title={t("cardDetails.actions")}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <IconDotsVertical size={18} />
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Item
          leftSection={
            isPlaying ? <Loader size={16} /> : <IconPlayerPlay size={16} />
          }
          disabled={isPlaying}
          onClick={(e) => {
            e.stopPropagation();
            onPlay({ cardId });
          }}
        >
          {t("cardDetails.playInSillyTavern")}
        </Menu.Item>

        <Menu.Item
          leftSection={
            isTogglingHidden ? (
              <Loader size={16} />
            ) : isHidden ? (
              <IconEye size={16} />
            ) : (
              <IconEyeOff size={16} />
            )
          }
          disabled={isTogglingHidden}
          onClick={(e) => {
            e.stopPropagation();
            onToggleHidden({ cardId, isHidden });
          }}
        >
          {isHidden ? t("cardDetails.show") : t("cardDetails.hide")}
        </Menu.Item>

        <Menu.Item
          leftSection={<IconDownload size={16} />}
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = exportPngUrl;
          }}
        >
          {t("cardDetails.download")}
        </Menu.Item>

        <Menu.Divider />

        <Menu.Item
          leftSection={
            isOpeningInExplorer ? <Loader size={16} /> : <IconFolder size={16} />
          }
          disabled={!canUseFile || isOpeningInExplorer}
          onClick={(e) => {
            e.stopPropagation();
            if (!filePath) return;
            onOpenInExplorer({ filePath });
          }}
        >
          {t("cardDetails.openInExplorer")}
        </Menu.Item>

        <Menu.Item
          leftSection={<IconPencil size={16} />}
          disabled={!canUseFile}
          onClick={(e) => {
            e.stopPropagation();
            if (!filePath) return;
            onOpenRename({ cardId, filePath });
          }}
        >
          {t("cardDetails.rename")}
        </Menu.Item>

        <Menu.Item
          color="red"
          leftSection={<IconTrash size={16} />}
          onClick={(e) => {
            e.stopPropagation();
            onOpenDelete({ cardId, isSillyTavern });
          }}
        >
          {t("cardDetails.delete")}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}


