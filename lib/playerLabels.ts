import type { T, TKey } from "@/lib/i18n";

const KEYS: TKey[] = [
  "firstName", "lastName", "phone", "phoneHelp", "team", "noTeam", "newTeamName", "add", "save", "replace", "replaceHelp",
  "uploadHelp", "downloadTemplate", "chooseFile", "upload", "searchPlayers", "noPlayers", "noPhone", "fileHad", "phoneHelpEdit",
];

export function playerLabels(t: T): Record<string, string> {
  return Object.fromEntries(KEYS.map((k) => [k, t(k)]));
}
