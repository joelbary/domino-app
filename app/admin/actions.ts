"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { entries, exclusions, players, teams, tournaments } from "@/db/schema";
import {
  clearFailures, endAdminSession, isLockedOut, isMplUnlocked, lockMpl, recordFailure,
  requireAdmin, safeEqual, startAdminSession, unlockMpl,
} from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { isValidPhone, normalizePhone } from "@/lib/phone";
import { readTable, toPlayers } from "@/lib/import";
import {
  RESERVED_SLUGS, cleanSlug, findOrCreateTeam, getTournamentBySlug, playerName, slugOk,
} from "@/lib/tournaments";

export type FormState = { error?: string; ok?: string; details?: string[]; fields?: Record<string, string> };

// Echo the submitted text fields back so the form keeps what was typed after an error.
function keep(formData: FormData, error: string): FormState {
  const fields: Record<string, string> = {};
  formData.forEach((v, k) => {
    if (typeof v === "string" && !k.startsWith("$")) fields[k] = v;
  });
  return { error, fields };
}

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string, d: number) => {
  const n = parseInt(str(f, k), 10);
  return Number.isFinite(n) ? n : d;
};

// ---------- language ----------
export async function setLang(formData: FormData) {
  const lang = str(formData, "lang") === "es" ? "es" : "en";
  const jar = await cookies();
  jar.set("lang", lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  const back = str(formData, "back") || "/";
  redirect(back.startsWith("/") ? back : "/");
}

// ---------- admin session ----------
export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const { t } = await getT();
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return { error: t("noAdminPassword") };
  const wait = isLockedOut("login");
  if (wait) return { error: t("lockedOut", { m: wait }) };
  if (!safeEqual(str(formData, "password"), expected)) {
    recordFailure("login", 8, 15);
    return { error: t("wrongPassword") };
  }
  clearFailures("login");
  await startAdminSession();
  redirect("/admin");
}

export async function logout() {
  await endAdminSession();
  redirect("/admin/login");
}

// ---------- tournaments ----------
const LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/svg+xml", "image/webp", "image/gif"]);

async function readTournamentForm(formData: FormData, currentId?: number) {
  const { t } = await getT();
  const name = str(formData, "name");
  const slug = cleanSlug(str(formData, "slug"));
  const gamesCount = int(formData, "gamesCount", 5);
  const rotationMode = str(formData, "rotationMode") === "SWISS" ? "SWISS" : "RANDOM";
  const randomRoundsFirst = int(formData, "randomRoundsFirst", 2);
  const teamsEnabled = formData.get("teamsEnabled") === "on";
  const teamMinSize = int(formData, "teamMinSize", 6);
  const teamMaxSize = int(formData, "teamMaxSize", 10);
  const timerEnabled = formData.get("timerEnabled") === "on";
  const roundMinutes = int(formData, "roundMinutes", 30);
  const dateStr = str(formData, "eventDate");
  const eventDate = dateStr ? new Date(`${dateStr}T12:00:00Z`) : null;

  if (!name) return { error: t("errName") };
  if (!slugOk(slug)) return { error: t("errSlug") };
  if (RESERVED_SLUGS.has(slug)) return { error: t("errSlugReserved") };
  const clash = await getTournamentBySlug(slug);
  if (clash && clash.id !== currentId) return { error: t("errSlugTaken") };
  if (gamesCount < 1 || gamesCount > 20) return { error: t("errGames") };
  if (rotationMode === "SWISS" && (randomRoundsFirst < 1 || randomRoundsFirst >= gamesCount)) return { error: t("errSwiss") };
  if (teamsEnabled && (teamMinSize < 2 || teamMinSize > teamMaxSize)) return { error: t("errTeamSize") };
  if (timerEnabled && (roundMinutes < 5 || roundMinutes > 180)) return { error: t("errMinutes") };

  const values: Partial<typeof tournaments.$inferInsert> = {
    name, slug, gamesCount, rotationMode, randomRoundsFirst, teamsEnabled, teamMinSize, teamMaxSize,
    timerEnabled, roundMinutes, eventDate, updatedAt: new Date(),
  };

  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (logo.size > 2 * 1024 * 1024 || !LOGO_TYPES.has(logo.type)) return { error: t("errLogo") };
    values.logo = Buffer.from(await logo.arrayBuffer());
    values.logoMimeType = logo.type;
  } else if (formData.get("removeLogo") === "on") {
    values.logo = null;
    values.logoMimeType = null;
  }
  return { values };
}

export async function createTournament(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const r = await readTournamentForm(formData);
  if ("error" in r) return keep(formData, r.error!);
  const [created] = await db.insert(tournaments).values(r.values as typeof tournaments.$inferInsert).returning();
  revalidatePath("/admin");
  redirect(`/admin/t/${created.slug}`);
}

export async function updateTournament(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const { t } = await getT();
  const id = int(formData, "id", 0);
  const r = await readTournamentForm(formData, id);
  if ("error" in r) return keep(formData, r.error!);
  await db.update(tournaments).set(r.values).where(eq(tournaments.id, id));
  revalidatePath("/", "layout");
  if (r.values.slug !== str(formData, "originalSlug")) redirect(`/admin/t/${r.values.slug}/settings?saved=1`);
  return { ok: t("saved") };
}

export async function deleteTournament(formData: FormData) {
  await requireAdmin();
  if (str(formData, "confirm") !== "DELETE") return;
  const id = int(formData, "id", 0);
  await db.delete(tournaments).where(eq(tournaments.id, id));
  revalidatePath("/admin");
  redirect("/admin");
}

// ---------- players ----------
async function tournamentOrThrow(id: number) {
  const [t] = await db.select().from(tournaments).where(eq(tournaments.id, id)).limit(1);
  if (!t) throw new Error("Tournament not found");
  return t;
}

async function resolveTeam(tournamentId: number, formData: FormData): Promise<number | null> {
  const newTeam = str(formData, "newTeam");
  if (newTeam) return findOrCreateTeam(tournamentId, newTeam);
  const teamId = int(formData, "teamId", 0);
  if (!teamId) return null;
  const [team] = await db.select().from(teams).where(and(eq(teams.id, teamId), eq(teams.tournamentId, tournamentId))).limit(1);
  return team?.id ?? null;
}

async function findEntry(tournamentId: number, playerId: number) {
  const [e] = await db.select().from(entries).where(and(eq(entries.tournamentId, tournamentId), eq(entries.playerId, playerId))).limit(1);
  return e ?? null;
}

export async function addPlayer(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const { t } = await getT();
  const tour = await tournamentOrThrow(int(formData, "tournamentId", 0));
  const firstName = str(formData, "firstName");
  const lastName = str(formData, "lastName");
  const phone = normalizePhone(str(formData, "phone"));
  if (!firstName) return keep(formData, t("errFirst"));
  if (!isValidPhone(phone)) return keep(formData, t("errPhone"));

  let [player] = await db.select().from(players).where(eq(players.phone, phone)).limit(1);
  if (player) {
    const e = await findEntry(tour.id, player.id);
    if (e?.active) return keep(formData, t("errPhoneInTournament", { name: playerName(player) }));
    [player] = await db.update(players).set({ firstName, lastName, updatedAt: new Date() }).where(eq(players.id, player.id)).returning();
  } else {
    [player] = await db.insert(players).values({ firstName, lastName, phone }).returning();
  }
  const teamId = tour.teamsEnabled ? await resolveTeam(tour.id, formData) : null;
  const existing = await findEntry(tour.id, player.id);
  if (existing) await db.update(entries).set({ active: true, teamId }).where(eq(entries.id, existing.id));
  else await db.insert(entries).values({ tournamentId: tour.id, playerId: player.id, teamId });
  revalidatePath(`/admin/t/${tour.slug}`, "layout");
  return { ok: t("playerAdded") };
}

export async function updatePlayer(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const { t } = await getT();
  const tour = await tournamentOrThrow(int(formData, "tournamentId", 0));
  const entryId = int(formData, "entryId", 0);
  const [entry] = await db.select().from(entries).where(and(eq(entries.id, entryId), eq(entries.tournamentId, tour.id))).limit(1);
  if (!entry) return { error: "Not found" };
  const firstName = str(formData, "firstName");
  const lastName = str(formData, "lastName");
  const phone = normalizePhone(str(formData, "phone"));
  if (!firstName) return keep(formData, t("errFirst"));
  if (!isValidPhone(phone)) return keep(formData, t("errPhone"));
  const [other] = await db.select().from(players).where(eq(players.phone, phone)).limit(1);
  if (other && other.id !== entry.playerId) return keep(formData, t("errPhoneOther", { name: playerName(other) }));
  await db.update(players).set({ firstName, lastName, phone, updatedAt: new Date() }).where(eq(players.id, entry.playerId));
  if (tour.teamsEnabled) await db.update(entries).set({ teamId: await resolveTeam(tour.id, formData) }).where(eq(entries.id, entry.id));
  revalidatePath(`/admin/t/${tour.slug}`, "layout");
  return { ok: t("playerUpdated") };
}

export async function replacePlayer(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const { t } = await getT();
  const tour = await tournamentOrThrow(int(formData, "tournamentId", 0));
  const entryId = int(formData, "entryId", 0);
  const [entry] = await db.select().from(entries).where(and(eq(entries.id, entryId), eq(entries.tournamentId, tour.id))).limit(1);
  if (!entry) return { error: "Not found" };
  const firstName = str(formData, "firstName");
  const lastName = str(formData, "lastName");
  const phone = normalizePhone(str(formData, "phone"));
  if (!firstName) return keep(formData, t("errFirst"));
  if (!isValidPhone(phone)) return keep(formData, t("errPhone"));
  let [player] = await db.select().from(players).where(eq(players.phone, phone)).limit(1);
  if (player) {
    const e = await findEntry(tour.id, player.id);
    if (e?.active) return keep(formData, t("errPhoneInTournament", { name: playerName(player) }));
    if (e) await db.delete(entries).where(eq(entries.id, e.id)); // old inactive entry for the newcomer
    [player] = await db.update(players).set({ firstName, lastName, updatedAt: new Date() }).where(eq(players.id, player.id)).returning();
  } else {
    [player] = await db.insert(players).values({ firstName, lastName, phone }).returning();
  }
  await db.update(entries).set({ playerId: player.id }).where(eq(entries.id, entry.id));
  revalidatePath(`/admin/t/${tour.slug}`, "layout");
  redirect(`/admin/t/${tour.slug}/players?msg=playerReplaced`);
}

export async function removePlayer(formData: FormData) {
  await requireAdmin();
  const tour = await tournamentOrThrow(int(formData, "tournamentId", 0));
  const entryId = int(formData, "entryId", 0);
  try {
    await db.delete(entries).where(and(eq(entries.id, entryId), eq(entries.tournamentId, tour.id)));
  } catch {
    // Already seated at a table in past rounds: keep history, just deactivate.
    await db.update(entries).set({ active: false }).where(eq(entries.id, entryId));
  }
  revalidatePath(`/admin/t/${tour.slug}`, "layout");
  redirect(`/admin/t/${tour.slug}/players?msg=playerRemoved`);
}

export async function uploadPlayers(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const { t } = await getT();
  const tour = await tournamentOrThrow(int(formData, "tournamentId", 0));
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: t("errFile") };

  let table: unknown[][];
  try {
    table = await readTable(file);
  } catch {
    return { error: t("errFile") };
  }
  const parsed = toPlayers(table);
  if ("error" in parsed) return { error: t(parsed.error) };

  let added = 0, updated = 0, same = 0;
  const skipped: string[] = [];
  const seen = new Set<string>();
  for (const r of parsed.rows) {
    const phone = normalizePhone(r.phone);
    if (!r.first) { skipped.push(t("rowSkipped", { r: r.row, why: t("errFirst") })); continue; }
    if (!isValidPhone(phone)) { skipped.push(t("rowSkipped", { r: r.row, why: `${t("errPhone")} (${r.first} ${r.last})` })); continue; }
    if (seen.has(phone)) { skipped.push(t("rowSkipped", { r: r.row, why: `${r.first} ${r.last}: ${t("errPhoneInTournament", { name: "↑" })}` })); continue; }
    seen.add(phone);

    let [player] = await db.select().from(players).where(eq(players.phone, phone)).limit(1);
    let changed = false;
    if (player) {
      if (player.firstName !== r.first || player.lastName !== r.last) {
        [player] = await db.update(players).set({ firstName: r.first, lastName: r.last, updatedAt: new Date() }).where(eq(players.id, player.id)).returning();
        changed = true;
      }
    } else {
      [player] = await db.insert(players).values({ firstName: r.first, lastName: r.last, phone }).returning();
    }
    const teamId = tour.teamsEnabled && r.team ? await findOrCreateTeam(tour.id, r.team) : null;
    const e = await findEntry(tour.id, player.id);
    if (!e) {
      await db.insert(entries).values({ tournamentId: tour.id, playerId: player.id, teamId });
      added++;
    } else {
      const set: Partial<typeof entries.$inferInsert> = { active: true };
      if (teamId && teamId !== e.teamId) { set.teamId = teamId; changed = true; }
      if (!e.active) changed = true;
      await db.update(entries).set(set).where(eq(entries.id, e.id));
      if (changed) updated++;
      else same++;
    }
  }
  revalidatePath(`/admin/t/${tour.slug}`, "layout");
  return { ok: t("importDone", { a: added, u: updated, k: same, s: skipped.length }), details: skipped };
}

// ---------- teams ----------
export async function addTeam(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const { t } = await getT();
  const tour = await tournamentOrThrow(int(formData, "tournamentId", 0));
  const name = str(formData, "name");
  if (!name) return { error: t("errTeamName") };
  const [dup] = await db.select().from(teams).where(and(eq(teams.tournamentId, tour.id), sql`lower(${teams.name}) = lower(${name})`)).limit(1);
  if (dup) return { error: t("errTeamExists") };
  await db.insert(teams).values({ tournamentId: tour.id, name });
  revalidatePath(`/admin/t/${tour.slug}`, "layout");
  return { ok: t("saved") };
}

export async function renameTeam(formData: FormData) {
  await requireAdmin();
  const tour = await tournamentOrThrow(int(formData, "tournamentId", 0));
  const name = str(formData, "name");
  const id = int(formData, "teamId", 0);
  if (name) {
    try {
      await db.update(teams).set({ name }).where(and(eq(teams.id, id), eq(teams.tournamentId, tour.id)));
    } catch {
      redirect(`/admin/t/${tour.slug}/teams?err=errTeamExists`);
    }
  }
  revalidatePath(`/admin/t/${tour.slug}`, "layout");
  redirect(`/admin/t/${tour.slug}/teams`);
}

export async function deleteTeam(formData: FormData) {
  await requireAdmin();
  const tour = await tournamentOrThrow(int(formData, "tournamentId", 0));
  await db.delete(teams).where(and(eq(teams.id, int(formData, "teamId", 0)), eq(teams.tournamentId, tour.id)));
  revalidatePath(`/admin/t/${tour.slug}`, "layout");
  redirect(`/admin/t/${tour.slug}/teams`);
}

// ---------- MPL (owner's private list) ----------
export async function mplUnlock(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const { t } = await getT();
  const pin = process.env.MPL_PIN;
  const slug = str(formData, "slug");
  if (!pin) return { error: t("pinNotSet") };
  const wait = isLockedOut("mpl");
  if (wait) return { error: t("lockedOut", { m: wait }) };
  if (!safeEqual(str(formData, "pin"), pin)) {
    recordFailure("mpl", 5, 15);
    return { error: t("pinWrong") };
  }
  clearFailures("mpl");
  await unlockMpl();
  redirect(`/admin/t/${slug}/mpl`);
}

export async function mplLock(formData: FormData) {
  await lockMpl();
  redirect(`/admin/t/${str(formData, "slug")}`);
}

async function requireMpl() {
  await requireAdmin();
  if (!(await isMplUnlocked())) throw new Error("Locked");
}

export async function mplSetMe(formData: FormData) {
  await requireMpl();
  const tour = await tournamentOrThrow(int(formData, "tournamentId", 0));
  const me = int(formData, "entryId", 0) || null;
  await db.update(tournaments).set({ mplOwnerEntryId: me }).where(eq(tournaments.id, tour.id));
  // List entries are stored relative to the owner's entry; move them along.
  if (me) await db.update(exclusions).set({ entryAId: me }).where(eq(exclusions.tournamentId, tour.id));
  redirect(`/admin/t/${tour.slug}/mpl`);
}

export async function mplAdd(formData: FormData) {
  await requireMpl();
  const tour = await tournamentOrThrow(int(formData, "tournamentId", 0));
  const other = int(formData, "entryId", 0);
  if (tour.mplOwnerEntryId && other && other !== tour.mplOwnerEntryId) {
    await db.insert(exclusions).values({ tournamentId: tour.id, entryAId: tour.mplOwnerEntryId, entryBId: other }).onConflictDoNothing();
  }
  redirect(`/admin/t/${tour.slug}/mpl`);
}

export async function mplRemove(formData: FormData) {
  await requireMpl();
  const tour = await tournamentOrThrow(int(formData, "tournamentId", 0));
  await db.delete(exclusions).where(and(eq(exclusions.id, int(formData, "id", 0)), eq(exclusions.tournamentId, tour.id)));
  redirect(`/admin/t/${tour.slug}/mpl`);
}
