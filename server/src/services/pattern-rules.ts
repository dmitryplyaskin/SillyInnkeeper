import { ensureDir, readFile, writeFile } from "fs-extra";
import { join } from "node:path";
import { AppError } from "../errors/app-error";

export type PatternRuleType = "regex";

export interface PatternRule {
  id: string;
  label?: string;
  type: PatternRuleType;
  pattern: string;
  enabled: boolean;
  flags: string;
  caseSensitive?: boolean; // legacy/compat (optional)
}

export interface PatternRulesFile {
  version: 1;
  rules: PatternRule[];
  updatedAt: number;
}

const PATTERN_RULES_FILE_PATH = join(
  process.cwd(),
  "data",
  "pattern-rules.json"
);

const DEFAULT_PATTERN_RULES: PatternRulesFile = {
  version: 1,
  rules: [],
  updatedAt: 0,
};

function normalizeFlags(
  raw: string,
  opts?: { caseSensitive?: boolean }
): string {
  const trimmed = raw.trim();

  // Backward compat: if caseSensitive === false and "i" not present, add it.
  const wantInsensitive = opts?.caseSensitive === false;
  const hasI = trimmed.includes("i");
  const base = wantInsensitive && !hasI ? `${trimmed}i` : trimmed;

  // Remove duplicates, keep order.
  const seen = new Set<string>();
  let out = "";
  for (const ch of base) {
    if (seen.has(ch)) continue;
    seen.add(ch);
    out += ch;
  }
  return out;
}

function validateRule(rule: PatternRule): void {
  const id = typeof rule.id === "string" ? rule.id.trim() : "";
  if (!id) {
    throw new AppError({
      status: 400,
      code: "api.pattern_rules.invalid_rules",
    });
  }
  if (rule.type !== "regex") {
    throw new AppError({
      status: 400,
      code: "api.pattern_rules.invalid_rules",
    });
  }

  const pattern = typeof rule.pattern === "string" ? rule.pattern : "";
  if (pattern.trim().length === 0) {
    throw new AppError({
      status: 400,
      code: "api.pattern_rules.invalid_rules",
    });
  }

  if (typeof rule.enabled !== "boolean") {
    throw new AppError({
      status: 400,
      code: "api.pattern_rules.invalid_rules",
    });
  }

  const flagsRaw = typeof rule.flags === "string" ? rule.flags : "";
  const flags = normalizeFlags(flagsRaw, { caseSensitive: rule.caseSensitive });

  // Node.js supported flags: d g i m s u v y (v: set notation, newer)
  // We allow a safe subset plus v when available.
  if (!/^[dgimsuvy]*$/.test(flags)) {
    throw new AppError({
      status: 400,
      code: "api.pattern_rules.invalid_rules",
    });
  }

  // Validate compilation (ReDoS risk is accepted in v1).
  // NOTE: If "v" is not supported by the runtime, compilation will throw and we'll surface 400.
  // eslint-disable-next-line no-new
  new RegExp(pattern, flags);
}

export function validatePatternRulesFile(
  value: unknown
): asserts value is PatternRulesFile {
  const obj = value as PatternRulesFile | null;
  if (!obj || typeof obj !== "object") {
    throw new AppError({
      status: 400,
      code: "api.pattern_rules.invalid_rules",
    });
  }
  if (obj.version !== 1) {
    throw new AppError({
      status: 400,
      code: "api.pattern_rules.invalid_rules",
    });
  }
  if (!Array.isArray(obj.rules)) {
    throw new AppError({
      status: 400,
      code: "api.pattern_rules.invalid_rules",
    });
  }

  for (const r of obj.rules) {
    validateRule(r as PatternRule);
  }
}

export async function getPatternRules(): Promise<PatternRulesFile> {
  try {
    const json = await readFile(PATTERN_RULES_FILE_PATH, "utf-8");
    const parsed = JSON.parse(json) as unknown;
    // If invalid, fall back to default (do not crash startup).
    try {
      validatePatternRulesFile(parsed);
      return parsed as PatternRulesFile;
    } catch {
      return DEFAULT_PATTERN_RULES;
    }
  } catch (e) {
    const err = e as NodeJS.ErrnoException | null;
    if (err?.code === "ENOENT") {
      await ensureDir(join(process.cwd(), "data"));
      await writeFile(
        PATTERN_RULES_FILE_PATH,
        JSON.stringify(DEFAULT_PATTERN_RULES, null, 2),
        "utf-8"
      );
      return DEFAULT_PATTERN_RULES;
    }
    throw e;
  }
}

export async function updatePatternRules(
  raw: unknown
): Promise<PatternRulesFile> {
  // Accept either:
  // - an array of rules
  // - an object { rules: [...] }
  const obj = raw as { rules?: unknown } | null;
  const rules = Array.isArray(raw)
    ? raw
    : Array.isArray(obj?.rules)
    ? obj?.rules
    : [];

  const normalizedRules: PatternRule[] = rules.map((r) => {
    const id = typeof r?.id === "string" ? r.id.trim() : "";
    const label = typeof r?.label === "string" ? r.label.trim() : undefined;
    const pattern = typeof r?.pattern === "string" ? r.pattern : "";
    const enabled = r?.enabled === true;
    const flagsRaw = typeof r?.flags === "string" ? r.flags : "";
    const flags = normalizeFlags(flagsRaw, {
      caseSensitive: (r as any)?.caseSensitive,
    });

    const out: PatternRule = {
      id,
      label: label && label.length > 0 ? label : undefined,
      type: "regex",
      pattern,
      enabled,
      flags,
    };

    // Preserve legacy field if present (optional)
    if (typeof (r as any)?.caseSensitive === "boolean") {
      out.caseSensitive = (r as any).caseSensitive;
    }

    validateRule(out);
    return out;
  });

  const next: PatternRulesFile = {
    version: 1,
    rules: normalizedRules,
    updatedAt: Date.now(),
  };

  await ensureDir(join(process.cwd(), "data"));
  await writeFile(
    PATTERN_RULES_FILE_PATH,
    JSON.stringify(next, null, 2),
    "utf-8"
  );
  return next;
}
