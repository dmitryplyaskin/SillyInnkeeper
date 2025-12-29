import { useUnit } from "effector-react";
import { Button, Group } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { $filtersLoading, loadCardsFiltersFx, resetFilters } from "../../model";

export function ActionsSection() {
  const { t } = useTranslation();
  const [isLoading, onReset, onRefreshLists] = useUnit([
    $filtersLoading,
    resetFilters,
    loadCardsFiltersFx,
  ]);
  return (
    <Group justify="space-between" align="center">
      <Group gap="sm">
        <Button variant="default" onClick={() => onReset()}>
          {t("actions.reset")}
        </Button>
        <Button
          variant="light"
          loading={isLoading}
          onClick={() => onRefreshLists()}
        >
          {t("actions.refreshLists")}
        </Button>
      </Group>
    </Group>
  );
}
