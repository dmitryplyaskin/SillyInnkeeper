import type { PatternRulesFile } from "@/shared/types/pattern-rules";
import type { PatternRulesStatus } from "@/shared/types/pattern-rules-status";
import i18n from "@/shared/i18n/i18n";

async function readErrorTextSafe(response: Response): Promise<string> {
  const text = (await response.text().catch(() => "")).trim();
  return text;
}

export async function getPatternRules(): Promise<PatternRulesFile> {
  const response = await fetch("/api/pattern-rules");
  if (!response.ok) {
    const errorText = await readErrorTextSafe(response);
    if (errorText) throw new Error(errorText);
    throw new Error(`${i18n.t("errors.loadPatternRules")}: ${response.statusText}`);
  }
  return response.json();
}

export async function putPatternRules(file: PatternRulesFile): Promise<PatternRulesFile> {
  const response = await fetch("/api/pattern-rules", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(file),
  });
  if (!response.ok) {
    const errorText = await readErrorTextSafe(response);
    if (errorText) throw new Error(errorText);
    throw new Error(`${i18n.t("errors.savePatternRules")}: ${response.statusText}`);
  }
  return response.json();
}

export async function getPatternRulesStatus(): Promise<PatternRulesStatus> {
  const response = await fetch("/api/pattern-rules/status");
  if (!response.ok) {
    const errorText = await readErrorTextSafe(response);
    if (errorText) throw new Error(errorText);
    throw new Error(
      `${i18n.t("errors.loadPatternRulesStatus")}: ${response.statusText}`
    );
  }
  return response.json();
}

export async function runPatternRules(): Promise<{ run_id: string; rules_hash: string }> {
  const response = await fetch("/api/pattern-rules/run", { method: "POST" });
  if (!response.ok) {
    const errorText = await readErrorTextSafe(response);
    if (errorText) throw new Error(errorText);
    throw new Error(`${i18n.t("errors.runPatternRules")}: ${response.statusText}`);
  }
  return response.json();
}


