import { Button, Modal, Stack, Tooltip } from "@mantine/core";
import i18n from "@/shared/i18n/i18n";

export type SaveCardMode =
  | "overwrite_main"
  | "overwrite_all_files"
  | "save_new"
  | "save_new_delete_old_main"
  | "save_new_to_library";

export function SaveCardModal({
  opened,
  hasDuplicates,
  isSillyTavern,
  cardsFolderPath,
  isSaving,
  onClose,
  onSave,
}: {
  opened: boolean;
  hasDuplicates: boolean;
  isSillyTavern: boolean;
  cardsFolderPath: string;
  isSaving: boolean;
  onClose: () => void;
  onSave: (mode: SaveCardMode) => void;
}) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={i18n.t("cardDetails.saveModalTitle")}
      zIndex={500}
      overlayProps={{ zIndex: 499 }}
    >
      <Stack gap="md">
        {!hasDuplicates ? (
          <>
            <Button onClick={() => onSave("overwrite_main")} loading={isSaving}>
              {i18n.t("cardDetails.saveOverwrite")}
            </Button>
            <Button variant="light" onClick={() => onSave("save_new")} loading={isSaving}>
              {i18n.t("cardDetails.saveAsNew")}
            </Button>
            {isSillyTavern && (
              <Tooltip
                label={i18n.t("cardDetails.saveToFolderTip", {
                  path: cardsFolderPath.trim() || i18n.t("empty.dash"),
                })}
                withArrow
              >
                <Button
                  color="teal"
                  variant="light"
                  onClick={() => onSave("save_new_to_library")}
                  loading={isSaving}
                >
                  {i18n.t("cardDetails.saveToFolder")}
                </Button>
              </Tooltip>
            )}
          </>
        ) : (
          <>
            <Button onClick={() => onSave("save_new")} loading={isSaving}>
              {i18n.t("cardDetails.saveAsNew")}
            </Button>
            <Button
              color="orange"
              variant="light"
              onClick={() => onSave("save_new_delete_old_main")}
              loading={isSaving}
            >
              {i18n.t("cardDetails.saveAsNewDeleteOld")}
            </Button>
            <Button
              color="red"
              variant="light"
              onClick={() => onSave("overwrite_all_files")}
              loading={isSaving}
            >
              {i18n.t("cardDetails.saveOverwriteWithDuplicates")}
            </Button>
            {isSillyTavern && (
              <Tooltip
                label={i18n.t("cardDetails.saveToFolderTip", {
                  path: cardsFolderPath.trim() || i18n.t("empty.dash"),
                })}
                withArrow
              >
                <Button
                  color="teal"
                  variant="light"
                  onClick={() => onSave("save_new_to_library")}
                  loading={isSaving}
                >
                  {i18n.t("cardDetails.saveToFolder")}
                </Button>
              </Tooltip>
            )}
          </>
        )}
        <Button variant="default" onClick={onClose} disabled={isSaving}>
          {i18n.t("actions.cancel")}
        </Button>
      </Stack>
    </Modal>
  );
}


