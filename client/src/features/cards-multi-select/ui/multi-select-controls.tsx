import { useEffect, useState } from "react";
import {
  ActionIcon,
  Affix,
  Box,
  Button,
  Group,
  Modal,
  Paper,
  Text,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import {
  $deleteError,
  $isDeleting,
  $lastDeleteResult,
  $isMultiSelectMode,
  $selectedCardsCount,
  clearSelectedCards,
  clearDeleteStatus,
  deleteSelectedCardsRequested,
  toggleMultiSelectMode,
} from "../model";

function SelectIcon({ active }: { active: boolean }) {
  return active ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 16V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2Z" />
    </svg>
  );
}

export function MultiSelectControls() {
  const { t } = useTranslation();
  const [isOn, selectedCount, isDeleting, deleteError, deleteResult] = useUnit([
    $isMultiSelectMode,
    $selectedCardsCount,
    $isDeleting,
    $deleteError,
    $lastDeleteResult,
  ]);
  const [toggleMode, clearSelected, requestDelete] = useUnit([
    toggleMultiSelectMode,
    clearSelectedCards,
    deleteSelectedCardsRequested,
  ]);
  const clearStatus = useUnit(clearDeleteStatus);

  const [confirmOpened, setConfirmOpened] = useState(false);

  const onConfirmDelete = () => {
    setConfirmOpened(false);
    requestDelete();
  };

  useEffect(() => {
    if (!deleteResult) return;
    notifications.show({
      color: "green",
      message: t("multiSelect.deleteOk", { count: deleteResult.deleted }),
    });
    clearStatus();
  }, [deleteResult, clearStatus, t]);

  useEffect(() => {
    if (!deleteError) return;
    notifications.show({
      color: "red",
      title: t("errors.generic"),
      message: deleteError,
    });
    clearStatus();
  }, [deleteError, clearStatus, t]);

  return (
    <>
      <Affix position={{ bottom: 20, right: 20 }} zIndex={210}>
        <Tooltip
          label={isOn ? t("multiSelect.toggleOff") : t("multiSelect.toggleOn")}
          withArrow
          position="left"
        >
          <ActionIcon
            size="xl"
            radius="xl"
            variant={isOn ? "filled" : "light"}
            color={isOn ? "blue" : "gray"}
            onClick={() => toggleMode()}
            disabled={isDeleting}
            aria-label={isOn ? t("multiSelect.toggleOff") : t("multiSelect.toggleOn")}
          >
            <SelectIcon active={isOn} />
          </ActionIcon>
        </Tooltip>
      </Affix>

      {isOn && (
        <Affix position={{ bottom: 16, left: 16, right: 92 }} zIndex={200}>
          <Box style={{ display: "flex", justifyContent: "center", width: "100%" }}>
            <Paper
              shadow="md"
              radius="lg"
              withBorder
              px="md"
              py="sm"
              style={{
                width: "min(820px, 100%)",
                backgroundColor: "var(--mantine-color-body)",
              }}
            >
              <Group justify="space-between" wrap="nowrap">
                <Text fw={600}>
                  {t("multiSelect.selectedCount", { count: selectedCount })}
                </Text>
                <Group gap="xs" wrap="nowrap">
                  <Button
                    variant="default"
                    disabled={selectedCount === 0 || isDeleting}
                    onClick={() => clearSelected()}
                  >
                    {t("actions.reset")}
                  </Button>
                  <Button
                    color="red"
                    variant={selectedCount === 0 ? "light" : "filled"}
                    disabled={selectedCount === 0 || isDeleting}
                    onClick={() => setConfirmOpened(true)}
                  >
                    {t("multiSelect.delete")}
                  </Button>
                </Group>
              </Group>
            </Paper>
          </Box>
        </Affix>
      )}

      <Modal
        opened={confirmOpened}
        onClose={() => setConfirmOpened(false)}
        title={t("multiSelect.confirmDeleteTitle")}
        centered
      >
        <Text mb="md">{t("multiSelect.confirmDeleteText")}</Text>
        <Group justify="flex-end">
          <Button
            variant="default"
            disabled={isDeleting}
            onClick={() => setConfirmOpened(false)}
          >
            {t("actions.cancel")}
          </Button>
          <Button color="red" loading={isDeleting} onClick={onConfirmDelete}>
            {t("multiSelect.confirmDeleteOk")}
          </Button>
        </Group>
      </Modal>
    </>
  );
}


