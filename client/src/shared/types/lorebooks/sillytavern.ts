export type StStrategy = "constant" | "keyword" | "vector";

export type StOptionalLogic = "AND_ANY" | "AND_ALL" | "NOT_ANY" | "NOT_ALL";

export type StInsertionPosition =
  | "before_char_defs"
  | "after_char_defs"
  | "before_example_messages"
  | "after_example_messages"
  | "top_of_an"
  | "bottom_of_an"
  | "at_depth"
  | "outlet";

export type StAdditionalMatchingSource =
  | "character_description"
  | "character_personality"
  | "scenario"
  | "persona_description"
  | "character_note"
  | "creators_notes";

export type StTriggerType =
  | "normal"
  | "continue"
  | "impersonate"
  | "swipe"
  | "regenerate"
  | "quiet";

export interface StLorebookExt {
  // Global-ish defaults (mirrors ST Activation Settings / defaults)
  // We keep this flexible; apps may store more.
  scan_depth_default?: number;
  case_sensitive_default?: boolean;
  match_whole_words_default?: boolean;
  group_scoring_default?: boolean;
}

export interface StLorebookEntryExt {
  // UI-only title/memo is stored in CCv3 as entry.name, but ST keeps "memo" separately.
  memo?: string;

  // ST "Strategy" (blue/green/chain). CCv3 has "constant" and "enabled",
  // but we keep ST tri-state to preserve import/export fidelity.
  strategy?: StStrategy;

  // Optional filter / secondary keys logic (ST "Optional Filter" + logic)
  optional_filter?: string[];
  optional_logic?: StOptionalLogic;

  // Whole words / group scoring (ST can be global or per-entry)
  match_whole_words?: boolean;
  group_scoring?: boolean;

  // Probability (Trigger %)
  trigger_percent?: number;

  // Timed effects (messages)
  sticky?: number;
  cooldown?: number;
  delay?: number;

  // Inclusion groups
  inclusion_groups?: string[];
  group_weight?: number;
  prioritize_inclusion?: boolean;

  // Automation & filters
  automation_id?: string;
  character_filter?: { mode?: "include" | "exclude"; values?: string[] };
  triggers?: StTriggerType[];

  // Recursion controls (ST)
  non_recursable?: boolean;
  prevent_further_recursion?: boolean;
  delay_until_recursion?: boolean;
  recursion_level?: number;
  ignore_budget?: boolean;

  // Insertion position / depth (ST)
  insertion_position?: StInsertionPosition;
  depth?: number;
  role?: "system" | "user" | "assistant";
  outlet_name?: string;

  // Additional matching sources
  additional_matching_sources?: StAdditionalMatchingSource[];
}

export interface WithExtensions {
  extensions?: Record<string, unknown>;
}

export function getStExt(obj: WithExtensions | null | undefined): {
  lorebook?: StLorebookExt;
  entry?: StLorebookEntryExt;
} {
  const exts = obj?.extensions;
  if (!exts || typeof exts !== "object") return {};
  const st = (exts as any).sillytavern;
  if (!st || typeof st !== "object") return {};
  return st as any;
}

export function setStLorebookExt<T extends WithExtensions>(
  obj: T,
  ext: StLorebookExt
): T {
  const baseExt =
    obj.extensions && typeof obj.extensions === "object" ? obj.extensions : {};
  const st = (baseExt as any).sillytavern;
  const nextSt = {
    ...(st && typeof st === "object" ? st : {}),
    lorebook: { ...(st?.lorebook ?? {}), ...ext },
  };
  return { ...(obj as any), extensions: { ...baseExt, sillytavern: nextSt } };
}

export function setStEntryExt<T extends WithExtensions>(
  obj: T,
  ext: StLorebookEntryExt
): T {
  const baseExt =
    obj.extensions && typeof obj.extensions === "object" ? obj.extensions : {};
  const st = (baseExt as any).sillytavern;
  const nextSt = {
    ...(st && typeof st === "object" ? st : {}),
    entry: { ...(st?.entry ?? {}), ...ext },
  };
  return { ...(obj as any), extensions: { ...baseExt, sillytavern: nextSt } };
}

export function clampInt(
  value: unknown,
  opts?: { min?: number; max?: number; fallback?: number }
): number {
  const min = opts?.min ?? Number.NEGATIVE_INFINITY;
  const max = opts?.max ?? Number.POSITIVE_INFINITY;
  const fallback = opts?.fallback ?? 0;
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
      ? Number(value)
      : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}
