import {
  Accordion,
  Checkbox,
  Group,
  MultiSelect,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { LorebookEntry } from "@/shared/types/lorebooks";
import type {
  StAdditionalMatchingSource,
  StLorebookEntryExt,
  StOptionalLogic,
  StStrategy,
  StInsertionPosition,
  StTriggerType,
} from "@/shared/types/lorebooks/sillytavern";
import { clampInt, setStEntryExt } from "@/shared/types/lorebooks/sillytavern";
import { DeferredCommaListInput } from "../fields/DeferredCommaListInput";

const TRIGGER_VALUES: StTriggerType[] = [
  "normal",
  "continue",
  "swipe",
  "quiet",
  "impersonate",
  "regenerate",
];

const SOURCE_VALUES: StAdditionalMatchingSource[] = [
  "character_description",
  "character_personality",
  "scenario",
  "persona_description",
  "character_note",
  "creators_notes",
];

const OPTIONAL_LOGIC_VALUES: StOptionalLogic[] = [
  "AND_ANY",
  "AND_ALL",
  "NOT_ANY",
  "NOT_ALL",
];

const STRATEGY_VALUES: StStrategy[] = ["keyword", "constant", "vector"];

const INSERTION_POSITION_VALUES: StInsertionPosition[] = [
  "before_char_defs",
  "after_char_defs",
  "before_example_messages",
  "after_example_messages",
  "top_of_an",
  "bottom_of_an",
  "at_depth",
  "outlet",
];

function isTriggerType(v: string): v is StTriggerType {
  return (TRIGGER_VALUES as readonly string[]).includes(v);
}

function isAdditionalSource(v: string): v is StAdditionalMatchingSource {
  return (SOURCE_VALUES as readonly string[]).includes(v);
}

function isOptionalLogic(v: string): v is StOptionalLogic {
  return (OPTIONAL_LOGIC_VALUES as readonly string[]).includes(v);
}

function isStrategy(v: string): v is StStrategy {
  return (STRATEGY_VALUES as readonly string[]).includes(v);
}

function isInsertionPosition(v: string): v is StInsertionPosition {
  return (INSERTION_POSITION_VALUES as readonly string[]).includes(v);
}

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

export function EntryStLikeFields({
  entry,
  disabled,
  st,
  resetKeyBase,
  onUpdate,
}: {
  entry: LorebookEntry;
  disabled?: boolean;
  st: StLorebookEntryExt;
  resetKeyBase: string;
  onUpdate: (updater: (entry: LorebookEntry) => LorebookEntry) => void;
}) {
  const { t } = useTranslation();

  const currentStrategy: StStrategy = useMemo(() => {
    if (typeof st.strategy === "string" && isStrategy(st.strategy)) return st.strategy;
    if (entry.constant === true) return "constant";
    return "keyword";
  }, [entry.constant, st.strategy]);

  const currentInsertionPosition: StInsertionPosition | "" = useMemo(() => {
    if (
      typeof st.insertion_position === "string" &&
      isInsertionPosition(st.insertion_position)
    )
      return st.insertion_position;

    // Back-compat with CCv3 field (older editor stored only this)
    if (entry.position === "before_char") return "before_char_defs";
    if (entry.position === "after_char") return "after_char_defs";
    return "";
  }, [entry.position, st.insertion_position]);

  const triggers = useMemo(
    () =>
      Array.isArray(st.triggers)
        ? st.triggers.filter(
            (x): x is StTriggerType => typeof x === "string" && isTriggerType(x)
          )
        : [],
    [st.triggers]
  );

  const sources = useMemo(
    () =>
      Array.isArray(st.additional_matching_sources)
        ? st.additional_matching_sources.filter(
            (x): x is StAdditionalMatchingSource =>
              typeof x === "string" && isAdditionalSource(x)
          )
        : [],
    [st.additional_matching_sources]
  );

  const triggerData = useMemo(
    () => [
      { value: "normal", label: t("cardDetails.lorebook.triggerNormal", "Normal") },
      {
        value: "continue",
        label: t("cardDetails.lorebook.triggerContinue", "Continue"),
      },
      { value: "swipe", label: t("cardDetails.lorebook.triggerSwipe", "Swipe") },
      { value: "quiet", label: t("cardDetails.lorebook.triggerQuiet", "Quiet") },
      {
        value: "impersonate",
        label: t("cardDetails.lorebook.triggerImpersonate", "Impersonate"),
      },
      {
        value: "regenerate",
        label: t("cardDetails.lorebook.triggerRegenerate", "Regenerate"),
      },
    ],
    [t]
  );

  const sourceData = useMemo(
    () => [
      {
        value: "character_description",
        label: t(
          "cardDetails.lorebook.matchSourceCharDesc",
          "Character Description"
        ),
      },
      {
        value: "character_personality",
        label: t(
          "cardDetails.lorebook.matchSourceCharPersonality",
          "Character Personality"
        ),
      },
      {
        value: "scenario",
        label: t("cardDetails.lorebook.matchSourceScenario", "Scenario"),
      },
      {
        value: "persona_description",
        label: t(
          "cardDetails.lorebook.matchSourcePersonaDesc",
          "Persona Description"
        ),
      },
      {
        value: "character_note",
        label: t("cardDetails.lorebook.matchSourceCharNote", "Character Note"),
      },
      {
        value: "creators_notes",
        label: t(
          "cardDetails.lorebook.matchSourceCreatorsNotes",
          "Creator's Notes"
        ),
      },
    ],
    [t]
  );

  const optionalLogicValue: StOptionalLogic =
    typeof st.optional_logic === "string" && isOptionalLogic(st.optional_logic)
      ? st.optional_logic
      : "AND_ANY";

  const charFilterValues = Array.isArray(st.character_filter?.values)
    ? st.character_filter?.values.filter((x): x is string => typeof x === "string")
    : [];

  const charFilterExclude = st.character_filter?.mode === "exclude";

  return (
    <Stack gap="xs">
      <Group gap="xs" wrap="nowrap" align="flex-end">
        <TextInput
          style={{ flex: 1 }}
          label={t("cardDetails.lorebook.entryTitleMemo", "Entry Title/Memo")}
          value={entry.name ?? ""}
          onChange={(ev) => {
            const next = ev.currentTarget.value.trim();
            onUpdate((ent) =>
              setStEntryExt(
                {
                  ...ent,
                  name: next || undefined,
                },
                { memo: next || undefined }
              )
            );
          }}
          disabled={disabled}
          size="xs"
          placeholder={t("cardDetails.lorebook.entryName", "Entry Name")}
        />

        <Select
          label={t("cardDetails.lorebook.strategy", "Strategy")}
          value={currentStrategy}
          onChange={(value) => {
            const next =
              typeof value === "string" && isStrategy(value) ? value : "keyword";
            onUpdate((ent) =>
              setStEntryExt(
                {
                  ...ent,
                  // Keep CCv3 "constant" in sync with strategy
                  constant: next === "constant" ? true : undefined,
                },
                { strategy: next === "keyword" ? undefined : next }
              )
            );
          }}
          data={[
            { value: "keyword", label: t("cardDetails.lorebook.strategyKeyword", "Keyword") },
            {
              value: "constant",
              label: t("cardDetails.lorebook.strategyConstant", "Constant"),
            },
            { value: "vector", label: t("cardDetails.lorebook.strategyVector", "Vector") },
          ]}
          disabled={disabled}
          size="xs"
          w={150}
        />

        <Select
          label={t("cardDetails.lorebook.position", "Position")}
          value={currentInsertionPosition}
          onChange={(value) => {
            const next =
              typeof value === "string" && isInsertionPosition(value) ? value : "";

            onUpdate((ent) => {
              const nextPosition =
                next === "before_char_defs"
                  ? "before_char"
                  : next === "after_char_defs"
                  ? "after_char"
                  : undefined;

              return setStEntryExt(
                {
                  ...ent,
                  position: nextPosition,
                },
                {
                  insertion_position: next || undefined,
                  // Clear outlet name when leaving outlet mode
                  outlet_name: next === "outlet" ? st.outlet_name : undefined,
                  // Clear role unless at_depth
                  role: next === "at_depth" ? st.role : undefined,
                }
              );
            });
          }}
          data={[
            { value: "", label: t("cardDetails.lorebook.optional", "Optional") },
            {
              value: "before_char_defs",
              label: t("cardDetails.lorebook.posBeforeCharDefs", "Before Char Defs"),
            },
            {
              value: "after_char_defs",
              label: t("cardDetails.lorebook.posAfterCharDefs", "After Char Defs"),
            },
            {
              value: "before_example_messages",
              label: t(
                "cardDetails.lorebook.posBeforeExampleMessages",
                "Before Examples"
              ),
            },
            {
              value: "after_example_messages",
              label: t(
                "cardDetails.lorebook.posAfterExampleMessages",
                "After Examples"
              ),
            },
            { value: "top_of_an", label: t("cardDetails.lorebook.posTopOfAN", "Top of AN") },
            {
              value: "bottom_of_an",
              label: t("cardDetails.lorebook.posBottomOfAN", "Bottom of AN"),
            },
            { value: "at_depth", label: t("cardDetails.lorebook.posAtDepth", "At depth") },
            { value: "outlet", label: t("cardDetails.lorebook.posOutlet", "Outlet") },
          ]}
          disabled={disabled}
          size="xs"
          w={220}
        />

        <NumberInput
          label={t("cardDetails.lorebook.depth", "Depth")}
          value={typeof st.depth === "number" ? st.depth : ""}
          onChange={(value) =>
            onUpdate((ent) =>
              setStEntryExt(ent, {
                depth:
                  typeof value === "number" && Number.isFinite(value)
                    ? clampInt(value, { min: 0, max: 100000, fallback: 0 })
                    : undefined,
              })
            )
          }
          disabled={disabled}
          placeholder={t("cardDetails.lorebook.optional", "Optional")}
          min={0}
          size="xs"
          w={120}
        />

        <NumberInput
          value={entry.insertion_order}
          onChange={(value) =>
            onUpdate((ent) => ({
              ...ent,
              insertion_order:
                typeof value === "number" && Number.isFinite(value) ? value : 0,
            }))
          }
          disabled={disabled}
          min={0}
          size="xs"
          w={110}
          aria-label={t("cardDetails.lorebook.insertionOrder", "Insertion Order")}
        />

        <NumberInput
          value={typeof st.trigger_percent === "number" ? st.trigger_percent : 100}
          onChange={(value) =>
            onUpdate((ent) =>
              setStEntryExt(ent, {
                trigger_percent: clampInt(value, {
                  min: 0,
                  max: 100,
                  fallback: 100,
                }),
              })
            )
          }
          disabled={disabled}
          min={0}
          max={100}
          size="xs"
          w={110}
          aria-label={t("cardDetails.lorebook.trigger", "Trigger %")}
        />
      </Group>

      {currentInsertionPosition === "at_depth" ? (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
          <Select
            label={t("cardDetails.lorebook.role", "Role")}
            value={typeof st.role === "string" ? st.role : ""}
            onChange={(value) => {
              const next =
                value === "system" || value === "user" || value === "assistant"
                  ? value
                  : undefined;
              onUpdate((ent) => setStEntryExt(ent, { role: next }));
            }}
            data={[
              { value: "", label: t("cardDetails.lorebook.optional", "Optional") },
              { value: "system", label: "system" },
              { value: "user", label: "user" },
              { value: "assistant", label: "assistant" },
            ]}
            disabled={disabled}
            size="xs"
          />
        </SimpleGrid>
      ) : null}

      {currentInsertionPosition === "outlet" ? (
        <TextInput
          label={t("cardDetails.lorebook.outletName", "Outlet name")}
          value={typeof st.outlet_name === "string" ? st.outlet_name : ""}
          onChange={(ev) =>
            onUpdate((ent) =>
              setStEntryExt(ent, {
                outlet_name: ev.currentTarget.value.trim() || undefined,
              })
            )
          }
          disabled={disabled}
          size="xs"
          placeholder={t("cardDetails.lorebook.optional", "Optional")}
        />
      ) : null}

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xs">
        <DeferredCommaListInput
          label={t("cardDetails.lorebook.primaryKeywords", "Primary Keywords")}
          placeholder={t(
            "cardDetails.lorebook.keywordsOrRegexes",
            "Keywords or Regexes"
          )}
          disabled={disabled}
          size="xs"
          values={entry.keys}
          onCommit={(keys) => onUpdate((ent) => ({ ...ent, keys }))}
          resetKey={`${resetKeyBase}:keys:${entry.keys.join("|")}`}
        />

        <Select
          label={t("cardDetails.lorebook.optionalLogic", "Logic")}
          value={optionalLogicValue}
          onChange={(value) => {
            const v =
              typeof value === "string" && isOptionalLogic(value) ? value : "AND_ANY";
            onUpdate((ent) => setStEntryExt(ent, { optional_logic: v }));
          }}
          data={[
            { value: "AND_ANY", label: "AND ANY" },
            { value: "AND_ALL", label: "AND ALL" },
            { value: "NOT_ANY", label: "NOT ANY" },
            { value: "NOT_ALL", label: "NOT ALL" },
          ]}
          disabled={disabled || entry.use_regex}
          size="xs"
        />

        <DeferredCommaListInput
          label={t("cardDetails.lorebook.optionalFilter", "Optional Filter")}
          placeholder={t(
            "cardDetails.lorebook.keywordsOrRegexesIgnoredIfEmpty",
            "Keywords or Regexes (ignored if empty)"
          )}
          disabled={disabled || entry.use_regex}
          size="xs"
          values={Array.isArray(st.optional_filter) ? st.optional_filter : []}
          onCommit={(list) =>
            onUpdate((ent) =>
              setStEntryExt(ent, {
                optional_filter: list.length > 0 ? list : undefined,
              })
            )
          }
          resetKey={`${resetKeyBase}:opt:${(Array.isArray(st.optional_filter)
            ? st.optional_filter
            : []
          ).join("|")}`}
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="xs">
        <NumberInput
          label={t("cardDetails.lorebook.scanDepth", "Scan Depth")}
          value={typeof entry.scan_depth === "number" ? entry.scan_depth : ""}
          onChange={(value) =>
            onUpdate((ent) => ({
              ...ent,
              scan_depth:
                typeof value === "number" && Number.isFinite(value)
                  ? clampInt(value, { min: 0, max: 100000, fallback: 0 })
                  : undefined,
            }))
          }
          disabled={disabled}
          placeholder={t("cardDetails.lorebook.useGlobal", "Use global")}
          min={0}
          size="xs"
        />

        <Select
          label={t("cardDetails.lorebook.caseSensitive", "Case Sensitive")}
          value={triBoolToSelectValue(entry.case_sensitive)}
          onChange={(value) => {
            const next = selectValueToTriBool(value);
            onUpdate((ent) => ({ ...ent, case_sensitive: next }));
          }}
          data={[
            { value: "", label: t("cardDetails.lorebook.useGlobal", "Use global") },
            { value: "true", label: t("cardDetails.lorebook.triEnabled", "Enabled") },
            {
              value: "false",
              label: t("cardDetails.lorebook.triDisabled", "Disabled"),
            },
          ]}
          disabled={disabled}
          size="xs"
        />

        <Select
          label={t("cardDetails.lorebook.wholeWords", "Whole Words")}
          value={triBoolToSelectValue(st.match_whole_words)}
          onChange={(value) =>
            onUpdate((ent) =>
              setStEntryExt(ent, {
                match_whole_words: selectValueToTriBool(value),
              })
            )
          }
          data={[
            { value: "", label: t("cardDetails.lorebook.useGlobal", "Use global") },
            { value: "true", label: t("cardDetails.lorebook.triEnabled", "Enabled") },
            {
              value: "false",
              label: t("cardDetails.lorebook.triDisabled", "Disabled"),
            },
          ]}
          disabled={disabled}
          size="xs"
        />

        <Select
          label={t("cardDetails.lorebook.groupScoring", "Group Scoring")}
          value={triBoolToSelectValue(st.group_scoring)}
          onChange={(value) =>
            onUpdate((ent) =>
              setStEntryExt(ent, {
                group_scoring: selectValueToTriBool(value),
              })
            )
          }
          data={[
            { value: "", label: t("cardDetails.lorebook.useGlobal", "Use global") },
            { value: "true", label: t("cardDetails.lorebook.triEnabled", "Enabled") },
            {
              value: "false",
              label: t("cardDetails.lorebook.triDisabled", "Disabled"),
            },
          ]}
          disabled={disabled}
          size="xs"
        />

        <TextInput
          label={t("cardDetails.lorebook.automationId", "Automation ID")}
          value={typeof st.automation_id === "string" ? st.automation_id : ""}
          onChange={(ev) =>
            onUpdate((ent) =>
              setStEntryExt(ent, {
                automation_id: ev.currentTarget.value.trim() || undefined,
              })
            )
          }
          disabled={disabled}
          size="xs"
          placeholder={t("empty.dash")}
        />
      </SimpleGrid>

      <Textarea
        label={t("cardDetails.lorebook.content", "Content")}
        value={entry.content}
        onChange={(ev) =>
          onUpdate((ent) => ({ ...ent, content: ev.currentTarget.value }))
        }
        disabled={disabled}
        minRows={6}
        autosize
        size="xs"
        placeholder={t(
          "cardDetails.lorebook.contentPlaceholder",
          "What this keyword should mean to the AI, sent verbatim"
        )}
      />

      <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }} spacing="xs">
        <Checkbox
          label={t("cardDetails.lorebook.nonRecursable", "Non-recursable")}
          checked={Boolean(st.non_recursable)}
          onChange={(ev) =>
            onUpdate((ent) =>
              setStEntryExt(ent, {
                non_recursable: ev.currentTarget.checked || undefined,
              })
            )
          }
          disabled={disabled}
          size="xs"
        />
        <Checkbox
          label={t(
            "cardDetails.lorebook.preventFurtherRecursion",
            "Prevent further recursion"
          )}
          checked={Boolean(st.prevent_further_recursion)}
          onChange={(ev) =>
            onUpdate((ent) =>
              setStEntryExt(ent, {
                prevent_further_recursion: ev.currentTarget.checked || undefined,
              })
            )
          }
          disabled={disabled}
          size="xs"
        />
        <Checkbox
          label={t("cardDetails.lorebook.delayUntilRecursion", "Delay until recursion")}
          checked={Boolean(st.delay_until_recursion)}
          onChange={(ev) =>
            onUpdate((ent) =>
              setStEntryExt(ent, {
                delay_until_recursion: ev.currentTarget.checked || undefined,
              })
            )
          }
          disabled={disabled}
          size="xs"
        />
        <Checkbox
          label={t("cardDetails.lorebook.ignoreBudget", "Ignore budget")}
          checked={Boolean(st.ignore_budget)}
          onChange={(ev) =>
            onUpdate((ent) =>
              setStEntryExt(ent, {
                ignore_budget: ev.currentTarget.checked || undefined,
              })
            )
          }
          disabled={disabled}
          size="xs"
        />
        <NumberInput
          label={t("cardDetails.lorebook.recursionLevel", "Recursion Level")}
          value={typeof st.recursion_level === "number" ? st.recursion_level : 0}
          onChange={(value) =>
            onUpdate((ent) =>
              setStEntryExt(ent, {
                recursion_level: clampInt(value, {
                  min: 0,
                  max: 1000,
                  fallback: 0,
                }),
              })
            )
          }
          disabled={disabled || !Boolean(st.delay_until_recursion)}
          min={0}
          size="xs"
        />
      </SimpleGrid>

      <DeferredCommaListInput
        label={t("cardDetails.lorebook.inclusionGroup", "Inclusion Group")}
        placeholder={t("cardDetails.lorebook.keysPlaceholder", "Comma separated list")}
        disabled={disabled}
        size="xs"
        values={Array.isArray(st.inclusion_groups) ? st.inclusion_groups : []}
        onCommit={(list) =>
          onUpdate((ent) =>
            setStEntryExt(ent, { inclusion_groups: list.length > 0 ? list : undefined })
          )
        }
        resetKey={`${resetKeyBase}:groups:${(Array.isArray(st.inclusion_groups)
          ? st.inclusion_groups
          : []
        ).join("|")}`}
      />

      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
        <NumberInput
          label={t("cardDetails.lorebook.groupWeight", "Group Weight")}
          value={typeof st.group_weight === "number" ? st.group_weight : 100}
          onChange={(value) =>
            onUpdate((ent) =>
              setStEntryExt(ent, {
                group_weight: clampInt(value, {
                  min: 0,
                  max: 100000,
                  fallback: 100,
                }),
              })
            )
          }
          disabled={disabled}
          min={0}
          size="xs"
        />
        <Checkbox
          label={t("cardDetails.lorebook.prioritizeInclusion", "Prioritize Inclusion")}
          checked={Boolean(st.prioritize_inclusion)}
          onChange={(ev) =>
            onUpdate((ent) =>
              setStEntryExt(ent, {
                prioritize_inclusion: ev.currentTarget.checked || undefined,
              })
            )
          }
          disabled={disabled}
          size="xs"
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
        <NumberInput
          label={t("cardDetails.lorebook.sticky", "Sticky")}
          value={typeof st.sticky === "number" ? st.sticky : 0}
          onChange={(value) =>
            onUpdate((ent) =>
              setStEntryExt(ent, {
                sticky: clampInt(value, { min: 0, max: 100000, fallback: 0 }),
              })
            )
          }
          disabled={disabled}
          min={0}
          size="xs"
        />
        <NumberInput
          label={t("cardDetails.lorebook.cooldown", "Cooldown")}
          value={typeof st.cooldown === "number" ? st.cooldown : 0}
          onChange={(value) =>
            onUpdate((ent) =>
              setStEntryExt(ent, {
                cooldown: clampInt(value, { min: 0, max: 100000, fallback: 0 }),
              })
            )
          }
          disabled={disabled}
          min={0}
          size="xs"
        />
        <NumberInput
          label={t("cardDetails.lorebook.delay", "Delay")}
          value={typeof st.delay === "number" ? st.delay : 0}
          onChange={(value) =>
            onUpdate((ent) =>
              setStEntryExt(ent, {
                delay: clampInt(value, { min: 0, max: 100000, fallback: 0 }),
              })
            )
          }
          disabled={disabled}
          min={0}
          size="xs"
        />
      </SimpleGrid>

      <Group gap="xs" align="flex-end" wrap="wrap">
        <DeferredCommaListInput
          label={t(
            "cardDetails.lorebook.filterToCharactersOrTags",
            "Filter to Characters or Tags"
          )}
          placeholder={t(
            "cardDetails.lorebook.filterToCharactersOrTagsPlaceholder",
            "Tie this entry to specific characters or characters with specific tags"
          )}
          disabled={disabled}
          size="xs"
          values={charFilterValues}
          onCommit={(list) => {
            const next: StLorebookEntryExt["character_filter"] | undefined =
              list.length > 0 || charFilterExclude
                ? {
                    mode: charFilterExclude ? "exclude" : "include",
                    values: list.length > 0 ? list : undefined,
                  }
                : undefined;
            onUpdate((ent) => setStEntryExt(ent, { character_filter: next }));
          }}
          resetKey={`${resetKeyBase}:charfilter:${charFilterExclude ? 1 : 0}:${charFilterValues.join("|")}`}
        />

        <Checkbox
          label={t("cardDetails.lorebook.exclude", "Exclude")}
          checked={charFilterExclude}
          onChange={(ev) => {
            const nextExclude = ev.currentTarget.checked;
            const next: StLorebookEntryExt["character_filter"] | undefined =
              charFilterValues.length > 0 || nextExclude
                ? {
                    mode: nextExclude ? "exclude" : "include",
                    values: charFilterValues.length > 0 ? charFilterValues : undefined,
                  }
                : undefined;
            onUpdate((ent) => setStEntryExt(ent, { character_filter: next }));
          }}
          disabled={disabled}
          size="xs"
          mt={22}
        />
      </Group>

      <MultiSelect
        label={t(
          "cardDetails.lorebook.filterToGenerationTriggers",
          "Filter to Generation Triggers"
        )}
        data={triggerData}
        value={triggers}
        onChange={(values) => {
          const next = values
            .filter((v): v is StTriggerType => isTriggerType(v))
            .slice(0, 16);
          onUpdate((ent) =>
            setStEntryExt(ent, { triggers: next.length > 0 ? next : undefined })
          );
        }}
        disabled={disabled}
        size="xs"
        searchable
        clearable
        placeholder={t("cardDetails.lorebook.allTypesDefault", "All types (default)")}
      />

      <Accordion multiple defaultValue={[]} variant="contained">
        <Accordion.Item value="sources">
          <Accordion.Control>
            {t(
              "cardDetails.lorebook.additionalMatchingSources",
              "Additional Matching Sources"
            )}
          </Accordion.Control>
          <Accordion.Panel>
            <MultiSelect
              data={sourceData}
              value={sources}
              onChange={(values) => {
                const next = values
                  .filter((v): v is StAdditionalMatchingSource =>
                    isAdditionalSource(v)
                  )
                  .slice(0, 16);
                onUpdate((ent) =>
                  setStEntryExt(ent, {
                    additional_matching_sources:
                      next.length > 0 ? next : undefined,
                  })
                );
              }}
              disabled={disabled}
              size="xs"
              searchable
              clearable
            />
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}


