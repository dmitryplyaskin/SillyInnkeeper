# Character Card V3 (CCv3) — Condensed Spec (Implementation-Oriented)

CCv3 is a JSON object describing a character card (superset of Character Card V2 / TavernCardV2, with a few changes/additions).

Normative keywords use common RFC meaning: **MUST / MUST NOT / SHOULD / SHOULD NOT / MAY**.

## 1) Supported containers / embedding

### 1.1 PNG / APNG

- The CCv3 JSON **MUST** be stored in a `tEXt` chunk named `ccv3`.
- The chunk value **MUST** be: UTF-8 JSON string → base64.
- If both `chara` (V2) and `ccv3` exist, apps **SHOULD** use `ccv3`.
- (Legacy) PNG/APNG may also store extra embedded assets as `tEXt` chunks named `chara-ext-asset_:{path}` with base64 binary payload, addressable via `__asset:{path}`. New apps **SHOULD** prefer CHARX instead.

### 1.2 JSON file

- A `.json` export/import **MUST** be a `CharacterCardV3` object.

### 1.3 CHARX (zip)

- CHARX is a zip archive with a root file `card.json` containing the `CharacterCardV3` object.
- Embedded assets inside the zip are addressable via URI **`embeded://path/to/file`** (note: spelled `embeded://`, not `embedded://`).
- Paths are case-sensitive and use `/` separators.
- Zip entries **SHOULD NOT** be encrypted; file names **SHOULD** be ASCII-only for compatibility.

## 2) Core JSON model

### 2.1 CharacterCardV3 shape

```ts
interface CharacterCardV3 {
  spec: "chara_card_v3";
  spec_version: "3.0";
  data: {
    // From CCV2 / TavernCardV2
    name: string;
    description: string;
    tags: string[];
    creator: string;
    character_version: string;
    mes_example: string;
    extensions: Record<string, any>;
    system_prompt: string;
    post_history_instructions: string;
    first_mes: string;
    alternate_greetings: string[];
    personality: string;
    scenario: string;

    // Changed in CCV3
    creator_notes: string;
    character_book?: Lorebook;

    // New in CCV3
    assets?: Asset[];
    nickname?: string;
    creator_notes_multilingual?: Record<string, string>;
    source?: string[];
    group_only_greetings: string[];
    creation_date?: number;
    modification_date?: number;
  };
}

type Asset = {
  type: string;
  uri: string;
  name: string;
  ext: string;
};
```

### 2.2 Forward compatibility

- Importers **SHOULD** ignore unknown fields (do not reject) and **MAY** preserve them for re-export.
- Application-specific data **SHOULD** go into `data.extensions`.

### 2.3 Required identification

- `spec` **MUST** be exactly `'chara_card_v3'`.
- `spec_version` **MUST** be `'3.0'` for this spec, but importers **SHOULD NOT** reject other values.
  - Implementations commonly treat versions as float; if version > 3.0, warn user but still import.

### 2.4 Creator notes

- `creator_notes` **MUST** be a string.
- If `creator_notes_multilingual` exists:
  - It is a map `{ [iso639_1_language_code]: string }` (no region, e.g. `en`, `ja`).
  - UI **SHOULD** display the best-matching language.

### 2.5 Nickname

- `nickname` is an optional display/preferred character name that clients may use instead of `name`.

### 2.6 Source

- `source?: string[]` is an append-only-ish provenance list (IDs or HTTP/HTTPS URLs).
- UI **MAY** let users open URLs, but the field **SHOULD NOT** be edited manually.

### 2.7 Greetings

- `group_only_greetings` **MUST** exist and be an array (may be empty).
- It represents extra greetings used only in group chats.

### 2.8 Timestamps

- `creation_date` and `modification_date` are Unix timestamps in **seconds**, UTC.
- Apps **SHOULD** set `creation_date` on creation and not allow user edits.
- Apps **SHOULD** set/update `modification_date` on export (and may update on edits).
- Value `0` may be used to mean “unknown” (e.g., privacy).

## 3) Assets (condensed)

### 3.1 Meaning

`data.assets` is an optional list of assets associated with the card.

If `assets` is missing, apps **MUST** behave as if it contained one default main icon:

```ts
[{ type: "icon", uri: "ccdefault:", name: "main", ext: "png" }];
```

### 3.2 Asset fields

- `type`: determines how the asset is used (common: `icon`, `background`, `user_icon`, `emotion`).
- `uri`: where to load the asset from.
  - Apps **SHOULD** support at least: `ccdefault:` and `embeded://...`.
  - Apps **MAY** support `https://...` and `data:` (base64 data URLs). For security, apps **MAY** ignore non-HTTPS remote URLs.
- `name`: identifier within the `type`.
  - If `type === 'icon'` and `name === 'main'`, this is the main portrait.
  - If multiple `icon` assets exist, there **MUST** be exactly one `name: 'main'`.
  - If multiple `background` assets exist, there **MUST NOT** be more than one `name: 'main'`; if none, the first `background` may be treated as main.
- `ext`: lowercase file extension without dot (e.g. `png`, `webp`, `jpeg`), or `unknown`. If `uri === 'ccdefault:'`, `ext` may be ignored.

### 3.3 Robustness

If an asset is unsupported/unreachable, apps **MAY** ignore it for runtime usage but **SHOULD** preserve its metadata for re-export.

Custom asset types **SHOULD** start with `x_` to avoid conflicts.

## 4) Lorebook (V3)

Lorebook is an optional character-specific book stored in `data.character_book`.

### 4.1 Lorebook object

```ts
type Lorebook = {
  name?: string;
  description?: string;
  scan_depth?: number;
  token_budget?: number;
  recursive_scanning?: boolean;
  extensions: Record<string, any>;
  entries: LorebookEntry[];
};

type LorebookEntry = {
  keys: string[];
  content: string;
  extensions: Record<string, any>;
  enabled: boolean;
  insertion_order: number;
  case_sensitive?: boolean;

  // V3
  use_regex: boolean;

  // Required to implement in V3 import/export behavior
  constant?: boolean;

  // Optional / compatibility
  name?: string;
  priority?: number;
  id?: number | string;
  comment?: string;
  selective?: boolean;
  secondary_keys?: string[];
  position?: "before_char" | "after_char";
};
```

Optional standalone lorebook export format:

```ts
{ spec: 'lorebook_v3', data: Lorebook }
```

### 4.2 Matching rules (no decorators)

- `enabled === false` → entry **MUST NOT** activate.
- If `constant === true` → entry **MAY** be treated as always-active (implementation-defined), otherwise it activates by match.
- Match is based on `keys`:
  - If `use_regex === false`: match when any key appears in the scanned text.
  - If `use_regex === true`: treat `keys` as regex patterns; invalid regex → entry does not match.
  - `case_sensitive` controls matching case behavior (if undefined, implementation-defined).
- `scan_depth` (book-level) limits matching to the most recent N messages (if the environment has chat logs); otherwise may be ignored.
- `selective === true` with `secondary_keys`: entry should match only if a secondary key also appears.

### 4.3 Prompt insertion and budgeting

- When an entry matches, its `content` is added to the prompt **once** (do not duplicate on multiple hits).
- Empty `content` results in no insertion.
- Ordering: smaller `insertion_order` is inserted earlier (ties are implementation-defined).
- `token_budget` may be used to drop entries when total lorebook text exceeds budget.
  - If `priority` exists, lower priority may be dropped first; otherwise `insertion_order` may be used.

### 4.4 Forward compatibility

- Unknown fields in Lorebook/LorebookEntry **SHOULD** be ignored on import and **MAY** be preserved for re-export.
- App-specific data goes to `extensions`.
