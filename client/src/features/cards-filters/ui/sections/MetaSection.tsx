import {
  Button,
  Checkbox,
  Divider,
  Group,
  MultiSelect,
  SimpleGrid,
  Text,
} from "@mantine/core";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import { InfoTip } from "../shared/InfoTip";
import {
  $filters,
  $filtersData,
  $patternRulesStatus,
  setCreators,
  setPatterns,
  setSpecVersions,
  setTags,
} from "../../model";
import { openPatternRulesModal } from "@/features/pattern-rules";
import { mergeOptions } from "../shared/mergeOptions";

const $creator = $filters.map((s) => s.creator);
const $specVersion = $filters.map((s) => s.spec_version);
const $tags = $filters.map((s) => s.tags);
const $patterns = $filters.map((s) => s.patterns);

export function MetaSection() {
  const { t } = useTranslation();
  const [
    creator,
    specVersion,
    tags,
    patterns,
    filtersData,
    patternRulesStatus,
    onOpenPatternRules,
    onSetCreators,
    onSetSpecVersions,
    onSetTags,
    onSetPatterns,
  ] = useUnit([
    $creator,
    $specVersion,
    $tags,
    $patterns,
    $filtersData,
    $patternRulesStatus,
    openPatternRulesModal,
    setCreators,
    setSpecVersions,
    setTags,
    setPatterns,
  ]);

  const creatorOptions = mergeOptions(creator, filtersData.creators);
  const specVersionOptions = mergeOptions(
    specVersion,
    filtersData.spec_versions
  );
  const tagOptions = mergeOptions(tags, filtersData.tags);

  const patternsEnabled = patterns === "1";
  const patternsAvailable =
    patternRulesStatus == null ? true : patternRulesStatus.hasEnabledRules;
  const patternsDisabled = !patternsAvailable;
  const patternsNeedsRun =
    patternsEnabled &&
    patternRulesStatus != null &&
    patternRulesStatus.lastReady == null;

  return (
    <>
      <Divider
        label={
          <Group gap={6}>
            <Text size="sm">{t("filters.meta")}</Text>
          </Group>
        }
      />

      <Group gap="xs" align="center" wrap="wrap">
        <Checkbox
          label={t("filters.patterns")}
          checked={patternsEnabled}
          disabled={patternsDisabled}
          onChange={(e) => onSetPatterns(e.currentTarget.checked ? "1" : "any")}
        />
        <InfoTip text={t("filters.patternsTip")} />
        <Button
          variant="subtle"
          size="xs"
          onClick={() => onOpenPatternRules()}
          aria-label={t("filters.openPatternRulesAria")}
        >
          {t("filters.openPatternRules")}
        </Button>
      </Group>

      <Text size="sm" c="dimmed">
        {patternsDisabled
          ? t("filters.patternsDisabled")
          : patternsNeedsRun
          ? t("filters.patternsNeedsRun")
          : t("filters.patternsHint")}
      </Text>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <MultiSelect
          label={t("filters.creator")}
          data={creatorOptions}
          value={creator}
          onChange={onSetCreators}
          searchable
          clearable
        />

        <MultiSelect
          label={t("filters.specVersion")}
          data={specVersionOptions}
          value={specVersion}
          onChange={onSetSpecVersions}
          searchable
          clearable
        />

        <MultiSelect
          label={
            <Group gap={6}>
              <Text size="sm">{t("filters.tags")}</Text>
              <InfoTip text={t("filters.tagsTip")} />
            </Group>
          }
          data={tagOptions}
          value={tags}
          onChange={onSetTags}
          searchable
          clearable
        />
      </SimpleGrid>
    </>
  );
}
