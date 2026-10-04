import "server-only";
import type { LoadedRound } from "@/lib/schedule";

type Tour = { gamesCount: number; resultsPublished: boolean };

// What players may see: during the final round, standings stop at the previous round; after the
// final round, everything is hidden until the organizer publishes the results.
export function standingsVisibility(tour: Tour, rounds: LoadedRound[]) {
  const last = tour.gamesCount;
  const lastRound = rounds.find((r) => r.number === last);
  const allDone = !!lastRound && lastRound.status === "CLOSED";
  const finalLive = rounds.find((r) => r.status === "LIVE")?.number === last;
  const hideAll = !tour.resultsPublished && allDone;
  const upto = tour.resultsPublished ? undefined : finalLive || allDone ? last - 1 : undefined;
  const hideRound = (n: number) => !tour.resultsPublished && n === last;
  return { hideAll, upto, hideRound };
}
