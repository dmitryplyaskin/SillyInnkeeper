import {
  Modal,
  Stack,
  Group,
  Button,
  TextInput,
  Checkbox,
  ActionIcon,
  Text,
} from "@mantine/core";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import {
  $draftRules,
  $loading,
  $opened,
  $ruleErrors,
  $status,
  addRuleClicked,
  closePatternRulesModal,
  removeRuleClicked,
  ruleEnabledToggled,
  ruleFlagsChanged,
  rulePatternChanged,
  runSearchClicked,
  saveRulesClicked,
} from "../model";

function TrashIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export function PatternRulesModal() {
  const { t } = useTranslation();
  const [opened, rules, errorsMap, loading, status] = useUnit([
    $opened,
    $draftRules,
    $ruleErrors,
    $loading,
    $status,
  ]);
  const [
    onClose,
    onAdd,
    onSave,
    onRun,
    onRemove,
    onToggleEnabled,
    onChangePattern,
    onChangeFlags,
  ] = useUnit([
    closePatternRulesModal,
    addRuleClicked,
    saveRulesClicked,
    runSearchClicked,
    removeRuleClicked,
    ruleEnabledToggled,
    rulePatternChanged,
    ruleFlagsChanged,
  ]);

  const hasRules = Boolean(status?.hasRules);
  const hasEnabledRules = Boolean(status?.hasEnabledRules);
  const lastReady = status?.lastReady ?? null;

  return (
    <Modal
      opened={opened}
      onClose={() => onClose()}
      title={t("patternRules.title")}
      size="lg"
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          {t("patternRules.description")}
        </Text>
        <Text size="sm" c="dimmed">
          {t("patternRules.searchModeHint")}
        </Text>

        <Group gap="xs">
          <Button variant="light" onClick={() => onAdd()}>
            {t("patternRules.addRule")}
          </Button>
          <Button
            onClick={() => onSave()}
            loading={loading.saving}
            disabled={loading.loadingRules || loading.running}
          >
            {t("actions.save")}
          </Button>
          <Button
            variant="default"
            onClick={() => {
              const ok = window.confirm(t("patternRules.runConfirm"));
              if (ok) onRun();
            }}
            loading={loading.running}
            disabled={
              !hasEnabledRules || loading.loadingRules || loading.saving
            }
          >
            {t("patternRules.run")}
          </Button>
          <Button variant="subtle" onClick={() => onClose()}>
            {t("actions.close")}
          </Button>
        </Group>

        {!hasRules && (
          <Text size="sm" c="dimmed">
            {t("patternRules.noRulesHint")}
          </Text>
        )}

        {lastReady && (
          <Text size="sm" c="dimmed">
            {t("patternRules.lastReady", {
              createdAt: new Date(lastReady.created_at).toLocaleString(),
            })}
          </Text>
        )}

        <Stack gap="sm">
          {rules.map((r, idx) => {
            const e = errorsMap[r.id] ?? {};
            return (
              <Stack
                key={r.id}
                gap={6}
                p="sm"
                style={{
                  border: "1px solid var(--mantine-color-default-border)",
                  borderRadius: 8,
                }}
              >
                <Group justify="space-between" align="center">
                  <Text size="sm" fw={600}>
                    {t("patternRules.ruleLabel", { index: idx + 1 })}
                  </Text>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    aria-label={t("patternRules.deleteRuleAria")}
                    onClick={() => onRemove(r.id)}
                  >
                    <TrashIcon />
                  </ActionIcon>
                </Group>

                <Group gap="sm" align="flex-start">
                  <Checkbox
                    mt={22}
                    checked={r.enabled}
                    onChange={(ev) =>
                      onToggleEnabled({
                        id: r.id,
                        enabled: ev.currentTarget.checked,
                      })
                    }
                    label={t("patternRules.enabled")}
                  />
                  <TextInput
                    style={{ flex: 1 }}
                    label={t("patternRules.pattern")}
                    placeholder={t("patternRules.patternPlaceholder")}
                    value={r.pattern}
                    error={e.pattern}
                    onChange={(ev) =>
                      onChangePattern({
                        id: r.id,
                        pattern: ev.currentTarget.value,
                      })
                    }
                  />
                  <TextInput
                    w={120}
                    label={t("patternRules.flags")}
                    placeholder="ims"
                    value={r.flags}
                    error={e.flags}
                    onChange={(ev) =>
                      onChangeFlags({ id: r.id, flags: ev.currentTarget.value })
                    }
                  />
                </Group>
              </Stack>
            );
          })}
        </Stack>
      </Stack>
    </Modal>
  );
}
