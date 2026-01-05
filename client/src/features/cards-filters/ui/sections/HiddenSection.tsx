import { useUnit } from "effector-react";
import { SegmentedControl, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { TriState } from "@/shared/types/cards-query";
import { $filters, setIsHidden } from "../../model";

const $isHidden = $filters.map((s) => s.is_hidden);

export function HiddenSection() {
  const { t } = useTranslation();
  const [isHidden, onSetIsHidden] = useUnit([$isHidden, setIsHidden]);

  return (
    <Stack gap={4}>
      <Text size="sm" fw={500}>
        {t("filters.hidden")}
      </Text>
      <SegmentedControl
        fullWidth
        value={isHidden}
        onChange={(value) => onSetIsHidden(value as TriState)}
        data={[
          { value: "0", label: t("filters.hiddenExclude") },
          { value: "any", label: t("filters.hiddenInclude") },
          { value: "1", label: t("filters.hiddenOnly") },
        ]}
      />
    </Stack>
  );
}


