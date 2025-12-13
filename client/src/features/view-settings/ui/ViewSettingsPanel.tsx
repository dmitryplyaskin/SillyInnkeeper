import { Group, SegmentedControl, Switch, Text, Badge } from "@mantine/core";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import {
  $columnsCount,
  $isCensored,
  setColumnsCount,
  toggleCensorship,
} from "../model";
import { $cards } from "@/entities/cards";

export function ViewSettingsPanel() {
  const { t } = useTranslation();
  const [columnsCount, isCensored, setColumns, toggleCensor, cards] = useUnit([
    $columnsCount,
    $isCensored,
    setColumnsCount,
    toggleCensorship,
    $cards,
  ]);

  return (
    <Group gap="md" align="center" wrap="nowrap">
      <Group gap="xs" wrap="nowrap">
        <Text size="sm" fw={500}>
          {t("view.columns")}
        </Text>
        <SegmentedControl
          size="xs"
          value={columnsCount.toString()}
          onChange={(value) => setColumns(Number(value) as 3 | 5 | 7)}
          data={[
            { label: "3", value: "3" },
            { label: "5", value: "5" },
            { label: "7", value: "7" },
          ]}
        />
      </Group>

      <Badge variant="light" color="gray" size="sm" style={{ flexShrink: 0 }}>
        {t("view.cardsCount", { count: cards.length })}
      </Badge>

      <Switch
        size="sm"
        checked={isCensored}
        onChange={() => toggleCensor()}
        label={isCensored ? t("view.censorshipOn") : t("view.censorshipOff")}
        styles={{ label: { whiteSpace: "nowrap" } }}
      />
    </Group>
  );
}
