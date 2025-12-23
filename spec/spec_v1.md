# Character Card V1 — Condensed Spec (Implementation-Oriented)

This document defines the minimal Character Card V1 format (aka TavernCard V1).

Normative keywords use common RFC meaning: **MUST / MUST NOT / SHOULD / SHOULD NOT / MAY**.

## 1) Containers / embedding

- **JSON**: a `.json` file MAY contain the raw V1 object (discouraged UX-wise).
- **PNG/APNG**: the V1 JSON string is stored base64-encoded in the image metadata field **"Chara"**.
- **WEBP**: not specified.

## 2) Data model

```ts
type TavernCardV1 = {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
};
```

### 2.1 Required fields and defaults

- All fields are **mandatory**.
- On missing data, fields **MUST** default to the empty string (`""`) (not `null`, not absent).

## 3) Placeholder replacement (prompt-time)

In prompts sent to the AI, the following fields **MUST** perform placeholder replacement using **case-insensitive** search:

- Fields: `description`, `personality`, `scenario`, `first_mes`, `mes_example`.
- Replacements:
  - `{{char}}` or `<BOT>` → card `name`.
  - `{{user}}` or `<USER>` → application’s current user display name.

A default user display name **MUST** exist.

Whether `{{user}}` / `<USER>` should be replaced inside the `name` field is **UNSPECIFIED**.

## 4) Conversation start / greetings

- The chatbot **MUST** send the first message.
- That first message **MUST** be exactly `first_mes`.

## 5) Example messages (`mes_example`)

- `mes_example` is free-form text commonly formatted as multiple blocks separated by `<START>` markers.
- `<START>` marks a new example conversation and **MAY** be transformed into an internal representation (implementation-defined).
- Example messages **SHOULD** be included in the prompt only until real chat history fills the context window; then they **SHOULD** be pruned to make room. This behavior **MAY** be user-configurable.
