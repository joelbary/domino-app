"use server";

import { and, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { gameTables, hands, rounds, tournaments } from "@/db/schema";
import { adminTournamentById } from "@/lib/access";
import { buildRandomRounds, buildSwissRound, hasScore, isFinal, loadRounds, reshuffleOneRound } from "@/lib/schedule";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string) => parseInt(str(f, k), 10) || 0;

// Loads the tournament and checks the signed-in admin may manage it.
async function load(formData: FormData) {
  return (await adminTournamentById(int(formData, "tournamentId"))).tour;
}

function back(slug: string, round: number | string, extra = ""): never {
  revalidatePath(`/admin/t/${slug}`, "layout");
  revalidatePath(`/${slug}`);
  redirect(`/admin/t/${slug}/tables?r=${round}${extra}`);
}

function errKey(e: unknown) {
  const m = e instanceof Error ? e.message : "";
  return m === "COUNT" ? "errCount" : m === "SCORED" ? "errScored" : "errGeneric";
}

export async function generateRotation(formData: FormData) {
  const tour = await load(formData);
  let repeats = 0;
  try {
    ({ repeats } = await buildRandomRounds(tour, 1));
  } catch (e) {
    back(tour.slug, 1, `&err=${errKey(e)}`);
  }
  back(tour.slug, 1, `&msg=rotationCreated&rep=${repeats}`);
}

export async function reshuffleRound(formData: FormData) {
  const tour = await load(formData);
  const number = int(formData, "number");
  const all = await loadRounds(tour.id);
  const round = all.find((r) => r.number === number);
  if (!round) back(tour.slug, number);
  if (round.tables.some(hasScore) || round.status === "CLOSED") back(tour.slug, number, "&err=errScored");
  let repeats = 0;
  try {
    if (round.isSwiss) {
      await db.delete(rounds).where(eq(rounds.id, round.id));
      await buildSwissRound(tour, number, round.status === "LIVE" ? "LIVE" : "PENDING");
    } else {
      ({ repeats } = await reshuffleOneRound(tour, number));
    }
  } catch (e) {
    back(tour.slug, number, `&err=${errKey(e)}`);
  }
  back(tour.slug, number, `&msg=reshuffled&rep=${repeats}`);
}

export async function swapPlayers(formData: FormData) {
  const tour = await load(formData);
  const number = int(formData, "number");
  const a = int(formData, "a");
  const b = int(formData, "b");
  const all = await loadRounds(tour.id);
  const round = all.find((r) => r.number === number);
  if (!round || !a || !b || a === b) back(tour.slug, number);
  const touched = round.tables.filter((t) => [t.a1, t.a2, t.b1, t.b2].some((x) => x === a || x === b));
  if (touched.length === 0) back(tour.slug, number);
  if (touched.some(hasScore)) back(tour.slug, number, "&err=errScored");
  const sw = (x: number) => (x === a ? b : x === b ? a : x);
  for (const t of touched) {
    await db.update(gameTables).set({ a1: sw(t.a1), a2: sw(t.a2), b1: sw(t.b1), b2: sw(t.b2) }).where(eq(gameTables.id, t.id));
  }
  back(tour.slug, number, "&msg=swapped");
}

export async function startTournament(formData: FormData) {
  const tour = await load(formData);
  const all = await loadRounds(tour.id);
  if (!all.length) back(tour.slug, 1, "&err=errNoRotation");
  await db.update(tournaments).set({ status: "LIVE", updatedAt: new Date() }).where(eq(tournaments.id, tour.id));
  if (!all.some((r) => r.status !== "PENDING")) {
    await db.update(rounds).set({ status: "LIVE" }).where(eq(rounds.id, all[0].id));
  }
  back(tour.slug, all[0].number, "&msg=started");
}

export async function saveScore(formData: FormData) {
  const tour = await load(formData);
  const tableId = int(formData, "tableId");
  const number = int(formData, "number");
  const rawA = str(formData, "scoreA");
  const rawB = str(formData, "scoreB");
  const [row] = await db
    .select({ t: gameTables, r: rounds })
    .from(gameTables)
    .innerJoin(rounds, eq(gameTables.roundId, rounds.id))
    .where(and(eq(gameTables.id, tableId), eq(rounds.tournamentId, tour.id)))
    .limit(1);
  if (!row) back(tour.slug, number);
  if (row.r.status === "PENDING") back(tour.slug, number, "&err=errNotLive");
  if (rawA === "" && rawB === "") {
    await db.delete(hands).where(eq(hands.gameTableId, tableId));
    await db.update(gameTables).set({ scoreA: null, scoreB: null, status: "NOT_STARTED", enteredByAdmin: false, confirmedAt: null, submittedBy: null, submittedAt: null }).where(eq(gameTables.id, tableId));
    back(tour.slug, number, `&msg=scoreCleared#t${row.t.number}`);
  }
  const A = parseInt(rawA, 10);
  const B = parseInt(rawB, 10);
  if (!Number.isFinite(A) || !Number.isFinite(B) || A < 0 || B < 0 || A > 999 || B > 999) back(tour.slug, number, `&err=errScore#t${row.t.number}`);
  // The organizer's score replaces any hand-by-hand entries, so players see the same numbers.
  await db.delete(hands).where(eq(hands.gameTableId, tableId));
  await db
    .update(gameTables)
    .set({ scoreA: A, scoreB: B, status: "CONFIRMED", enteredByAdmin: true, confirmedAt: new Date() })
    .where(eq(gameTables.id, tableId));
  back(tour.slug, number, `&msg=scoreSaved#t${row.t.number}`);
}

export async function closeRound(formData: FormData) {
  const tour = await load(formData);
  const number = int(formData, "number");
  const all = await loadRounds(tour.id);
  const round = all.find((r) => r.number === number);
  if (!round) back(tour.slug, number);
  if (!round.tables.every(isFinal)) back(tour.slug, number, "&err=errMissingScores");
  await db.update(rounds).set({ status: "CLOSED", timerEndsAt: null, timerRemainingSec: null }).where(eq(rounds.id, round.id));
  const next = all.find((r) => r.number === number + 1);
  if (next) {
    await db.update(rounds).set({ status: "LIVE" }).where(eq(rounds.id, next.id));
    back(tour.slug, number + 1, "&msg=roundClosed");
  }
  if (number < tour.gamesCount) {
    try {
      await buildSwissRound(tour, number + 1, "LIVE");
    } catch (e) {
      back(tour.slug, number, `&err=${errKey(e)}`);
    }
    back(tour.slug, number + 1, "&msg=swissCreated");
  }
  back(tour.slug, number, "&msg=lastRoundClosed");
}

// Reopens a closed round (to fix things) as long as the following round has no scores yet.
export async function reopenRound(formData: FormData) {
  const tour = await load(formData);
  const number = int(formData, "number");
  const all = await loadRounds(tour.id);
  const round = all.find((r) => r.number === number);
  if (!round || round.status !== "CLOSED") back(tour.slug, number);
  const later = all.filter((r) => r.number > number);
  if (later.some((r) => r.tables.some(hasScore))) back(tour.slug, number, "&err=errLaterScored");
  for (const r of later) {
    if (r.isSwiss) await db.delete(rounds).where(eq(rounds.id, r.id));
    else await db.update(rounds).set({ status: "PENDING" }).where(eq(rounds.id, r.id));
  }
  await db.update(rounds).set({ status: "LIVE" }).where(eq(rounds.id, round.id));
  back(tour.slug, number, "&msg=reopened");
}

// Deletes the whole rotation (only while no scores exist) so it can be created again.
export async function deleteRotation(formData: FormData) {
  const tour = await load(formData);
  const all = await loadRounds(tour.id);
  if (all.some((r) => r.tables.some(hasScore))) back(tour.slug, 1, "&err=errScored");
  await db.delete(rounds).where(and(eq(rounds.tournamentId, tour.id), gt(rounds.number, 0)));
  await db.update(tournaments).set({ status: "SETUP", updatedAt: new Date() }).where(eq(tournaments.id, tour.id));
  back(tour.slug, 1, "&msg=rotationDeleted");
}


// Round timer: start / pause / +5 min / end / reset. Players' screens count down from timerEndsAt.
export async function timerControl(formData: FormData) {
  const tour = await load(formData);
  const number = int(formData, "number");
  const op = str(formData, "op");
  const [round] = await db.select().from(rounds).where(and(eq(rounds.tournamentId, tour.id), eq(rounds.number, number))).limit(1);
  if (!round) back(tour.slug, number);
  const now = Date.now();
  const full = tour.roundMinutes * 60;
  const running = round.timerEndsAt !== null;
  let endsAt: Date | null = round.timerEndsAt;
  let remaining: number | null = round.timerRemainingSec;
  if (op === "start") {
    endsAt = new Date(now + (remaining ?? full) * 1000);
    remaining = null;
  } else if (op === "pause" && running) {
    remaining = Math.max(0, Math.round((round.timerEndsAt!.getTime() - now) / 1000));
    endsAt = null;
  } else if (op === "add5") {
    if (running) endsAt = new Date(Math.max(round.timerEndsAt!.getTime(), now) + 300_000);
    else remaining = (remaining ?? full) + 300;
  } else if (op === "end") {
    endsAt = new Date(now);
    remaining = null;
  } else if (op === "reset") {
    endsAt = null;
    remaining = null;
  }
  await db.update(rounds).set({ timerEndsAt: endsAt, timerRemainingSec: remaining }).where(eq(rounds.id, round.id));
  back(tour.slug, number, "#timer");
}

export async function setResultsPublished(formData: FormData) {
  const tour = await load(formData);
  const publish = str(formData, "publish") === "1";
  await db
    .update(tournaments)
    .set({ resultsPublished: publish, status: publish ? "FINISHED" : "LIVE", updatedAt: new Date() })
    .where(eq(tournaments.id, tour.id));
  revalidatePath(`/${tour.slug}`, "layout");
  revalidatePath(`/admin/t/${tour.slug}`, "layout");
  redirect(`/admin/t/${tour.slug}/standings`);
}

// Reopens one game (e.g. submitted too early) so the players can keep entering scores.
export async function reopenGame(formData: FormData) {
  const tour = await load(formData);
  const tableId = int(formData, "tableId");
  const number = int(formData, "number");
  const [row] = await db
    .select({ t: gameTables, r: rounds })
    .from(gameTables)
    .innerJoin(rounds, eq(gameTables.roundId, rounds.id))
    .where(and(eq(gameTables.id, tableId), eq(rounds.tournamentId, tour.id)))
    .limit(1);
  if (!row) back(tour.slug, number);
  if (row.r.status !== "LIVE") back(tour.slug, number, "&err=errNotLive");
  const scored = row.t.scoreA !== null && row.t.scoreB !== null;
  await db
    .update(gameTables)
    .set({
      status: scored ? "IN_PROGRESS" : "NOT_STARTED", submittedBy: null, submittedAt: null,
      confirmedBy: null, confirmedAt: null, enteredByAdmin: false,
    })
    .where(eq(gameTables.id, tableId));
  back(tour.slug, number, `&msg=gameReopened#t${row.t.number}`);
}
