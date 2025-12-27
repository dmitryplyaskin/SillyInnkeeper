import { createEffect, createEvent, createStore, sample, combine } from "effector";
import { notifications } from "@mantine/notifications";
import i18n from "@/shared/i18n/i18n";
import type { PatternRule, PatternRulesFile } from "@/shared/types/pattern-rules";
import type { PatternRulesStatus } from "@/shared/types/pattern-rules-status";
import {
  getPatternRules,
  getPatternRulesStatus,
  putPatternRules,
  runPatternRules,
} from "@/shared/api/pattern-rules";

const PATTERNS_NOTIFICATION_ID = "patterns-status";

function createId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `r_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }
}

function normalizeFlags(flags: string): string {
  const trimmed = String(flags ?? "").trim();
  const seen = new Set<string>();
  let out = "";
  for (const ch of trimmed) {
    if (seen.has(ch)) continue;
    seen.add(ch);
    out += ch;
  }
  return out;
}

function isFlagsValid(flags: string): boolean {
  // Keep in sync with backend validator (subset is OK).
  return /^[dgimsuvy]*$/.test(flags);
}

export type RuleErrors = {
  pattern?: string;
  flags?: string;
};

function validateRuleLocal(rule: PatternRule): RuleErrors {
  const errors: RuleErrors = {};
  if (rule.enabled && rule.pattern.trim().length === 0) {
    errors.pattern = i18n.t("patternRules.validation.patternRequired");
  }
  const flags = normalizeFlags(rule.flags);
  if (!isFlagsValid(flags)) {
    errors.flags = i18n.t("patternRules.validation.flagsInvalid");
  }
  return errors;
}

export const openPatternRulesModal = createEvent<void>();
export const closePatternRulesModal = createEvent<void>();

export const addRuleClicked = createEvent<void>();
export const removeRuleClicked = createEvent<string>();
export const rulePatternChanged = createEvent<{ id: string; pattern: string }>();
export const ruleFlagsChanged = createEvent<{ id: string; flags: string }>();
export const ruleEnabledToggled = createEvent<{ id: string; enabled: boolean }>();

export const saveRulesClicked = createEvent<void>();
export const runSearchClicked = createEvent<void>();

export const loadPatternRulesFx = createEffect<void, PatternRulesFile, Error>(
  async () => {
    return await getPatternRules();
  }
);

export const savePatternRulesFx = createEffect<PatternRulesFile, PatternRulesFile, Error>(
  async (file) => {
    return await putPatternRules(file);
  }
);

export const loadPatternRulesStatusFx = createEffect<void, PatternRulesStatus, Error>(
  async () => {
    return await getPatternRulesStatus();
  }
);

export const runPatternRulesFx = createEffect<
  void,
  { run_id: string; rules_hash: string },
  Error
>(async () => {
  return await runPatternRules();
});

export const $opened = createStore(false)
  .on(openPatternRulesModal, () => true)
  .on(closePatternRulesModal, () => false);

export const $rulesFile = createStore<PatternRulesFile | null>(null).on(
  loadPatternRulesFx.doneData,
  (_, file) => file
);

export const $draftRules = createStore<PatternRule[]>([])
  .on(loadPatternRulesFx.doneData, (_, file) => file.rules)
  .on(addRuleClicked, (list) => [
    ...list,
    {
      id: createId(),
      type: "regex",
      pattern: "",
      enabled: true,
      flags: "",
    },
  ])
  .on(removeRuleClicked, (list, id) => list.filter((r) => r.id !== id))
  .on(rulePatternChanged, (list, { id, pattern }) =>
    list.map((r) => (r.id === id ? { ...r, pattern } : r))
  )
  .on(ruleFlagsChanged, (list, { id, flags }) =>
    list.map((r) => (r.id === id ? { ...r, flags: normalizeFlags(flags) } : r))
  )
  .on(ruleEnabledToggled, (list, { id, enabled }) =>
    list.map((r) => (r.id === id ? { ...r, enabled } : r))
  );

export const $ruleErrors = $draftRules.map((rules) => {
  const out: Record<string, RuleErrors> = {};
  for (const r of rules) out[r.id] = validateRuleLocal(r);
  return out;
});

export const $hasLocalErrors = $ruleErrors.map((m) =>
  Object.values(m).some((e) => Boolean(e.pattern || e.flags))
);

export const $status = createStore<PatternRulesStatus | null>(null).on(
  loadPatternRulesStatusFx.doneData,
  (_, s) => s
);

export const $loading = combine(
  {
    loadingRules: loadPatternRulesFx.pending,
    saving: savePatternRulesFx.pending,
    running: runPatternRulesFx.pending,
    loadingStatus: loadPatternRulesStatusFx.pending,
  },
  (x) => x
);

// When modal opens: load rules + status
sample({ clock: openPatternRulesModal, target: loadPatternRulesFx });
sample({ clock: openPatternRulesModal, target: loadPatternRulesStatusFx });

// Save
sample({
  clock: saveRulesClicked,
  source: { rules: $draftRules, hasErrors: $hasLocalErrors },
  filter: ({ hasErrors }) => !hasErrors,
  fn: ({ rules }) =>
    ({
      version: 1,
      rules,
      updatedAt: Date.now(),
    }) satisfies PatternRulesFile,
  target: savePatternRulesFx,
});

sample({
  clock: saveRulesClicked,
  source: $hasLocalErrors,
  filter: (hasErrors) => hasErrors,
  fn: () => {
    notifications.show({
      title: i18n.t("errors.generic"),
      message: i18n.t("patternRules.validation.fixErrors"),
      color: "red",
    });
  },
});

savePatternRulesFx.doneData.watch(() => {
  notifications.show({
    title: i18n.t("patternRules.savedTitle"),
    message: i18n.t("patternRules.savedMessage"),
    color: "green",
  });
  loadPatternRulesStatusFx();
});

savePatternRulesFx.failData.watch((e) => {
  notifications.show({
    title: i18n.t("errors.generic"),
    message: e.message,
    color: "red",
  });
});

// Run search
sample({ clock: runSearchClicked, target: runPatternRulesFx });

runSearchClicked.watch(() => {
  notifications.show({
    id: PATTERNS_NOTIFICATION_ID,
    title: i18n.t("patternRules.runStartedTitle"),
    message: i18n.t("patternRules.runPendingMessage"),
    loading: true,
    autoClose: false,
    withCloseButton: false,
  });
});

runPatternRulesFx.doneData.watch(() => {
  notifications.update({
    id: PATTERNS_NOTIFICATION_ID,
    title: i18n.t("patternRules.runStartedTitle"),
    message: i18n.t("patternRules.runStartedMessage"),
    loading: true,
    autoClose: false,
    withCloseButton: false,
  });
  loadPatternRulesStatusFx();
});

runPatternRulesFx.failData.watch((e) => {
  notifications.update({
    id: PATTERNS_NOTIFICATION_ID,
    title: i18n.t("patternRules.failedTitle"),
    message: i18n.t("patternRules.failedMessage", { error: e.message }),
    color: "red",
    loading: false,
    autoClose: 6000,
    withCloseButton: true,
  });
});


