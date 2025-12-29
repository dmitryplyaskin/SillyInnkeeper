import { useUnit } from "effector-react";
import { SegmentedControl, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { TriState } from "@/shared/types/cards-query";
import { $filters, setIsSillyTavern } from "../../model";

const $isSillyTavern = $filters.map((s) => s.is_sillytavern);

export function SourceSection() {
  const { t } = useTranslation();
  const [isSillyTavern, onSetIsSillyTavern] = useUnit([
    $isSillyTavern,
    setIsSillyTavern,
  ]);
  return (
    <Stack gap={4}>
      <Text size="sm" fw={500}>
        {t("filters.source")}
      </Text>
      <SegmentedControl
        fullWidth
        value={isSillyTavern}
        onChange={(value) => onSetIsSillyTavern(value as TriState)}
        data={[
          { value: "any", label: t("filters.sourceAll") },
          { value: "1", label: t("filters.sourceOnlySt") },
          { value: "0", label: t("filters.sourceOnlyFolder") },
        ]}
      />
    </Stack>
  );
}


