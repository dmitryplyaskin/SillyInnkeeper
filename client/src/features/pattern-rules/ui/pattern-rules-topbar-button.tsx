import { ActionIcon, Tooltip } from "@mantine/core";
import { IconBraces } from "@tabler/icons-react";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import { openPatternRulesModal } from "../model";

export function PatternRulesTopbarButton() {
  const { t } = useTranslation();
  const onOpen = useUnit(openPatternRulesModal);

  return (
    <Tooltip label={t("patternRules.openTooltip")} withArrow position="bottom">
      <ActionIcon
        variant="subtle"
        color="gray"
        size="lg"
        onClick={() => onOpen()}
        aria-label={t("patternRules.openAria")}
      >
        <IconBraces size={18} />
      </ActionIcon>
    </Tooltip>
  );
}


