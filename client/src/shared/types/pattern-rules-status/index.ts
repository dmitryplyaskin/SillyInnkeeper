export type PatternRulesCacheStatus = "building" | "ready" | "failed";

export type PatternRulesLastReady = {
  rules_hash: string;
  created_at: number;
};

export type PatternRulesCurrentRun = {
  rules_hash: string;
  created_at: number;
  status: Exclude<PatternRulesCacheStatus, "ready">;
  error: string | null;
};

export interface PatternRulesStatus {
  hasRules: boolean;
  hasEnabledRules: boolean;
  lastReady: PatternRulesLastReady | null;
  current: PatternRulesCurrentRun | null;
}


