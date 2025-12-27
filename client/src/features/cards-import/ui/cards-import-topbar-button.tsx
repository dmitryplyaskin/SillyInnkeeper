import { ActionIcon, Tooltip } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import { openImportModal } from "../model";

export function CardsImportTopbarButton() {
  const { t } = useTranslation();
  const onOpen = useUnit(openImportModal);

  return (
    <Tooltip label={t("cardsImport.openTooltip")} withArrow position="bottom">
      <ActionIcon
        variant="subtle"
        color="gray"
        size="lg"
        onClick={() => onOpen()}
        aria-label={t("cardsImport.openAria")}
      >
        <IconDownload size={18} />
      </ActionIcon>
    </Tooltip>
  );
}


