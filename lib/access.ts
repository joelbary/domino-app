import "server-only";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { tournamentAdmins, tournaments } from "@/db/schema";
import { requireAdmin, type AdminSession } from "@/lib/auth";
import { tournamentCols } from "@/lib/tournaments";

type Tour = Awaited<ReturnType<typeof loadTour>>;

async function loadTour(where: ReturnType<typeof eq>) {
  const [tour] = await db.select(tournamentCols).from(tournaments).where(where).limit(1);
  return tour;
}

// Can this admin manage this tournament? The main admin can manage everything; a co-admin only
// the tournaments they created or were added to.
export async function canManage(s: AdminSession, tour: { id: number; createdByAdminId: number | null }): Promise<boolean> {
  if (s.role === "owner") return true;
  if (tour.createdByAdminId === s.aid) return true;
  const [row] = await db
    .select({ id: tournamentAdmins.id })
    .from(tournamentAdmins)
    .where(and(eq(tournamentAdmins.tournamentId, tour.id), eq(tournamentAdmins.adminId, s.aid ?? 0)))
    .limit(1);
  return !!row;
}

// For admin pages: the signed-in admin + the tournament, or 404 if they can't manage it.
export async function adminTournament(slug: string): Promise<{ session: AdminSession; tour: NonNullable<Tour> }> {
  const session = await requireAdmin();
  const tour = await loadTour(eq(tournaments.slug, slug));
  if (!tour || !(await canManage(session, tour))) notFound();
  return { session, tour };
}

// For server actions: same check, by id.
export async function adminTournamentById(id: number): Promise<{ session: AdminSession; tour: NonNullable<Tour> }> {
  const session = await requireAdmin();
  const tour = await loadTour(eq(tournaments.id, id));
  if (!tour || !(await canManage(session, tour))) throw new Error("Not allowed");
  return { session, tour };
}

// Ids of the tournaments this admin may see in the admin list (null = all).
export async function manageableIds(s: AdminSession): Promise<number[] | null> {
  if (s.role === "owner") return null;
  const assigned = await db.select({ id: tournamentAdmins.tournamentId }).from(tournamentAdmins).where(eq(tournamentAdmins.adminId, s.aid ?? 0));
  const own = await db.select({ id: tournaments.id }).from(tournaments).where(eq(tournaments.createdByAdminId, s.aid ?? 0));
  return [...new Set([...assigned, ...own].map((r) => r.id))];
}


