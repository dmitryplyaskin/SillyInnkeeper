import { ActionIcon, Tooltip } from "@mantine/core";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import { openPatternRulesModal } from "../model";

function RegexIcon({ size = 18 }: { size?: number }) {
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
      <path d="M4 6h16" />
      <path d="M4 12h10" />
      <path d="M4 18h16" />
      <path d="M17 9l3 3-3 3" />
    </svg>
  );
}

export function PatternRulesTopbarButton() {
  const { t } = useTranslation();
  const onOpen = useUnit(openPatternRulesModal);

  return (
    <Tooltip label={t("patternRules.openTooltip")} withArrow position="bottom">
      <ActionIcon
        variant="filled"
        color="blue"
        size="lg"
        onClick={() => onOpen()}
        aria-label={t("patternRules.openAria")}
      >
        <RegexIcon />
      </ActionIcon>
    </Tooltip>
  );
}


