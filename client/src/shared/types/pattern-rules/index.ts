export type PatternRuleType = "regex";

export interface PatternRule {
  id: string;
  label?: string;
  type: PatternRuleType;
  pattern: string;
  enabled: boolean;
  flags: string;
}

export interface PatternRulesFile {
  version: 1;
  rules: PatternRule[];
  updatedAt: number;
}


