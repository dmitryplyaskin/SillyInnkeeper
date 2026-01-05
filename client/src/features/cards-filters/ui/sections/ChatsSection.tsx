import {
  Checkbox,
  Divider,
  MultiSelect,
  NumberInput,
  Select,
  SimpleGrid,
} from "@mantine/core";
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
import { mergeOptions } from "../shared/mergeOptions";

const $count = $filters.map((s) => s.st_chats_count, { skipVoid: false });
const $op = $filters.map((s) => s.st_chats_count_op ?? "gte");
const $profile = $filters.map((s) => s.st_profile_handle);
const $hideNoChats = $filters.map((s) => s.st_hide_no_chats);
const $profilesOptions = $filtersData.map((s) => s.st_profiles ?? []);

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
  ] = useUnit([
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

  const profileData = mergeOptions(profile, profiles);

  return (
    <>
      <Divider label={t("filters.chats")} />

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <NumberInput
          label={t("filters.chatsCount")}
          min={0}
          // Mantine NumberInput: keep it controlled; use "" to visually clear on reset
          value={
            typeof count === "number" && Number.isFinite(count) ? count : ""
          }
          onChange={(v) => {
            if (
              v === "" ||
              v === null ||
              typeof v !== "number" ||
              !Number.isFinite(v)
            ) {
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

      <MultiSelect
        label={t("filters.stProfile")}
        data={profileData}
        value={profile}
        placeholder={t("filters.triAny")}
        onChange={onSetProfile}
        searchable
        clearable
      />

      <Checkbox
        label={t("filters.hideNoChats")}
        checked={Boolean(hideNoChats)}
        onChange={(e) => onSetHideNoChats(e.currentTarget.checked)}
      />
    </>
  );
}
