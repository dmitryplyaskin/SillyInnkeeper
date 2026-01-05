import {
  Divider,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Text,
} from "@mantine/core";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import type { TriState } from "@/shared/types/cards-query";
import { InfoTip } from "../shared/InfoTip";
import {
  $filters,
  setAlternateGreetingsMin,
  setHasAlternateGreetings,
} from "../../model";

const $hasAlt = $filters.map((s) => s.has_alternate_greetings);
const $minCount = $filters.map((s) => s.alternate_greetings_min);

export function AltGreetingsSection() {
  const { t } = useTranslation();
  const [hasAlt, minCount, onSetHasAlt, onSetMin] = useUnit([
    $hasAlt,
    $minCount,
    setHasAlternateGreetings,
    setAlternateGreetingsMin,
  ]);

  const TRI_STATE_DATA: Array<{ value: TriState; label: string }> = [
    { value: "any", label: t("filters.triAny") },
    { value: "1", label: t("filters.triHas") },
    { value: "0", label: t("filters.triHasNot") },
  ];

  return (
    <>
      <Divider label={t("filters.altGreetings")} />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Select
          label={
            <Group gap={6}>
              <Text size="sm">{t("filters.presence")}</Text>
              <InfoTip text={t("filters.presenceTip")} />
            </Group>
          }
          data={TRI_STATE_DATA as any}
          value={hasAlt}
          onChange={(v) => onSetHasAlt((v as TriState) || "any")}
        />

        <NumberInput
          label={t("filters.minCount")}
          min={0}
          value={minCount}
          onChange={(v) => onSetMin(Number(v) || 0)}
        />
      </SimpleGrid>
    </>
  );
}
