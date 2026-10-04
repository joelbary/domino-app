"use server";

import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { gameTables, hands } from "@/db/schema";
import { endPlayerSession, getPlayerId, startPlayerSession } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { findPlayerByPhone, myEntry, sideOf, tableContext } from "@/lib/play";

export type PlayState = { error?: string };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string) => parseInt(str(f, k), 10);

function safeBack(path: string) {
  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}

export async function playerSignIn(_: PlayState, formData: FormData): Promise<PlayState> {
  const { t } = await getT();
  const player = await findPlayerByPhone(str(formData, "phone"));
  if (!player) return { error: t("phoneNotFound") };
  await startPlayerSession(player.id);
  redirect(safeBack(str(formData, "back")));
}

export async function playerSignOut(formData: FormData) {
  await endPlayerSession();
  redirect(safeBack(str(formData, "back")));
}

// Checks the signed-in player sits at this table in a live round; returns context or an error key.
async function seat(tableId: number) {
  const pid = await getPlayerId();
  const ctx = await tableContext(tableId);
  if (!pid || !ctx) return { err: "errNotSeated" as const };
  const entry = await myEntry(ctx.tour.id, pid);
  const side = entry ? sideOf(ctx.t, entry.id) : null;
  if (!entry || !side || ctx.r.status !== "LIVE") return { err: "errNotSeated" as const };
  return { ctx, entry, side };
}

function done(slug: string, err?: string): never {
  revalidatePath(`/${slug}`, "layout");
  revalidatePath(`/admin/t/${slug}`, "layout");
  redirect(`/${slug}/score${err ? `?err=${err}` : ""}`);
}

async function recompute(tableId: number) {
  const hs = await db.select().from(hands).where(eq(hands.gameTableId, tableId));
  const a = hs.filter((h) => h.pair === "A").reduce((s, h) => s + h.points, 0);
  const b = hs.filter((h) => h.pair === "B").reduce((s, h) => s + h.points, 0);
  await db
    .update(gameTables)
    .set(hs.length
      ? { scoreA: a, scoreB: b, status: "IN_PROGRESS", submittedBy: null, submittedAt: null }
      : { scoreA: null, scoreB: null, status: "NOT_STARTED", submittedBy: null, submittedAt: null })
    .where(eq(gameTables.id, tableId));
}

const editable = (status: string) => status !== "CONFIRMED";

export async function addHand(formData: FormData) {
  const tableId = int(formData, "tableId");
  const s = await seat(tableId);
  const slug = str(formData, "slug");
  if ("err" in s) done(slug, s.err);
  if (!editable(s.ctx.t.status)) done(slug, "errLocked");
  const pair = str(formData, "pair") === "B" ? "B" : "A";
  const points = int(formData, "points");
  if (!Number.isFinite(points) || points < 1 || points > 300) done(slug, "errPoints");
  const [{ n }] = await db.select({ n: max(hands.handNumber) }).from(hands).where(eq(hands.gameTableId, tableId));
  await db.insert(hands).values({ gameTableId: tableId, handNumber: (n ?? 0) + 1, pair, points });
  await recompute(tableId);
  done(slug);
}

export async function editHand(formData: FormData) {
  const tableId = int(formData, "tableId");
  const s = await seat(tableId);
  const slug = str(formData, "slug");
  if ("err" in s) done(slug, s.err);
  if (!editable(s.ctx.t.status)) done(slug, "errLocked");
  const handId = int(formData, "handId");
  if (str(formData, "delete") === "1") {
    await db.delete(hands).where(and(eq(hands.id, handId), eq(hands.gameTableId, tableId)));
  } else {
    const pair = str(formData, "pair") === "B" ? "B" : "A";
    const points = int(formData, "points");
    if (!Number.isFinite(points) || points < 1 || points > 300) done(slug, "errPoints");
    await db.update(hands).set({ pair, points }).where(and(eq(hands.id, handId), eq(hands.gameTableId, tableId)));
  }
  await recompute(tableId);
  done(slug);
}

export async function setFinalScore(formData: FormData) {
  const tableId = int(formData, "tableId");
  const s = await seat(tableId);
  const slug = str(formData, "slug");
  if ("err" in s) done(slug, s.err);
  if (!editable(s.ctx.t.status)) done(slug, "errLocked");
  const A = int(formData, "scoreA");
  const B = int(formData, "scoreB");
  if (![A, B].every((x) => Number.isFinite(x) && x >= 0 && x <= 999)) done(slug, "errScore");
  await db.delete(hands).where(eq(hands.gameTableId, tableId));
  await db
    .update(gameTables)
    .set({ scoreA: A, scoreB: B, status: "IN_PROGRESS", submittedBy: null, submittedAt: null })
    .where(eq(gameTables.id, tableId));
  done(slug);
}

export async function submitScore(formData: FormData) {
  const tableId = int(formData, "tableId");
  const s = await seat(tableId);
  const slug = str(formData, "slug");
  if ("err" in s) done(slug, s.err);
  if (!editable(s.ctx.t.status)) done(slug, "errLocked");
  if (s.ctx.t.scoreA === null || s.ctx.t.scoreB === null) done(slug, "errNeedScore");
  await db
    .update(gameTables)
    .set({ status: "SUBMITTED", submittedBy: s.entry.id, submittedAt: new Date() })
    .where(eq(gameTables.id, tableId));
  done(slug);
}

// Only a player from the OTHER pair can confirm or dispute.
async function opposite(formData: FormData) {
  const tableId = int(formData, "tableId");
  const s = await seat(tableId);
  const slug = str(formData, "slug");
  if ("err" in s) done(slug, s.err);
  const t = s.ctx.t;
  if (t.status !== "SUBMITTED" || !t.submittedBy) done(slug);
  if (sideOf(t, t.submittedBy) === s.side) done(slug, "errNotSeated");
  return { tableId, slug, entry: s.entry };
}

export async function confirmScore(formData: FormData) {
  const { tableId, slug, entry } = await opposite(formData);
  await db.update(gameTables).set({ status: "CONFIRMED", confirmedBy: entry.id, confirmedAt: new Date() }).where(eq(gameTables.id, tableId));
  done(slug);
}

export async function disputeScore(formData: FormData) {
  const { tableId, slug } = await opposite(formData);
  await db.update(gameTables).set({ status: "DISPUTED" }).where(eq(gameTables.id, tableId));
  done(slug);
}
