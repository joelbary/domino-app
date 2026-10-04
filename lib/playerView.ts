import "server-only";
import { notFound } from "next/navigation";
import { getT } from "@/lib/i18n";
import { currentPlayer, myEntry, sideOf } from "@/lib/play";
import { entryNames, loadRounds } from "@/lib/schedule";
import { getTournamentBySlug } from "@/lib/tournaments";

// Everything a player page needs about one tournament and the signed-in player.
export async function playerView(slug: string) {
  const tour = await getTournamentBySlug(slug.toLowerCase());
  if (!tour) notFound();
  const [{ t, lang }, player, all, names] = await Promise.all([getT(), currentPlayer(), loadRounds(tour.id), entryNames(tour.id)]);
  const entry = player ? await myEntry(tour.id, player.id) : null;
  const visible = tour.status !== "SETUP" ? all : [];
  const live = visible.find((r) => r.status === "LIVE") ?? null;
  const myTable = live && entry ? live.tables.find((x) => sideOf(x, entry.id)) ?? null : null;
  const mySide = myTable && entry ? sideOf(myTable, entry.id) : null;
  const nameOf = (id: number) => names.get(id)?.name ?? "?";
  const firstOf = (id: number) => names.get(id)?.first ?? "?";
  const timerRound = live;
  const timer = tour.timerEnabled && timerRound
    ? {
        roundId: timerRound.id, round: timerRound.number,
        endsAt: timerRound.timerEndsAt ? timerRound.timerEndsAt.toISOString() : null,
        remaining: timerRound.timerRemainingSec, serverNow: Date.now(),
        labels: {
          left: t("timeLeft"), up: t("timeUpShort"), paused: t("paused"), title: t("timeUpTitle"),
          body: t("timeUpBody"), go: t("goToScorecard"), ok: t("dismiss"),
        },
      }
    : null;
  return { tour, t, lang, player, entry, rounds: visible, live, myTable, mySide, names, nameOf, firstOf, timer };
}
export type PlayerView = Awaited<ReturnType<typeof playerView>>;
