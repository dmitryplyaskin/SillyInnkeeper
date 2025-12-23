import {
  Accordion,
  Checkbox,
  Group,
  MultiSelect,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { LorebookEntry } from "@/shared/types/lorebooks";
import type {
  StAdditionalMatchingSource,
  StLorebookEntryExt,
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

function isTriggerType(v: string): v is StTriggerType {
  return (TRIGGER_VALUES as readonly string[]).includes(v);
}

function isAdditionalSource(v: string): v is StAdditionalMatchingSource {
  return (SOURCE_VALUES as readonly string[]).includes(v);
}

export function EntryAdvancedAccordion({
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
      {
        value: "normal",
        label: t("cardDetails.lorebook.triggerNormal", "Normal"),
      },
      {
        value: "continue",
        label: t("cardDetails.lorebook.triggerContinue", "Continue"),
      },
      {
        value: "swipe",
        label: t("cardDetails.lorebook.triggerSwipe", "Swipe"),
      },
      {
        value: "quiet",
        label: t("cardDetails.lorebook.triggerQuiet", "Quiet"),
      },
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

  return (
    <Accordion multiple defaultValue={[]} variant="contained">
      <Accordion.Item value="advanced">
        <Accordion.Control>
          {t("cardDetails.lorebook.advanced", "Advanced")}
        </Accordion.Control>
        <Accordion.Panel>
          <Stack gap="sm">
            <Text size="xs" c="dimmed">
              {t(
                "cardDetails.lorebook.advancedHint",
                "Rare SillyTavern-specific options"
              )}
            </Text>

            <Accordion multiple defaultValue={[]} variant="separated">
              <Accordion.Item value="optionalFilter">
                <Accordion.Control>
                  {t(
                    "cardDetails.lorebook.sectionOptionalFilter",
                    "Optional Filter"
                  )}
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs">
                    <DeferredCommaListInput
                      label={t(
                        "cardDetails.lorebook.optionalFilter",
                        "Optional Filter"
                      )}
                      placeholder={t(
                        "cardDetails.lorebook.keysPlaceholder",
                        "Comma separated list"
                      )}
                      disabled={disabled || entry.use_regex}
                      values={
                        Array.isArray(st.optional_filter)
                          ? st.optional_filter
                          : []
                      }
                      onCommit={(list) =>
                        onUpdate((ent) =>
                          setStEntryExt(ent, {
                            optional_filter: list.length > 0 ? list : undefined,
                          })
                        )
                      }
                      resetKey={`${resetKeyBase}:opt:${(Array.isArray(
                        st.optional_filter
                      )
                        ? st.optional_filter
                        : []
                      ).join("|")}`}
                    />

                    <Select
                      label={t("cardDetails.lorebook.optionalLogic", "Logic")}
                      value={
                        typeof st.optional_logic === "string"
                          ? st.optional_logic
                          : "AND_ANY"
                      }
                      onChange={(value) => {
                        const v =
                          value === "AND_ANY" ||
                          value === "AND_ALL" ||
                          value === "NOT_ANY" ||
                          value === "NOT_ALL"
                            ? value
                            : "AND_ANY";
                        onUpdate((ent) =>
                          setStEntryExt(ent, { optional_logic: v })
                        );
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
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="matching">
                <Accordion.Control>
                  {t("cardDetails.lorebook.sectionMatching", "Matching")}
                </Accordion.Control>
                <Accordion.Panel>
                  <Group gap="md" wrap="wrap">
                    <Checkbox
                      label={t(
                        "cardDetails.lorebook.wholeWords",
                        "Whole Words"
                      )}
                      checked={Boolean(st.match_whole_words)}
                      onChange={(ev) =>
                        onUpdate((ent) =>
                          setStEntryExt(ent, {
                            match_whole_words:
                              ev.currentTarget.checked || undefined,
                          })
                        )
                      }
                      disabled={disabled}
                      size="xs"
                    />
                    <Checkbox
                      label={t(
                        "cardDetails.lorebook.groupScoring",
                        "Group Scoring"
                      )}
                      checked={Boolean(st.group_scoring)}
                      onChange={(ev) =>
                        onUpdate((ent) =>
                          setStEntryExt(ent, {
                            group_scoring:
                              ev.currentTarget.checked || undefined,
                          })
                        )
                      }
                      disabled={disabled}
                      size="xs"
                    />
                  </Group>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="recursion">
                <Accordion.Control>
                  {t("cardDetails.lorebook.sectionRecursion", "Recursion")}
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs">
                    <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
                      <Checkbox
                        label={t(
                          "cardDetails.lorebook.nonRecursable",
                          "Non-recursable"
                        )}
                        checked={Boolean(st.non_recursable)}
                        onChange={(ev) =>
                          onUpdate((ent) =>
                            setStEntryExt(ent, {
                              non_recursable:
                                ev.currentTarget.checked || undefined,
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
                              prevent_further_recursion:
                                ev.currentTarget.checked || undefined,
                            })
                          )
                        }
                        disabled={disabled}
                        size="xs"
                      />
                      <Checkbox
                        label={t(
                          "cardDetails.lorebook.delayUntilRecursion",
                          "Delay until recursion"
                        )}
                        checked={Boolean(st.delay_until_recursion)}
                        onChange={(ev) =>
                          onUpdate((ent) =>
                            setStEntryExt(ent, {
                              delay_until_recursion:
                                ev.currentTarget.checked || undefined,
                            })
                          )
                        }
                        disabled={disabled}
                        size="xs"
                      />
                      <Checkbox
                        label={t(
                          "cardDetails.lorebook.ignoreBudget",
                          "Ignore budget"
                        )}
                        checked={Boolean(st.ignore_budget)}
                        onChange={(ev) =>
                          onUpdate((ent) =>
                            setStEntryExt(ent, {
                              ignore_budget:
                                ev.currentTarget.checked || undefined,
                            })
                          )
                        }
                        disabled={disabled}
                        size="xs"
                      />
                      <NumberInput
                        label={t(
                          "cardDetails.lorebook.recursionLevel",
                          "Recursion Level"
                        )}
                        value={
                          typeof st.recursion_level === "number"
                            ? st.recursion_level
                            : 0
                        }
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
                        disabled={
                          disabled || !Boolean(st.delay_until_recursion)
                        }
                        min={0}
                        size="xs"
                      />
                    </SimpleGrid>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="inclusion">
                <Accordion.Control>
                  {t(
                    "cardDetails.lorebook.sectionInclusion",
                    "Inclusion / groups"
                  )}
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs">
                    <DeferredCommaListInput
                      label={t(
                        "cardDetails.lorebook.inclusionGroup",
                        "Inclusion Group"
                      )}
                      placeholder={t(
                        "cardDetails.lorebook.keysPlaceholder",
                        "Comma separated list"
                      )}
                      disabled={disabled}
                      values={
                        Array.isArray(st.inclusion_groups)
                          ? st.inclusion_groups
                          : []
                      }
                      onCommit={(list) =>
                        onUpdate((ent) =>
                          setStEntryExt(ent, {
                            inclusion_groups:
                              list.length > 0 ? list : undefined,
                          })
                        )
                      }
                      resetKey={`${resetKeyBase}:groups:${(Array.isArray(
                        st.inclusion_groups
                      )
                        ? st.inclusion_groups
                        : []
                      ).join("|")}`}
                    />

                    <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
                      <NumberInput
                        label={t(
                          "cardDetails.lorebook.groupWeight",
                          "Group Weight"
                        )}
                        value={
                          typeof st.group_weight === "number"
                            ? st.group_weight
                            : 100
                        }
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
                        label={t(
                          "cardDetails.lorebook.prioritizeInclusion",
                          "Prioritize Inclusion"
                        )}
                        checked={Boolean(st.prioritize_inclusion)}
                        onChange={(ev) =>
                          onUpdate((ent) =>
                            setStEntryExt(ent, {
                              prioritize_inclusion:
                                ev.currentTarget.checked || undefined,
                            })
                          )
                        }
                        disabled={disabled}
                        size="xs"
                      />
                    </SimpleGrid>
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="timing">
                <Accordion.Control>
                  {t("cardDetails.lorebook.sectionTiming", "Timing")}
                </Accordion.Control>
                <Accordion.Panel>
                  <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
                    <NumberInput
                      label={t("cardDetails.lorebook.sticky", "Sticky")}
                      value={typeof st.sticky === "number" ? st.sticky : 0}
                      onChange={(value) =>
                        onUpdate((ent) =>
                          setStEntryExt(ent, {
                            sticky: clampInt(value, {
                              min: 0,
                              max: 100000,
                              fallback: 0,
                            }),
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
                            cooldown: clampInt(value, {
                              min: 0,
                              max: 100000,
                              fallback: 0,
                            }),
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
                            delay: clampInt(value, {
                              min: 0,
                              max: 100000,
                              fallback: 0,
                            }),
                          })
                        )
                      }
                      disabled={disabled}
                      min={0}
                      size="xs"
                    />
                  </SimpleGrid>
                </Accordion.Panel>
              </Accordion.Item>

              <Accordion.Item value="triggers">
                <Accordion.Control>
                  {t("cardDetails.lorebook.sectionTriggers", "Triggers")}
                </Accordion.Control>
                <Accordion.Panel>
                  <MultiSelect
                    label={t("cardDetails.lorebook.triggers", "Triggers")}
                    data={triggerData}
                    value={triggers}
                    onChange={(values) => {
                      const next = values
                        .filter((v): v is StTriggerType => isTriggerType(v))
                        .slice(0, 16);
                      onUpdate((ent) =>
                        setStEntryExt(ent, {
                          triggers: next.length > 0 ? next : undefined,
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

              <Accordion.Item value="sources">
                <Accordion.Control>
                  {t(
                    "cardDetails.lorebook.sectionAdditionalSources",
                    "Additional matching sources"
                  )}
                </Accordion.Control>
                <Accordion.Panel>
                  <MultiSelect
                    label={t(
                      "cardDetails.lorebook.additionalMatchingSources",
                      "Additional Matching Sources"
                    )}
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

              <Accordion.Item value="automation">
                <Accordion.Control>
                  {t("cardDetails.lorebook.sectionAutomation", "Automation")}
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="xs">
                    <TextInput
                      label={t(
                        "cardDetails.lorebook.automationId",
                        "Automation ID"
                      )}
                      value={
                        typeof st.automation_id === "string"
                          ? st.automation_id
                          : ""
                      }
                      onChange={(ev) =>
                        onUpdate((ent) =>
                          setStEntryExt(ent, {
                            automation_id:
                              ev.currentTarget.value.trim() || undefined,
                          })
                        )
                      }
                      disabled={disabled}
                      size="xs"
                    />

                    <Textarea
                      label={t("cardDetails.lorebook.comment", "Comment")}
                      value={entry.comment ?? ""}
                      onChange={(ev) =>
                        onUpdate((ent) => ({
                          ...ent,
                          comment: ev.currentTarget.value.trim() || undefined,
                        }))
                      }
                      disabled={disabled}
                      minRows={2}
                      autosize
                      size="xs"
                      placeholder={t(
                        "cardDetails.lorebook.optional",
                        "Optional"
                      )}
                    />
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
