import { Button, Code, Group, Modal, Stack, Text } from "@mantine/core";
import i18n from "@/shared/i18n/i18n";

export function ConfirmDeleteDuplicateModal({
  opened,
  selectedDuplicatePath,
  isDeleting,
  onClose,
  onConfirm,
}: {
  opened: boolean;
  selectedDuplicatePath: string | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={i18n.t("cardDetails.confirmDeleteDuplicateTitle")}
      zIndex={500}
      overlayProps={{ zIndex: 499 }}
    >
      <Stack gap="md">
        <Text size="sm">{i18n.t("cardDetails.confirmDeleteDuplicateMessage")}</Text>
        {selectedDuplicatePath && <Code block>{selectedDuplicatePath}</Code>}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} disabled={isDeleting}>
            {i18n.t("actions.cancel")}
          </Button>
          <Button color="red" onClick={onConfirm} loading={isDeleting}>
            {i18n.t("cardDetails.deleteDuplicate")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}


