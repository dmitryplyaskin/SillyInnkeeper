import { useUnit } from "effector-react";
import { SegmentedControl, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { TriState } from "@/shared/types/cards-query";
import { $filters, setFav } from "../../model";

const $fav = $filters.map((s) => s.fav);

export function FavoritesSection() {
  const { t } = useTranslation();
  const [fav, onSetFav] = useUnit([$fav, setFav]);

  return (
    <Stack gap={4}>
      <Text size="sm" fw={500}>
        {t("filters.fav")}
      </Text>
      <SegmentedControl
        fullWidth
        value={fav}
        onChange={(value) => onSetFav(value as TriState)}
        data={[
          { value: "any", label: t("filters.favAll") },
          { value: "1", label: t("filters.favOnly") },
          { value: "0", label: t("filters.favOnlyNot") },
        ]}
      />
    </Stack>
  );
}


