import { Checkbox, Divider, NumberInput, Select, SimpleGrid } from "@mantine/core";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import {
  $filters,
  $filtersData,
  setStChatsCount,
  setStChatsCountOp,
  setStHideNoChats,
  setStProfileHandle,
} from "../../model";

const $count = $filters.map((s) => s.st_chats_count);
const $op = $filters.map((s) => s.st_chats_count_op ?? "gte");
const $profile = $filters.map((s) => s.st_profile_handle);
const $hideNoChats = $filters.map((s) => s.st_hide_no_chats);
const $profilesOptions = $filtersData.map((s) => s.st_profiles ?? []);

const ANY_PROFILE_VALUE = "__st_any_profile__";

export function ChatsSection() {
  const { t } = useTranslation();
  const [
    count,
    op,
    profile,
    hideNoChats,
    profiles,
    onSetCount,
    onSetOp,
    onSetProfile,
    onSetHideNoChats,
  ] =
    useUnit([
      $count,
      $op,
      $profile,
      $hideNoChats,
      $profilesOptions,
      setStChatsCount,
      setStChatsCountOp,
      setStProfileHandle,
      setStHideNoChats,
    ]);

  const opData = [
    { value: "eq", label: t("filters.opEq") },
    { value: "gte", label: t("filters.opGte") },
    { value: "lte", label: t("filters.opLte") },
  ] as const;

  const profileData = [
    { value: ANY_PROFILE_VALUE, label: t("filters.triAny") },
    ...profiles.map((p) => ({
      value: p.value,
      label: `${p.value} (${p.count})`,
    })),
  ];

  return (
    <>
      <Divider label={t("filters.chats")} />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
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
      </SimpleGrid>

      <Select
        label={t("filters.stProfile")}
        data={profileData as any}
        value={profile ?? null}
        placeholder={t("filters.triAny")}
        onChange={(v) => {
          if (v === ANY_PROFILE_VALUE || v == null) {
            onSetProfile(undefined);
            return;
          }
          onSetProfile(v);
        }}
        clearable={Boolean(profile)}
      />

      <Checkbox
        label={t("filters.hideNoChats")}
        checked={Boolean(hideNoChats)}
        onChange={(e) => onSetHideNoChats(e.currentTarget.checked)}
      />
    </>
  );
}


