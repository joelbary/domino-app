import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { entries, players, teams, tournaments, rounds } from "@/db/schema";

export const RESERVED_SLUGS = new Set(["admin", "api", "t", "login", "domino", "icon.svg", "favicon.ico", "_next", "static", "public"]);

export function cleanSlug(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, "-");
}
export function slugOk(s: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,29}$/.test(s);
}

export async function getTournamentBySlug(slug: string) {
  const [t] = await db.select().from(tournaments).where(eq(tournaments.slug, slug)).limit(1);
  return t ?? null;
}

export async function listTournaments() {
  return db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      slug: tournaments.slug,
      status: tournaments.status,
      gamesCount: tournaments.gamesCount,
      teamsEnabled: tournaments.teamsEnabled,
      rotationMode: tournaments.rotationMode,
      randomRoundsFirst: tournaments.randomRoundsFirst,
      eventDate: tournaments.eventDate,
      playerCount: sql<number>`(select count(*)::int from ${entries} where ${entries.tournamentId} = ${tournaments.id} and ${entries.active})`,
    })
    .from(tournaments)
    .orderBy(sql`${tournaments.eventDate} desc nulls last`, sql`${tournaments.createdAt} desc`);
}

export async function listEntries(tournamentId: number) {
  return db
    .select({
      entryId: entries.id,
      playerId: players.id,
      firstName: players.firstName,
      lastName: players.lastName,
      phone: players.phone,
      teamId: entries.teamId,
      teamName: teams.name,
    })
    .from(entries)
    .innerJoin(players, eq(entries.playerId, players.id))
    .leftJoin(teams, eq(entries.teamId, teams.id))
    .where(and(eq(entries.tournamentId, tournamentId), eq(entries.active, true)))
    .orderBy(asc(players.firstName), asc(players.lastName));
}

export async function listTeams(tournamentId: number) {
  return db
    .select({
      id: teams.id,
      name: teams.name,
      count: sql<number>`(select count(*)::int from ${entries} where ${entries.teamId} = ${teams.id} and ${entries.active})`,
    })
    .from(teams)
    .where(eq(teams.tournamentId, tournamentId))
    .orderBy(sql`case when ${teams.name} ~ '^[0-9]+$' then lpad(${teams.name}, 6, '0') else ${teams.name} end`);
}

export async function currentRound(tournamentId: number) {
  const rs = await db.select().from(rounds).where(eq(rounds.tournamentId, tournamentId)).orderBy(asc(rounds.number));
  const live = rs.find((r) => r.status === "LIVE");
  return live?.number ?? rs.filter((r) => r.status === "CLOSED").length;
}

// Finds a team by name (case-insensitive) or creates it.
export async function findOrCreateTeam(tournamentId: number, name: string): Promise<number> {
  const clean = name.trim();
  const [existing] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.tournamentId, tournamentId), sql`lower(${teams.name}) = lower(${clean})`))
    .limit(1);
  if (existing) return existing.id;
  const [created] = await db.insert(teams).values({ tournamentId, name: clean }).returning();
  return created.id;
}

export function playerName(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`.trim();
}
