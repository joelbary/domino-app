import type { T, TKey } from "@/lib/i18n";

const KEYS: TKey[] = ["rulesText", "rulesPlaceholder", "rulesTextHelp", "rulesFile", "rulesFileHelp", "currentFile", "removeFile", "save"];
export function rulesLabels(t: T): Record<string, string> {
  return Object.fromEntries(KEYS.map((k) => [k, t(k)]));
}
