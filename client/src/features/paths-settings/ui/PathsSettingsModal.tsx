import { Modal } from "@mantine/core";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import { $settings } from "@/entities/settings";
import { SettingsForm } from "@/features/settings-form";

export type PathsSettingsModalProps = {
  opened: boolean;
  onClose: () => void;
};

export function PathsSettingsModal({
  opened,
  onClose,
}: PathsSettingsModalProps) {
  const settings = useUnit($settings);
  const { t } = useTranslation();

  if (!settings) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t("setup.appSettingsTitle")}
      centered
      size="md"
      padding="lg"
    >
      <SettingsForm
        initialSettings={settings}
        onSaved={onClose}
        variant="plain"
        showHeader={false}
      />
    </Modal>
  );
}
