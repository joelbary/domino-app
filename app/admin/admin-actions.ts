"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { admins, tournamentAdmins } from "@/db/schema";
import { adminTournamentById } from "@/lib/access";
import { checkPassword, hashPassword, requireAdmin, requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import type { FormState } from "./actions";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string) => parseInt(str(f, k), 10) || 0;
const USERNAME = /^[a-z0-9._@-]{3,40}$/;

async function createAccount(formData: FormData) {
  const { t } = await getT();
  const name = str(formData, "name");
  const username = str(formData, "username").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!name) return { error: t("errName") };
  if (!USERNAME.test(username)) return { error: t("errUsername") };
  if (password.length < 8) return { error: t("errPassword") };
  const [dup] = await db.select({ id: admins.id }).from(admins).where(eq(admins.email, username)).limit(1);
  if (dup) return { error: t("errUsernameTaken") };
  const [a] = await db.insert(admins).values({ name, email: username, passwordHash: hashPassword(password) }).returning();
  return { admin: a };
}

// Main admin: create a co-admin account.
export async function createCoAdmin(_: FormState, formData: FormData): Promise<FormState> {
  await requireOwner();
  const { t } = await getT();
  const r = await createAccount(formData);
  if ("error" in r) return { error: r.error, fields: { name: str(formData, "name"), username: str(formData, "username") } };
  revalidatePath("/admin/admins");
  return { ok: t("accountCreated") };
}

export async function setCoAdminPassword(_: FormState, formData: FormData): Promise<FormState> {
  await requireOwner();
  const { t } = await getT();
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: t("errPassword") };
  await db.update(admins).set({ passwordHash: hashPassword(password) }).where(eq(admins.id, int(formData, "adminId")));
  return { ok: t("passwordSet") };
}

export async function toggleCoAdmin(formData: FormData) {
  await requireOwner();
  await db.update(admins).set({ active: str(formData, "active") === "1" }).where(eq(admins.id, int(formData, "adminId")));
  revalidatePath("/admin/admins");
  redirect("/admin/admins");
}

export async function deleteCoAdmin(formData: FormData) {
  await requireOwner();
  await db.delete(admins).where(eq(admins.id, int(formData, "adminId")));
  revalidatePath("/admin/admins");
  redirect("/admin/admins");
}

// Any co-admin: change their own password.
export async function changeMyPassword(_: FormState, formData: FormData): Promise<FormState> {
  const s = await requireAdmin();
  const { t } = await getT();
  if (s.role !== "admin") return { error: t("errGeneric") };
  const [a] = await db.select().from(admins).where(eq(admins.id, s.aid!)).limit(1);
  if (!a || !checkPassword(String(formData.get("current") ?? ""), a.passwordHash)) return { error: t("errCurrentPassword") };
  const next = String(formData.get("password") ?? "");
  if (next.length < 8) return { error: t("errPassword") };
  await db.update(admins).set({ passwordHash: hashPassword(next) }).where(eq(admins.id, a.id));
  return { ok: t("passwordSet") };
}

// Tournament page: give an existing co-admin access, or create a new one with access.
export async function addTournamentAdmin(_: FormState, formData: FormData): Promise<FormState> {
  const { tour } = await adminTournamentById(int(formData, "tournamentId"));
  const { t } = await getT();
  let adminId = int(formData, "adminId");
  if (!adminId) {
    const r = await createAccount(formData);
    if ("error" in r) return { error: r.error, fields: { name: str(formData, "name"), username: str(formData, "username") } };
    adminId = r.admin.id;
  }
  await db.insert(tournamentAdmins).values({ tournamentId: tour.id, adminId }).onConflictDoNothing();
  revalidatePath(`/admin/t/${tour.slug}`, "layout");
  void t;
  redirect(`/admin/t/${tour.slug}/admins?msg=${int(formData, "adminId") ? "accessAdded" : "accountCreated"}`);
}

export async function removeTournamentAdmin(formData: FormData) {
  const { tour } = await adminTournamentById(int(formData, "tournamentId"));
  await db.delete(tournamentAdmins).where(and(eq(tournamentAdmins.tournamentId, tour.id), eq(tournamentAdmins.adminId, int(formData, "adminId"))));
  revalidatePath(`/admin/t/${tour.slug}`, "layout");
  redirect(`/admin/t/${tour.slug}/admins?msg=accessRemoved`);
}

// Main admin: fix a player's name/phone in the directory (applies to every tournament).
export async function updateGlobalPlayer(_: FormState, formData: FormData): Promise<FormState> {
  await requireOwner();
  const { t } = await getT();
  const { normalizePhone } = await import("@/lib/phone");
  const { players } = await import("@/db/schema");
  const id = int(formData, "playerId");
  const firstName = str(formData, "firstName");
  const raw = str(formData, "phone");
  const phone = raw ? normalizePhone(raw) : null;
  if (!firstName) return { error: t("errFirst") };
  if (raw && !phone) return { error: t("errPhone") };
  if (phone) {
    const [other] = await db.select().from(players).where(eq(players.phone, phone)).limit(1);
    if (other && other.id !== id) return { error: t("errPhoneOther", { name: `${other.firstName} ${other.lastName}` }) };
  }
  await db.update(players).set({ firstName, lastName: str(formData, "lastName"), phone, ...(phone ? { phoneNote: null } : {}), updatedAt: new Date() }).where(eq(players.id, id));
  revalidatePath(`/admin/players/${id}`);
  return { ok: t("playerUpdated") };
}

// ---------- address book (main admin) ----------
export async function addBookPlayer(_: FormState, formData: FormData): Promise<FormState> {
  await requireOwner();
  const { t } = await getT();
  const { normalizePhone } = await import("@/lib/phone");
  const { players } = await import("@/db/schema");
  const firstName = str(formData, "firstName");
  const lastName = str(formData, "lastName");
  const raw = str(formData, "phone");
  const phone = raw ? normalizePhone(raw) : null;
  if (!firstName) return { error: t("errFirst"), fields: { firstName, lastName, phone: raw } };
  if (raw && !phone) return { error: t("errPhone"), fields: { firstName, lastName, phone: raw } };
  if (phone) {
    const [other] = await db.select().from(players).where(eq(players.phone, phone)).limit(1);
    if (other) return { error: t("errPhoneBelongs", { name: `${other.firstName} ${other.lastName}` }), fields: { firstName, lastName, phone: raw } };
  }
  await db.insert(players).values({ firstName, lastName, phone });
  revalidatePath("/admin/players");
  return { ok: t("addedToBook") };
}

export async function uploadBook(_: FormState, formData: FormData): Promise<FormState> {
  await requireOwner();
  const { t } = await getT();
  const { normalizePhone } = await import("@/lib/phone");
  const { players } = await import("@/db/schema");
  const { readTable, toPlayers } = await import("@/lib/import");
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
  let added = 0, updated = 0;
  const skipped: string[] = [];
  const notes: string[] = [];
  for (const r of parsed.rows) {
    if (!r.first) { skipped.push(t("rowSkipped", { r: r.row, why: t("errFirst") })); continue; }
    const phone = r.phone ? normalizePhone(r.phone) : null;
    if (r.phone && !phone) { skipped.push(t("rowSkipped", { r: r.row, why: `${t("errPhone")} (${r.first} ${r.last})` })); continue; }
    if (phone) {
      const { matchUpload } = await import("@/lib/merge");
      const m = await matchUpload(phone, r.first, r.last);
      if (m.created) added++;
      else if (m.filledPhone || m.merged) updated++;
      const name = `${m.player.firstName} ${m.player.lastName}`.trim();
      if (m.nameDiffers) notes.push(t("nameKept", { r: r.row, file: `${r.first} ${r.last}`.trim(), name }));
      if (m.merged) notes.push(t("dupMerged", { name }));
      continue;
    }
    const { normName } = await import("@/lib/directory");
    const key = normName(r.first, r.last);
    if ((await db.select().from(players)).some((p) => normName(p.firstName, p.lastName) === key)) continue;
    await db.insert(players).values({ firstName: r.first, lastName: r.last, phone: null });
    added++;
  }
  revalidatePath("/admin/players");
  return { ok: t("bookImportDone", { a: added, u: updated, s: skipped.length }), details: [...skipped, ...notes] };
}

export async function deleteBookPlayer(formData: FormData) {
  await requireOwner();
  const { deletePlayer } = await import("@/lib/merge");
  const id = int(formData, "playerId");
  const r = await deletePlayer(id);
  revalidatePath("/admin", "layout");
  if (r === "hasGames") redirect(`/admin/players/${id}?err=errHasGames`);
  redirect("/admin/players?msg=playerDeleted");
}

export async function mergeBookPlayers(formData: FormData) {
  await requireOwner();
  const { mergePlayers } = await import("@/lib/merge");
  const keep = int(formData, "keepId");
  const drop = int(formData, "dropId");
  const r = await mergePlayers(keep, drop);
  revalidatePath("/admin", "layout");
  if (r === "bothPlayed") redirect(`/admin/players/${keep}?err=errBothPlayed`);
  redirect(`/admin/players/${keep}?msg=playersMerged`);
}
