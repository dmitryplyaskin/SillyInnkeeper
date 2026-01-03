import { Divider, NumberInput, Select, SimpleGrid } from "@mantine/core";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import { $filters, $filtersData, setStChatsCount, setStChatsCountOp, setStProfileHandle } from "../../model";

const $count = $filters.map((s) => s.st_chats_count);
const $op = $filters.map((s) => s.st_chats_count_op ?? "gte");
const $profile = $filters.map((s) => s.st_profile_handle);
const $profilesOptions = $filtersData.map((s) => s.st_profiles ?? []);

export function ChatsSection() {
  const { t } = useTranslation();
  const [count, op, profile, profiles, onSetCount, onSetOp, onSetProfile] =
    useUnit([
      $count,
      $op,
      $profile,
      $profilesOptions,
      setStChatsCount,
      setStChatsCountOp,
      setStProfileHandle,
    ]);

  const opData = [
    { value: "eq", label: t("filters.opEq") },
    { value: "gte", label: t("filters.opGte") },
    { value: "lte", label: t("filters.opLte") },
  ] as const;

  const profileData = [
    { value: "", label: t("filters.triAny") },
    ...profiles.map((p) => ({
      value: p.value,
      label: `${p.value} (${p.count})`,
    })),
  ];

  return (
    <>
      <Divider label={t("filters.chats")} />

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <NumberInput
          label={t("filters.chatsCount")}
          min={0}
          value={typeof count === "number" ? count : undefined}
          onChange={(v) => {
            if (typeof v !== "number" || !Number.isFinite(v)) {
              onSetCount(undefined);
              return;
            }
            onSetCount(Math.max(0, Math.floor(v)));
          }}
        />

        <Select
          label={t("filters.chatsCountOp")}
          data={opData as any}
          value={op}
          onChange={(v) => onSetOp(((v as any) ?? "gte") as any)}
        />

        <Select
          label={t("filters.stProfile")}
          data={profileData as any}
          value={profile ?? ""}
          onChange={(v) => onSetProfile(v && v.length > 0 ? v : undefined)}
        />
      </SimpleGrid>
    </>
  );
}


