import { ActionIcon, Tooltip } from "@mantine/core";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import { openImportModal } from "../model";

function ImportIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 3v10" />
      <path d="m8 9 4 4 4-4" />
      <path d="M4 17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2" />
      <path d="M6 17v-3" />
      <path d="M18 17v-3" />
    </svg>
  );
}

export function CardsImportTopbarButton() {
  const { t } = useTranslation();
  const onOpen = useUnit(openImportModal);

  return (
    <Tooltip label={t("cardsImport.openTooltip")} withArrow position="bottom">
      <ActionIcon
        variant="filled"
        color="green"
        size="lg"
        onClick={() => onOpen()}
        aria-label={t("cardsImport.openAria")}
      >
        <ImportIcon />
      </ActionIcon>
    </Tooltip>
  );
}


