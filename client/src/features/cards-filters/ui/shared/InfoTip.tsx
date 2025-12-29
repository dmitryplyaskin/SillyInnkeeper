import { ActionIcon, Tooltip } from "@mantine/core";
import { useTranslation } from "react-i18next";

export function InfoTip({ text }: { text: string }) {
  const { t } = useTranslation();
  return (
    <Tooltip label={text} withArrow multiline maw={280}>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="sm"
        radius="xl"
        aria-label={t("filters.infoTipAria")}
      >
        i
      </ActionIcon>
    </Tooltip>
  );
}


