import "server-only";
import { and, asc, eq, like, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { entries, gameTables, hands, players, rounds, tournaments } from "@/db/schema";
import { getPlayerId } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";

// Finds a player by what they typed. Exact match on the international number first; otherwise
// a unique match on the last digits (so "0414 123 4567" still finds +58 414 1234567).
export async function findPlayerByPhone(input: string) {
  const e164 = normalizePhone(input);
  if (e164) {
    const [p] = await db.select().from(players).where(eq(players.phone, e164)).limit(1);
    if (p) return p;
  }
  const digits = String(input).replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length < 7) return null;
  const tail = digits.slice(-Math.min(digits.length, 10));
  const matches = await db.select().from(players).where(like(players.phone, `%${tail}`)).limit(2);
  return matches.length === 1 ? matches[0] : null;
}

export async function currentPlayer() {
  const pid = await getPlayerId();
  if (!pid) return null;
  const [p] = await db.select().from(players).where(eq(players.id, pid)).limit(1);
  return p ?? null;
}

export async function myEntry(tournamentId: number, playerId: number) {
  const [e] = await db
    .select()
    .from(entries)
    .where(and(eq(entries.tournamentId, tournamentId), eq(entries.playerId, playerId), eq(entries.active, true)))
    .limit(1);
  return e ?? null;
}

export async function myTournaments(playerId: number) {
  return db
    .select({
      id: tournaments.id, name: tournaments.name, slug: tournaments.slug, status: tournaments.status,
      eventDate: tournaments.eventDate, gamesCount: tournaments.gamesCount, entryId: entries.id,
      resultsPublished: tournaments.resultsPublished, updatedAt: tournaments.updatedAt,
      playerCount: sql<number>`(select count(*)::int from ${entries} e2 where e2.tournament_id = ${tournaments.id} and e2.active)`,
    })
    .from(entries)
    .innerJoin(tournaments, eq(entries.tournamentId, tournaments.id))
    .where(and(eq(entries.playerId, playerId), eq(entries.active, true)))
    .orderBy(sql`${tournaments.eventDate} desc nulls last`);
}

export async function handsFor(tableId: number) {
  return db.select().from(hands).where(eq(hands.gameTableId, tableId)).orderBy(asc(hands.handNumber));
}

// The table + round + tournament for a given table id.
export async function tableContext(tableId: number) {
  const [row] = await db
    .select({ t: gameTables, r: rounds, tour: tournaments })
    .from(gameTables)
    .innerJoin(rounds, eq(gameTables.roundId, rounds.id))
    .innerJoin(tournaments, eq(rounds.tournamentId, tournaments.id))
    .where(eq(gameTables.id, tableId))
    .limit(1);
  return row ?? null;
}

export function sideOf(t: typeof gameTables.$inferSelect, entryId: number): "A" | "B" | null {
  if (t.a1 === entryId || t.a2 === entryId) return "A";
  if (t.b1 === entryId || t.b2 === entryId) return "B";
  return null;
}


