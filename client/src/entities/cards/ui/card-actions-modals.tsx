import { Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import { useUnit } from "effector-react";
import i18n from "@/shared/i18n/i18n";
import {
  $deleteCardModal,
  $isDeletingCard,
  $isRenamingMainFile,
  $renameMainFileModal,
  closeDeleteCardModal,
  closeRenameMainFileModal,
  deleteCardConfirmed,
  renameMainFileConfirmed,
  renameMainFileValueChanged,
} from "../model.actions";

export function CardActionsModals() {
  const [renameModal, deleteModal, isRenaming, isDeleting] = useUnit([
    $renameMainFileModal,
    $deleteCardModal,
    $isRenamingMainFile,
    $isDeletingCard,
  ]);

  const [
    onCloseRename,
    onRenameValueChanged,
    onRenameConfirm,
    onCloseDelete,
    onDeleteConfirm,
  ] = useUnit([
    closeRenameMainFileModal,
    renameMainFileValueChanged,
    renameMainFileConfirmed,
    closeDeleteCardModal,
    deleteCardConfirmed,
  ]);

  return (
    <>
      <Modal
        opened={renameModal.opened}
        onClose={() => onCloseRename()}
        title={i18n.t("cardDetails.renameMainFileTitle")}
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            {i18n.t("cardDetails.renameMainFileHint")}
          </Text>
          <TextInput
            label={i18n.t("cardDetails.renameMainFileInputLabel")}
            value={renameModal.value}
            onChange={(e) => onRenameValueChanged(e.currentTarget.value)}
            placeholder={i18n.t("cardDetails.renameMainFilePlaceholder")}
            rightSection={<Text c="dimmed">.png</Text>}
          />
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => onCloseRename()}
              disabled={isRenaming}
            >
              {i18n.t("actions.cancel")}
            </Button>
            <Button
              onClick={() => onRenameConfirm()}
              loading={isRenaming}
              disabled={renameModal.value.trim().length === 0}
            >
              {i18n.t("actions.save")}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={deleteModal.opened}
        onClose={() => onCloseDelete()}
        title={i18n.t("cardDetails.confirmDeleteCardTitle")}
      >
        <Stack gap="md">
          <Text size="sm">{i18n.t("cardDetails.confirmDeleteCardMessage")}</Text>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => onCloseDelete()}
              disabled={isDeleting}
            >
              {i18n.t("actions.cancel")}
            </Button>
            <Button
              color="red"
              onClick={() => onDeleteConfirm()}
              loading={isDeleting}
            >
              {i18n.t("cardDetails.delete")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}


