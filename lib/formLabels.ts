import type { T } from "@/lib/i18n";
import type { TournamentLabels } from "@/components/TournamentForm";

export function tournamentLabels(t: T, submit: string, footer = ""): TournamentLabels {
  const keys = [
    "basics", "name", "webAddress", "slugHelp", "date", "eventLogo", "uploadLogo", "removeLogo", "logoHelp",
    "gamesRotation", "numberOfGames", "rotation", "randomOnly", "randomSwiss", "swissAfter", "rotationHelp",
    "teams", "alsoTeams", "minPerTeam", "maxPerTeam", "timer", "useTimer", "minutesPerRound",
  ] as const;
  const out = Object.fromEntries(keys.map((k) => [k, t(k)])) as TournamentLabels;
  out.submit = submit;
  out.footer = footer;
  return out;
}
