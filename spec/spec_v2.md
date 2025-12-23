# Character Card V2 — Condensed Spec (Implementation-Oriented)

This document defines Character Card V2 (TavernCardV2). V2 adds metadata and a character lorebook on top of V1, and nests V1 fields under `data`.

Normative keywords use common RFC meaning: **MUST / MUST NOT / SHOULD / SHOULD NOT / MAY**.

## 1) Containers / embedding

V2 uses the same container/embedding approaches as V1; the embedded JSON payload is a `TavernCardV2` object.

## 2) Data model

### 2.1 TavernCardV2

```ts
type TavernCardV2 = {
  spec: "chara_card_v2";
  spec_version: "2.0";
  data: {
    // V1 fields (same semantics as V1, but nested)
    name: string;
    description: string;
    personality: string;
    scenario: string;
    first_mes: string;
    mes_example: string;

    // V2 additions
    creator_notes: string;
    system_prompt: string;
    post_history_instructions: string;
    alternate_greetings: string[];
    character_book?: CharacterBook;

    tags: string[];
    creator: string;
    character_version: string;
    extensions: Record<string, any>;
  };
};
```

### 2.2 Identification

- `spec` **MUST** be exactly `"chara_card_v2"`.
- `spec_version` **MUST** be exactly `"2.0"`.

### 2.3 V1 field semantics

- All V1 fields follow the V1 spec, except they live under `data`.

## 3) New field rules

### 3.1 `creator_notes`

- **MUST NOT** be used in prompt engineering.
- **SHOULD** be highly discoverable in UI.

### 3.2 `system_prompt`

- Default behavior **MUST** replace the frontend’s global “system prompt” with `data.system_prompt`.
- Exception: if `data.system_prompt === ""`, use the user/global system prompt (or internal fallback).
- Frontends **MUST** support placeholder `{{original}}` inside `data.system_prompt`, replacing it with the system prompt that would have been used without the character override.
- Frontends **MAY** offer UI to supplement/replace it, but it **MUST NOT** be the default behavior.

### 3.3 `post_history_instructions`

- Default behavior **MUST** replace the frontend’s “ujb/jailbreak” setting with `data.post_history_instructions`.
- Exception: if `data.post_history_instructions === ""`, use the user/global value (or internal fallback).
- Frontends **MUST** support placeholder `{{original}}` inside `data.post_history_instructions`, replacing it with the value that would have been used without the character override.
- Frontends **MAY** offer UI to supplement/replace it, but it **MUST NOT** be the default behavior.

### 3.4 `alternate_greetings`

- Array of strings.
- Frontends **MUST** expose greeting “swipes” on first messages using these values.

### 3.5 `tags`, `creator`, `character_version`

- These fields **MUST NOT** be used for prompt engineering.
- They **MAY** be used for UI display and sorting/filtering.

### 3.6 `extensions`

- `extensions` **MUST** default to `{}`.
- It **MAY** contain arbitrary JSON.
- Import/export **MUST NOT** destroy unknown key-value pairs.
- Applications **SHOULD** namespace their keys to avoid conflicts.

## 4) Character book (lorebook)

```ts
type CharacterBook = {
  name?: string;
  description?: string;
  scan_depth?: number;
  token_budget?: number;
  recursive_scanning?: boolean;
  extensions: Record<string, any>;
  entries: Array<{
    keys: string[];
    content: string;
    extensions: Record<string, any>;
    enabled: boolean;
    insertion_order: number;
    case_sensitive?: boolean;

    // Optional / compatibility
    name?: string;
    priority?: number;
    id?: number;
    comment?: string;
    selective?: boolean;
    secondary_keys?: string[];
    constant?: boolean;
    position?: "before_char" | "after_char";
  }>;
};
```

Rules:

- Frontends **MUST** use the character book by default if present.
- Character editors **MUST** save it in this format.
- Character book **SHOULD** stack with user/global lorebooks/world info; character book **SHOULD** take precedence.
- Optional properties MAY be unsupported by editors/frontends, but they **MUST** be preserved on round-trip if already present.
