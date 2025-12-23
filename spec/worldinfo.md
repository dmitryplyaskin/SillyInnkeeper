# World Info (Lorebooks) — Condensed Spec (Implementation-Oriented)

World Info (WI) is a rules-driven system for conditionally inserting entry `content` into the final prompt based on matches against recent chat context and other optional sources.

Normative keywords use common RFC meaning: **MUST / MUST NOT / SHOULD / SHOULD NOT / MAY**.

## 1) Concepts

- **World Info file**: a collection of entries + global activation settings.
- **Entry**: (keys + conditions) → when active, insert its `content` into the prompt at a chosen position.
- **Scan buffer**: the text WI matches against (usually last N chat messages, optionally with speaker name prefixes).
- **Recursion**: active entries can trigger more entries by making their keywords appear in the scan buffer.
- **Budgeting**: a token budget can limit how many active entries are ultimately inserted.

## 2) Data model (recommended)

The original ST UI exposes many per-entry and global knobs. Implementations MAY store a superset, but the following structure is a practical baseline.

```ts
type WorldInfo = {
  entries: WorldInfoEntry[];
  settings?: ActivationSettings;
};

type ActivationSettings = {
  scanDepth?: number; // messages
  includeNames?: boolean; // prefix each message as "Name: ..."
  budgetTokens?: number; // or contextPercent; implementation-defined
  recursiveScanning?: boolean;

  // Recursion controls (mutually exclusive modes)
  maxRecursionSteps?: number; // 0 = unlimited (budget-limited)
  minActivations?: number; // forces deeper scanning until N entries activated
  maxDepth?: number; // maximum depth when using minActivations

  caseSensitiveKeys?: boolean;
  matchWholeWords?: boolean;
};

type WorldInfoEntry = {
  enabled: boolean;

  // Primary triggers
  keys: string[]; // plaintext or JS-regex literal strings like "/.../i"
  strategy?: "constant" | "keyword" | "vector";

  // Additional filter keys (optional)
  filter?: {
    logic: "AND_ANY" | "AND_ALL" | "NOT_ANY" | "NOT_ALL";
    keys: string[]; // same key syntax as `keys`
  };

  content: string;

  // Prompt placement
  order: number; // smaller = inserted earlier, larger = later/closer to end
  position:
    | "before_char_defs"
    | "after_char_defs"
    | "before_example_messages"
    | "after_example_messages"
    | "top_of_an"
    | "bottom_of_an"
    | { atDepth: number; role?: "system" | "user" | "assistant" }
    | { outlet: string }; // manual insertion by macro

  // Optional metadata (not inserted)
  title?: string;

  // Probabilistic gating
  probability?: number; // 0..100 (0 disables insertion)

  // Inclusion groups
  groups?: Array<{ name: string; weight?: number }>;
  prioritizeInclusion?: boolean;
  useGroupScoring?: boolean;

  // Filters / scope
  characterFilter?: {
    mode?: "include" | "exclude";
    names?: string[];
    tags?: string[];
  };
  triggers?: Array<
    "normal" | "continue" | "impersonate" | "swipe" | "regenerate" | "quiet"
  >;
  additionalMatchingSources?: Array<
    | "character_description"
    | "character_personality"
    | "scenario"
    | "persona_description"
    | "character_note"
    | "creators_notes"
  >;

  // Timed effects (stateful per chat)
  timed?: { sticky?: number; cooldown?: number; delay?: number };

  // Per-entry overrides (optional)
  scanDepth?: number;
  caseSensitive?: boolean;
  matchWholeWords?: boolean;

  // Automation
  automationId?: string;

  // Recursion behavior
  recursion?: {
    nonRecursable?: boolean;
    preventFurtherRecursion?: boolean;
    delayUntilRecursion?: boolean;
    recursionLevel?: number;
  };
};
```

## 3) Key matching

### 3.1 Key syntax

- A key MAY be:
  - **Plaintext**: matched as a substring (subject to whole-word/case rules).
  - **Regex literal**: JavaScript-style regex string with `/` delimiters and flags, e.g. `/(?:foo|bar)\s+baz/i`.
- If a key is intended as regex but fails to compile, it MUST be treated as **non-matching**.

### 3.2 Case sensitivity and whole-word behavior

- By default, keys are case-insensitive; this is configurable globally and MAY be overridden per entry.
- If `matchWholeWords` is enabled:
  - single-word keys SHOULD only match whole words.
  - multi-word keys MAY still be matched as substrings (implementation-defined).

### 3.3 Scan buffer construction

- The engine SHOULD build a scan buffer from the most recent `scanDepth` chat messages.
- If `includeNames` is true, each message SHOULD be prefixed with the speaker name (e.g. `Alice: ...`).
- If the environment cannot provide chat logs, implementations MAY ignore `scanDepth` and fall back to best-effort matching.

### 3.4 Additional matching sources

If configured globally/per entry, key matching MAY also scan selected sources like character description/persona notes etc.

## 4) Entry activation pipeline (recommended order)

An entry is considered **active** if it passes all applicable checks:

1. **Enabled**: `enabled === false` → MUST NOT activate.
2. **Delay** (timed): if `timed.delay = N`, entry MUST NOT activate unless the chat has at least N messages at evaluation time.
3. **Trigger type**: if `triggers` is set, activation is allowed only for listed generation types.
4. **Character filter**: include/exclude by character name/tag as configured.
5. **Primary trigger**:
   - `strategy === 'constant'`: treat as triggered without key match.
   - `strategy === 'keyword'` (default): require at least one `keys` match.
   - `strategy === 'vector'`: allow activation by similarity retrieval (see §7).
6. **Optional filter** (secondary keys): apply `filter.logic` against `filter.keys` in the scan buffer.
7. **Probability**: if `probability` is set, the engine MAY drop the entry with probability (100 = always keep, 0 = never).
8. **Cooldown** (timed): if entry is on cooldown, MUST NOT activate.

## 5) Recursion

If recursion is enabled:

- The engine MAY perform multiple scan passes.
- On each pass, newly activated entries MAY contribute their `content` to the effective scan text, allowing other entries to activate.
- Entry recursion flags:
  - `nonRecursable`: entry cannot be activated by recursion.
  - `preventFurtherRecursion`: when this entry activates, it must not trigger others.
  - `delayUntilRecursion`: entry only eligible during recursive passes.
  - `recursionLevel`: recursive eligibility may be staged by levels (lowest level first).

Global limits:

- `maxRecursionSteps` and `minActivations` are mutually exclusive modes.
  - If `maxRecursionSteps = 1`, recursion is effectively disabled (single initial scan).
  - If `maxRecursionSteps = 0`, recursion is limited only by budget.
  - If `minActivations = N > 0`, the engine MAY scan deeper than `scanDepth` (up to `maxDepth`) until at least N entries activate (still budget-limited).

## 6) Inclusion groups

When multiple entries in the same inclusion group activate simultaneously:

- Normally, only ONE entry per group is inserted.
- Selection:
  - If `useGroupScoring` is enabled, entries with the highest number of matched keys win; ties proceed to the next rule.
  - If `prioritizeInclusion` is enabled, choose deterministically by highest `order`.
  - Otherwise, choose randomly using `weight` (default 100) as probability mass.
- An entry may belong to multiple groups; activating it may suppress other entries sharing any of those groups.

## 7) Vector (similarity) matching (optional)

If vector matching is supported:

- Vector retrieval only replaces keyword presence checks; all other gates still apply (filters, triggers, probability, groups, etc.).
- The engine SHOULD limit retrieved candidates (e.g. `maxEntries`).
- Vector matching MAY use a different text window than `scanDepth` (implementation-defined, e.g. “query messages”).

## 8) Budgeting and insertion

### 8.1 Token budget

If a global token budget is used:

- Constant entries SHOULD be considered first.
- Entries directly triggered by chat text SHOULD have higher priority than entries triggered only via recursion.
- When budget is exhausted, additional entries MUST NOT be inserted.

### 8.2 Insertion ordering

- `order` controls relative placement: smaller order → earlier, larger order → later/closer to end.
- Entries MAY be additionally grouped by insertion position.

### 8.3 Insertion positions

Implementations MAY support a subset, but common positions are:

- before/after character definitions
- before/after example messages
- top/bottom of Author’s Note
- at a specific depth with a role (system/user/assistant)
- outlet (manual placement)

### 8.4 Outlets (manual placement)

If `position` is `{ outlet: name }`:

- The entry MUST NOT be injected automatically.
- The prompt builder MAY insert it where `{{outlet::Name}}` appears, replacing the macro with concatenated `content` of all entries sharing that outlet, sorted by `order` and separated by newlines.
- Outlet names SHOULD be treated as case-sensitive.
- Placing outlet macros inside WI entries SHOULD be disallowed to avoid evaluation-order loops.

## 9) Timed effects (optional)

Timed effects are stateful per chat:

- **Sticky**: once activated, remains active for N messages; while sticky, it SHOULD ignore probability gating.
- **Cooldown**: cannot activate for N messages after activation (or after sticky ends).
- **Delay**: cannot activate unless there are at least N messages in chat at evaluation time.

Making changes to an entry that is currently under timed effect SHOULD clear the effect state.

---

## Appendix A) SillyInnkeeper ↔ SillyTavern storage mapping (practical)

SillyInnkeeper edits **SillyTavern lorebooks** as stored inside CCv3 `character_book`.
Some fields are stored directly on entries (CCv3), and many ST-specific knobs are preserved under `extensions.sillytavern`.

### A.1 Entry-level mapping

- **strategy** → `entry.extensions.sillytavern.entry.strategy` (`"keyword" | "constant" | "vector"`)
- **position** → `entry.extensions.sillytavern.entry.insertion_position`
  - **atDepth** → `entry.extensions.sillytavern.entry.depth`
  - **role** → `entry.extensions.sillytavern.entry.role`
  - **outlet** → `entry.extensions.sillytavern.entry.outlet_name`
- **probability** → `entry.extensions.sillytavern.entry.trigger_percent`
- **filter.logic** → `entry.extensions.sillytavern.entry.optional_logic`
- **filter.keys** → `entry.extensions.sillytavern.entry.optional_filter`
- **matchWholeWords** → `entry.extensions.sillytavern.entry.match_whole_words`
- **useGroupScoring** → `entry.extensions.sillytavern.entry.group_scoring`
- **groups** → `entry.extensions.sillytavern.entry.inclusion_groups`
  - **groupWeight** → `entry.extensions.sillytavern.entry.group_weight`
  - **prioritizeInclusion** → `entry.extensions.sillytavern.entry.prioritize_inclusion`
- **characterFilter** → `entry.extensions.sillytavern.entry.character_filter` (`{ mode, values }`)
- **triggers** → `entry.extensions.sillytavern.entry.triggers`
- **additionalMatchingSources** → `entry.extensions.sillytavern.entry.additional_matching_sources`
- **recursion** flags → `entry.extensions.sillytavern.entry.{non_recursable, prevent_further_recursion, delay_until_recursion, recursion_level, ignore_budget}`
- **timed** → `entry.extensions.sillytavern.entry.{sticky, cooldown, delay}`

### A.2 Lorebook-level (global defaults)

- `settings.caseSensitiveKeys` → `lorebook.extensions.sillytavern.lorebook.case_sensitive_default`
- `settings.matchWholeWords` → `lorebook.extensions.sillytavern.lorebook.match_whole_words_default`
- `settings.useGroupScoring` → `lorebook.extensions.sillytavern.lorebook.group_scoring_default`
- `settings.scanDepth` (ST default) → `lorebook.extensions.sillytavern.lorebook.scan_depth_default`
