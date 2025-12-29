import { Divider, Group, NumberInput, SimpleGrid, Text } from "@mantine/core";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import { InfoTip } from "../shared/InfoTip";
import { $filters, setPromptTokensMax, setPromptTokensMin } from "../../model";

const $min = $filters.map((s) => s.prompt_tokens_min);
const $max = $filters.map((s) => s.prompt_tokens_max);

export function TokensSection() {
  const { t } = useTranslation();
  const [min, max, onSetMin, onSetMax] = useUnit([
    $min,
    $max,
    setPromptTokensMin,
    setPromptTokensMax,
  ]);
  return (
    <>
      <Divider label={t("filters.tokensEstimate")} />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <NumberInput
          label={
            (
              <Group gap={6}>
                <Text size="sm">{t("filters.min")}</Text>
                <InfoTip text={t("filters.tokensMinTip")} />
              </Group>
            ) as any
          }
          min={0}
          value={min}
          onChange={(v) => onSetMin(Number(v) || 0)}
        />
        <NumberInput
          label={
            (
              <Group gap={6}>
                <Text size="sm">{t("filters.max")}</Text>
                <InfoTip text={t("filters.tokensMaxTip")} />
              </Group>
            ) as any
          }
          min={0}
          value={max}
          onChange={(v) => onSetMax(Number(v) || 0)}
        />
      </SimpleGrid>
    </>
  );
}
