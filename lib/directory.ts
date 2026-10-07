import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { entries, players } from "@/db/schema";
import { formatPhone } from "@/lib/phone";

// Names compared without accents, case or extra spaces ("José  Pérez" = "jose perez").
export function normName(first: string, last: string) {
  return `${first} ${last}`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function maskPhone(e164: string | null) {
  if (!e164) return "";
  return `•••• ${e164.slice(-4)}`;
}

export type BookEntry = { id: number; first: string; last: string; phone: string; hasPhone: boolean; inTournament: boolean };

// The address book (every player ever entered), marked with who's already in this tournament.
// Co-admins only see the last 4 digits of each phone.
export async function addressBook(tournamentId: number | null, fullPhones: boolean): Promise<BookEntry[]> {
  const ps = await db.select().from(players).orderBy(asc(players.firstName), asc(players.lastName));
  const inT = tournamentId
    ? new Set((await db.select({ p: entries.playerId }).from(entries).where(and(eq(entries.tournamentId, tournamentId), eq(entries.active, true)))).map((r) => r.p))
    : new Set<number>();
  return ps.map((p) => ({
    id: p.id, first: p.firstName, last: p.lastName,
    phone: fullPhones ? formatPhone(p.phone) : maskPhone(p.phone),
    hasPhone: !!p.phone, inTournament: inT.has(p.id),
  }));
}

// Finds one player in the address book by full name (only if exactly one matches).
export async function findByName(first: string, last: string) {
  const key = normName(first, last);
  const all = await db.select().from(players);
  const hits = all.filter((p) => normName(p.firstName, p.lastName) === key);
  return hits.length === 1 ? hits[0] : null;
}
