import "server-only";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { entries, gameTables, players, tournaments } from "@/db/schema";

async function hasGames(entryId: number) {
  const [g] = await db
    .select({ id: gameTables.id })
    .from(gameTables)
    .where(or(eq(gameTables.a1, entryId), eq(gameTables.a2, entryId), eq(gameTables.b1, entryId), eq(gameTables.b2, entryId)))
    .limit(1);
  return !!g;
}

// Deletes a player from the address book. Not allowed once they've been seated at a table
// (their games are part of a tournament's history) — merge them instead.
export async function deletePlayer(playerId: number): Promise<"ok" | "hasGames"> {
  const es = await db.select().from(entries).where(eq(entries.playerId, playerId));
  for (const e of es) if (await hasGames(e.id)) return "hasGames";
  await db.transaction(async (tx) => {
    for (const e of es) {
      await tx.update(tournaments).set({ mplOwnerEntryId: null }).where(eq(tournaments.mplOwnerEntryId, e.id));
      await tx.delete(entries).where(eq(entries.id, e.id));
    }
    await tx.delete(players).where(eq(players.id, playerId));
  });
  return "ok";
}

// Merges a duplicate (drop) into the record to keep: tournaments, games and phone move over.
export async function mergePlayers(keepId: number, dropId: number): Promise<"ok" | "bothPlayed" | "same"> {
  if (keepId === dropId) return "same";
  const [keep] = await db.select().from(players).where(eq(players.id, keepId)).limit(1);
  const [drop] = await db.select().from(players).where(eq(players.id, dropId)).limit(1);
  if (!keep || !drop) return "same";
  const dropEntries = await db.select().from(entries).where(eq(entries.playerId, dropId));
  // Check first so nothing changes if the merge can't be done.
  for (const d of dropEntries) {
    const [k] = await db.select().from(entries).where(and(eq(entries.tournamentId, d.tournamentId), eq(entries.playerId, keepId))).limit(1);
    if (k && (await hasGames(d.id)) && (await hasGames(k.id))) return "bothPlayed";
  }
  await db.transaction(async (tx) => {
    for (const d of dropEntries) {
      const [k] = await tx.select().from(entries).where(and(eq(entries.tournamentId, d.tournamentId), eq(entries.playerId, keepId))).limit(1);
      if (!k) {
        await tx.update(entries).set({ playerId: keepId }).where(eq(entries.id, d.id));
      } else if (await hasGames(d.id)) {
        // The duplicate's spot has the games: keep that spot, drop the other one.
        await tx.update(tournaments).set({ mplOwnerEntryId: d.id }).where(eq(tournaments.mplOwnerEntryId, k.id));
        await tx.delete(entries).where(eq(entries.id, k.id));
        await tx.update(entries).set({ playerId: keepId, active: d.active || k.active }).where(eq(entries.id, d.id));
      } else {
        await tx.update(tournaments).set({ mplOwnerEntryId: k.id }).where(eq(tournaments.mplOwnerEntryId, d.id));
        await tx.delete(entries).where(eq(entries.id, d.id));
        if (d.active && !k.active) await tx.update(entries).set({ active: true }).where(eq(entries.id, k.id));
      }
    }
    const phone = keep.phone ?? drop.phone;
    await tx.delete(players).where(eq(players.id, dropId));
    if (!keep.phone && phone) await tx.update(players).set({ phone, phoneNote: null, updatedAt: new Date() }).where(eq(players.id, keepId));
  });
  return "ok";
}

// Finds the address-book record for an uploaded row. The phone wins over the name (names get
// misspelled), and a no-phone duplicate of the same person is folded into the phone record.
export async function matchUpload(phone: string, first: string, last: string) {
  const { normName } = await import("@/lib/directory");
  const all = await db.select().from(players);
  const key = normName(first, last);
  const byPhone = all.find((p) => p.phone === phone);
  if (byPhone) {
    const keys = new Set([key, normName(byPhone.firstName, byPhone.lastName)]);
    let merged = 0;
    for (const p of all) {
      if (p.id !== byPhone.id && !p.phone && keys.has(normName(p.firstName, p.lastName))) {
        if ((await mergePlayers(byPhone.id, p.id)) === "ok") merged++;
      }
    }
    const nameDiffers = normName(byPhone.firstName, byPhone.lastName) !== key;
    return { player: byPhone, created: false, nameDiffers, merged, filledPhone: false };
  }
  const noPhone = all.filter((p) => !p.phone && normName(p.firstName, p.lastName) === key);
  if (noPhone.length) {
    const [keep, ...rest] = noPhone;
    let merged = 0;
    for (const p of rest) if ((await mergePlayers(keep.id, p.id)) === "ok") merged++;
    const [player] = await db.update(players).set({ phone, phoneNote: null, updatedAt: new Date() }).where(eq(players.id, keep.id)).returning();
    return { player, created: false, nameDiffers: false, merged, filledPhone: true };
  }
  const [player] = await db.insert(players).values({ firstName: first, lastName: last, phone }).returning();
  return { player, created: true, nameDiffers: false, merged: 0, filledPhone: false };
}
