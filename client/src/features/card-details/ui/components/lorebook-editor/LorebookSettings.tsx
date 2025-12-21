import {
  Checkbox,
  Group,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { Lorebook } from "@/shared/types/lorebooks";
import {
  getStExt,
  setStLorebookExt,
} from "@/shared/types/lorebooks/sillytavern";

function triBoolToSelectValue(v: boolean | undefined): string {
  if (v === true) return "true";
  if (v === false) return "false";
  return "";
}

function selectValueToTriBool(v: string | null): boolean | undefined {
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

export function LorebookSettings({
  disabled,
  data,
  onChange,
  variant = "standalone",
}: {
  disabled?: boolean;
  data: Lorebook;
  onChange: (updater: (data: Lorebook) => Lorebook) => void;
  variant?: "standalone" | "panel";
}) {
  const { t } = useTranslation();
  const st = getStExt(data).lorebook ?? {};

  const size = variant === "panel" ? "xs" : "sm";
  const stack = (
    <Stack gap={variant === "panel" ? "xs" : "md"}>
      {variant === "standalone" ? (
        <Text fw={600}>
          {t("cardDetails.lorebook.settings", "Lorebook Settings")}
        </Text>
      ) : null}

      <TextInput
        label={
          variant === "standalone"
            ? t("cardDetails.lorebook.name", "Name")
            : undefined
        }
        value={data.name ?? ""}
        onChange={(e) =>
          onChange((d) => ({
            ...d,
            name: e.currentTarget.value.trim() || undefined,
          }))
        }
        disabled={disabled}
        placeholder={t(
          "cardDetails.lorebook.namePlaceholder",
          "Optional lorebook name"
        )}
        size={size}
      />

      <Textarea
        label={
          variant === "standalone"
            ? t("cardDetails.lorebook.description", "Description")
            : undefined
        }
        value={data.description ?? ""}
        onChange={(e) =>
          onChange((d) => ({
            ...d,
            description: e.currentTarget.value.trim() || undefined,
          }))
        }
        disabled={disabled}
        minRows={variant === "panel" ? 1 : 2}
        autosize
        size={size}
        placeholder={t(
          "cardDetails.lorebook.descriptionPlaceholder",
          "Optional description"
        )}
      />

      <Group grow gap="xs">
        <NumberInput
          label={
            variant === "standalone"
              ? t("cardDetails.lorebook.scanDepth", "Scan Depth")
              : undefined
          }
          value={data.scan_depth ?? ""}
          onChange={(value) =>
            onChange((d) => ({
              ...d,
              scan_depth:
                typeof value === "number" && Number.isFinite(value)
                  ? value
                  : undefined,
            }))
          }
          disabled={disabled}
          placeholder={t("cardDetails.lorebook.useGlobal", "Use global")}
          min={0}
          size={size}
        />

        <NumberInput
          label={
            variant === "standalone"
              ? t("cardDetails.lorebook.tokenBudget", "Token Budget")
              : undefined
          }
          value={data.token_budget ?? ""}
          onChange={(value) =>
            onChange((d) => ({
              ...d,
              token_budget:
                typeof value === "number" && Number.isFinite(value)
                  ? value
                  : undefined,
            }))
          }
          disabled={disabled}
          placeholder={t("cardDetails.lorebook.useGlobal", "Use global")}
          min={0}
          size={size}
        />
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="xs">
        <NumberInput
          label={t(
            "cardDetails.lorebook.scanDepthDefault",
            "Scan Depth Default (ST)"
          )}
          value={typeof st.scan_depth_default === "number" ? st.scan_depth_default : ""}
          onChange={(value) =>
            onChange((d) =>
              setStLorebookExt(d, {
                scan_depth_default:
                  typeof value === "number" && Number.isFinite(value)
                    ? Math.max(0, Math.trunc(value))
                    : undefined,
              })
            )
          }
          disabled={disabled}
          placeholder={t("cardDetails.lorebook.optional", "Optional")}
          min={0}
          size={size}
        />

        <Select
          label={t(
            "cardDetails.lorebook.caseSensitiveDefault",
            "Case Sensitive Default (ST)"
          )}
          value={triBoolToSelectValue(st.case_sensitive_default)}
          onChange={(value) =>
            onChange((d) =>
              setStLorebookExt(d, { case_sensitive_default: selectValueToTriBool(value) })
            )
          }
          data={[
            { value: "", label: t("cardDetails.lorebook.optional", "Optional") },
            { value: "true", label: t("cardDetails.lorebook.triEnabled", "Enabled") },
            { value: "false", label: t("cardDetails.lorebook.triDisabled", "Disabled") },
          ]}
          disabled={disabled}
          size={size}
        />

        <Select
          label={t(
            "cardDetails.lorebook.wholeWordsDefault",
            "Whole Words Default (ST)"
          )}
          value={triBoolToSelectValue(st.match_whole_words_default)}
          onChange={(value) =>
            onChange((d) =>
              setStLorebookExt(d, {
                match_whole_words_default: selectValueToTriBool(value),
              })
            )
          }
          data={[
            { value: "", label: t("cardDetails.lorebook.optional", "Optional") },
            { value: "true", label: t("cardDetails.lorebook.triEnabled", "Enabled") },
            { value: "false", label: t("cardDetails.lorebook.triDisabled", "Disabled") },
          ]}
          disabled={disabled}
          size={size}
        />

        <Select
          label={t(
            "cardDetails.lorebook.groupScoringDefault",
            "Group Scoring Default (ST)"
          )}
          value={triBoolToSelectValue(st.group_scoring_default)}
          onChange={(value) =>
            onChange((d) =>
              setStLorebookExt(d, { group_scoring_default: selectValueToTriBool(value) })
            )
          }
          data={[
            { value: "", label: t("cardDetails.lorebook.optional", "Optional") },
            { value: "true", label: t("cardDetails.lorebook.triEnabled", "Enabled") },
            { value: "false", label: t("cardDetails.lorebook.triDisabled", "Disabled") },
          ]}
          disabled={disabled}
          size={size}
        />
      </SimpleGrid>

      <Checkbox
        label={t(
          "cardDetails.lorebook.recursiveScanning",
          "Recursive Scanning"
        )}
        checked={data.recursive_scanning ?? false}
        onChange={(e) =>
          onChange((d) => ({
            ...d,
            recursive_scanning: e.currentTarget.checked || undefined,
          }))
        }
        disabled={disabled}
        size={size}
      />
    </Stack>
  );

  if (variant === "panel") return stack;

  return <Paper p="md">{stack}</Paper>;
}
