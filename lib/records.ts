import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { entries, gameTables, players, rounds, tournaments } from "@/db/schema";
import { computeStandings, type GameResult } from "@/lib/standings";
import { drawOrder } from "@/lib/schedule";
import { tournamentCols } from "@/lib/tournaments";

export type TournamentResult = {
  tournamentId: number; name: string; slug: string; date: Date | null; status: string; published: boolean;
  place: number | null; of: number; w: number; l: number; t: number; pf: number; pa: number;
};
export type PlayerRecord = {
  playerId: number; tournaments: number; games: number; w: number; l: number; t: number; pf: number; pa: number;
  best: number | null; titles: number; results: TournamentResult[];
};

// All-time records from every tournament. Final places only count once results are published.
export async function allRecords(): Promise<Map<number, PlayerRecord>> {
  const tours = await db.select(tournamentCols).from(tournaments).orderBy(asc(tournaments.eventDate));
  const ents = await db.select({ id: entries.id, tournamentId: entries.tournamentId, playerId: entries.playerId, active: entries.active }).from(entries);
  const rs = await db.select().from(rounds);
  const ts = rs.length ? await db.select().from(gameTables).where(inArray(gameTables.roundId, rs.map((r) => r.id))) : [];
  const out = new Map<number, PlayerRecord>();
  const rec = (pid: number) => {
    if (!out.has(pid)) out.set(pid, { playerId: pid, tournaments: 0, games: 0, w: 0, l: 0, t: 0, pf: 0, pa: 0, best: null, titles: 0, results: [] });
    return out.get(pid)!;
  };

  for (const tour of tours) {
    const tEnts = ents.filter((e) => e.tournamentId === tour.id);
    const roundIds = new Map(rs.filter((r) => r.tournamentId === tour.id).map((r) => [r.id, r.number]));
    const games: GameResult[] = ts
      .filter((x) => roundIds.has(x.roundId) && x.status === "CONFIRMED" && x.scoreA !== null && x.scoreB !== null)
      .map((x) => ({ round: roundIds.get(x.roundId)!, a: [x.a1, x.a2], b: [x.b1, x.b2], scoreA: x.scoreA!, scoreB: x.scoreB! }));
    const seated = new Set(games.flatMap((g) => [...g.a, ...g.b]));
    const ids = tEnts.filter((e) => e.active || seated.has(e.id)).map((e) => e.id);
    const st = computeStandings(ids, games, (id) => drawOrder(tour.id, id));
    const published = tour.resultsPublished;
    for (const s of st) {
      const e = tEnts.find((x) => x.id === s.entryId);
      if (!e) continue;
      const r = rec(e.playerId);
      if (s.played > 0) r.tournaments++;
      r.games += s.played; r.w += s.w; r.l += s.l; r.t += s.t; r.pf += s.pf; r.pa += s.pa;
      const place = published && s.played > 0 ? s.rank : null;
      if (place !== null) {
        r.best = r.best === null ? place : Math.min(r.best, place);
        if (place === 1) r.titles++;
      }
      r.results.push({
        tournamentId: tour.id, name: tour.name, slug: tour.slug, date: tour.eventDate, status: tour.status, published,
        place, of: st.length, w: s.w, l: s.l, t: s.t, pf: s.pf, pa: s.pa,
      });
    }
  }
  return out;
}

export async function playerRecord(playerId: number) {
  return (await allRecords()).get(playerId) ?? null;
}

export async function allPlayers() {
  return db.select().from(players).orderBy(asc(players.firstName), asc(players.lastName));
}

export async function playerById(id: number) {
  const [p] = await db.select().from(players).where(eq(players.id, id)).limit(1);
  return p ?? null;
}
