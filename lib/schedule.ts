import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { entries, exclusions, gameTables, players, rounds, teams, tournaments } from "@/db/schema";
import { randomSchedule, scheduleProblems, swissRound, type Table } from "@/lib/rotation";
import { computeStandings, teamStandings, type GameResult } from "@/lib/standings";

type Tournament = typeof tournaments.$inferSelect;
export type RoundRow = typeof rounds.$inferSelect;
export type TableRow = typeof gameTables.$inferSelect;

export async function activeEntryIds(tournamentId: number): Promise<number[]> {
  const rows = await db.select({ id: entries.id }).from(entries).where(and(eq(entries.tournamentId, tournamentId), eq(entries.active, true)));
  return rows.map((r) => r.id);
}

// The owner's MPL pairs (never at the same table).
export async function forbiddenPairs(tour: Tournament): Promise<Array<[number, number]>> {
  if (!tour.mplOwnerEntryId) return [];
  const rows = await db.select().from(exclusions).where(eq(exclusions.tournamentId, tour.id));
  return rows.map((r) => [tour.mplOwnerEntryId!, r.entryBId] as [number, number]);
}

export async function loadRounds(tournamentId: number) {
  const rs = await db.select().from(rounds).where(eq(rounds.tournamentId, tournamentId)).orderBy(asc(rounds.number));
  const ts = rs.length
    ? await db.select().from(gameTables).where(inArray(gameTables.roundId, rs.map((r) => r.id))).orderBy(asc(gameTables.number))
    : [];
  return rs.map((r) => ({ ...r, tables: ts.filter((t) => t.roundId === r.id) }));
}
export type LoadedRound = Awaited<ReturnType<typeof loadRounds>>[number];

export const seatsOf = (t: TableRow): Table => [t.a1, t.a2, t.b1, t.b2];
export const hasScore = (t: TableRow) => t.scoreA !== null && t.scoreB !== null;

// Names and teams for every entry (including inactive ones still seated in old rounds).
export async function entryNames(tournamentId: number) {
  const rows = await db
    .select({ id: entries.id, first: players.firstName, last: players.lastName, phone: players.phone, teamName: teams.name, active: entries.active })
    .from(entries)
    .innerJoin(players, eq(entries.playerId, players.id))
    .leftJoin(teams, eq(entries.teamId, teams.id))
    .where(eq(entries.tournamentId, tournamentId));
  return new Map(rows.map((r) => [r.id, { name: `${r.first} ${r.last}`.trim(), first: r.first, phone: r.phone, team: r.teamName, active: r.active }]));
}

async function writeRound(tournamentId: number, number: number, tables: Table[], opts: { isSwiss: boolean; status?: "PENDING" | "LIVE" }) {
  const [round] = await db
    .insert(rounds)
    .values({ tournamentId, number, isSwiss: opts.isSwiss, status: opts.status ?? "PENDING" })
    .returning();
  if (tables.length) {
    await db.insert(gameTables).values(tables.map((t, i) => ({ roundId: round.id, number: i + 1, a1: t[0], a2: t[1], b1: t[2], b2: t[3] })));
  }
  return round;
}

export function randomRoundCount(tour: Tournament) {
  return tour.rotationMode === "SWISS" ? Math.min(tour.randomRoundsFirst, tour.gamesCount) : tour.gamesCount;
}

// Creates (or re-creates) the random rounds from `fromNumber` on. Earlier rounds count as history.
export async function buildRandomRounds(tour: Tournament, fromNumber = 1) {
  const ids = await activeEntryIds(tour.id);
  if (ids.length < 4 || ids.length % 4 !== 0) throw new Error("COUNT");
  const all = await loadRounds(tour.id);
  const later = all.filter((r) => r.number >= fromNumber);
  if (later.some((r) => r.tables.some(hasScore) || r.status === "CLOSED")) throw new Error("SCORED");
  const history = all.filter((r) => r.number < fromNumber).flatMap((r) => r.tables.map(seatsOf));
  const count = randomRoundCount(tour) - fromNumber + 1;
  const wasLive = later.find((r) => r.status === "LIVE")?.number;
  if (later.length) await db.delete(rounds).where(inArray(rounds.id, later.map((r) => r.id)));
  if (count <= 0) return { repeats: 0 };
  const result = randomSchedule({ players: ids, count, history, forbidden: await forbiddenPairs(tour), timeMs: 3000 });
  for (let i = 0; i < result.rounds.length; i++) {
    const n = fromNumber + i;
    await writeRound(tour.id, n, result.rounds[i], { isSwiss: false, status: n === wasLive ? "LIVE" : "PENDING" });
  }
  return { repeats: result.repeats };
}

export const isFinal = (t: TableRow) => t.status === "CONFIRMED" && hasScore(t);

// Standings from confirmed games only. `uptoRound` limits which rounds count.
// Re-seats ONE random round. All other rounds (earlier and later) count as history, so the new
// seating still avoids anyone meeting twice across the whole tournament.
export async function reshuffleOneRound(tour: Tournament, number: number) {
  const ids = await activeEntryIds(tour.id);
  if (ids.length < 4 || ids.length % 4 !== 0) throw new Error("COUNT");
  const all = await loadRounds(tour.id);
  const round = all.find((r) => r.number === number);
  if (!round) throw new Error("GONE");
  if (round.tables.some(hasScore) || round.status === "CLOSED") throw new Error("SCORED");
  const history = all.filter((r) => r.number !== number).flatMap((r) => r.tables.map(seatsOf));
  const result = randomSchedule({ players: ids, count: 1, history, forbidden: await forbiddenPairs(tour), timeMs: 3000 });
  await db.delete(gameTables).where(eq(gameTables.roundId, round.id));
  await db.insert(gameTables).values(result.rounds[0].map((t, i) => ({ roundId: round.id, number: i + 1, a1: t[0], a2: t[1], b1: t[2], b2: t[3] })));
  return { repeats: result.repeats };
}

export async function standingsFor(tournamentId: number, uptoRound?: number) {
  const all = await loadRounds(tournamentId);
  const games: GameResult[] = [];
  for (const r of all) {
    if (uptoRound !== undefined && r.number > uptoRound) continue;
    for (const t of r.tables) {
      if (!isFinal(t)) continue;
      games.push({ round: r.number, a: [t.a1, t.a2], b: [t.b1, t.b2], scoreA: t.scoreA!, scoreB: t.scoreB! });
    }
  }
  const ids = await activeEntryIds(tournamentId);
  return { standings: computeStandings(ids, games), rounds: all };
}

export async function teamTable(tournamentId: number, rankOf: Map<number, number>) {
  const rows = await db
    .select({ id: entries.id, teamId: entries.teamId })
    .from(entries)
    .where(and(eq(entries.tournamentId, tournamentId), eq(entries.active, true)));
  const members = new Map<number, number[]>();
  for (const r of rows) if (r.teamId) members.set(r.teamId, [...(members.get(r.teamId) ?? []), r.id]);
  return teamStandings(members, rankOf);
}

// Swiss round from the current standings.
export async function buildSwissRound(tour: Tournament, number: number, status: "PENDING" | "LIVE") {
  const { standings } = await standingsFor(tour.id);
  const ranked = standings.map((s) => s.entryId);
  if (ranked.length % 4 !== 0) throw new Error("COUNT");
  const tables = swissRound(ranked, await forbiddenPairs(tour));
  return writeRound(tour.id, number, tables, { isSwiss: true, status });
}

// Pairs in this round that already met in earlier rounds (for warnings).
export function repeatsInRound(all: LoadedRound[], roundNumber: number) {
  const before = all.filter((r) => r.number < roundNumber).flatMap((r) => r.tables.map(seatsOf));
  const current = all.find((r) => r.number === roundNumber);
  if (!current) return new Map<number, number>();
  const seen = new Set<string>();
  for (const t of before) for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) seen.add([t[i], t[j]].sort((a, b) => a - b).join("-"));
  const perTable = new Map<number, number>();
  for (const t of current.tables) {
    const s = seatsOf(t);
    let n = 0;
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (seen.has([s[i], s[j]].sort((a, b) => a - b).join("-"))) n++;
    if (n) perTable.set(t.number, n);
  }
  return perTable;
}

export function totalRepeats(all: LoadedRound[], forbidden: Array<[number, number]>) {
  return scheduleProblems(all.flatMap((r) => r.tables.map(seatsOf)), forbidden);
}
