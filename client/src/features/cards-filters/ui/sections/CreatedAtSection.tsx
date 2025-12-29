import {
  ActionIcon,
  Divider,
  Group,
  SimpleGrid,
  Text,
  TextInput,
} from "@mantine/core";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import { InfoTip } from "../shared/InfoTip";
import { $filters, setCreatedFrom, setCreatedTo } from "../../model";

const $createdFrom = $filters.map((s) => s.created_from);
const $createdTo = $filters.map((s) => s.created_to);

export function CreatedAtSection() {
  const { t } = useTranslation();
  const [createdFrom, createdTo, onSetCreatedFrom, onSetCreatedTo] = useUnit([
    $createdFrom,
    $createdTo,
    setCreatedFrom,
    setCreatedTo,
  ]);
  return (
    <>
      <Divider
        label={
          <Group gap={6}>
            <Text size="sm">{t("filters.createdAt")}</Text>
            <InfoTip text={t("filters.localDayTip")} />
          </Group>
        }
      />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <TextInput
          label={t("filters.createdFrom")}
          type="date"
          value={createdFrom || ""}
          rightSection={
            createdFrom ? (
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                aria-label={t("filters.clearDateFromAria")}
                onClick={() => onSetCreatedFrom(undefined)}
              >
                ×
              </ActionIcon>
            ) : null
          }
          rightSectionPointerEvents="all"
          onChange={(e) =>
            onSetCreatedFrom(
              e.currentTarget.value.trim().length > 0
                ? e.currentTarget.value
                : undefined
            )
          }
        />

        <TextInput
          label={t("filters.createdTo")}
          type="date"
          value={createdTo || ""}
          rightSection={
            createdTo ? (
              <ActionIcon
                variant="subtle"
                color="gray"
                size="sm"
                aria-label={t("filters.clearDateToAria")}
                onClick={() => onSetCreatedTo(undefined)}
              >
                ×
              </ActionIcon>
            ) : null
          }
          rightSectionPointerEvents="all"
          onChange={(e) =>
            onSetCreatedTo(
              e.currentTarget.value.trim().length > 0
                ? e.currentTarget.value
                : undefined
            )
          }
        />
      </SimpleGrid>
    </>
  );
}
