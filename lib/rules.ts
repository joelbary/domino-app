import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { generalRules, tournaments } from "@/db/schema";

export const RULE_FILE_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
export const RULE_FILE_MAX = 10 * 1024 * 1024;

export async function getGeneralRules() {
  const [r] = await db
    .select({ text: generalRules.text, fileType: generalRules.fileType, fileName: generalRules.fileName, updatedAt: generalRules.updatedAt })
    .from(generalRules)
    .where(eq(generalRules.id, 1))
    .limit(1);
  return r ?? null;
}

// The rules players see for a tournament: its own if it has any, otherwise the general rules.
export async function rulesFor(tour: { id: number; rulesText: string | null; hasRulesFile: boolean; rulesFileType: string | null; rulesFileName: string | null; slug: string; updatedAt: Date }) {
  if (tour.rulesText || tour.hasRulesFile) {
    return {
      own: true, text: tour.rulesText,
      file: tour.hasRulesFile ? { url: `/t/${tour.slug}/rules-file?v=${tour.updatedAt.getTime()}`, type: tour.rulesFileType ?? "", name: tour.rulesFileName ?? "rules" } : null,
    };
  }
  const g = await getGeneralRules();
  if (!g || (!g.text && !g.fileType)) return null;
  return {
    own: false, text: g.text,
    file: g.fileType ? { url: `/rules-file?v=${g.updatedAt.getTime()}`, type: g.fileType, name: g.fileName ?? "rules" } : null,
  };
}

export async function tournamentRulesFile(slug: string) {
  const [r] = await db
    .select({ file: tournaments.rulesFile, type: tournaments.rulesFileType, name: tournaments.rulesFileName })
    .from(tournaments)
    .where(eq(tournaments.slug, slug))
    .limit(1);
  return r ?? null;
}

export async function generalRulesFile() {
  const [r] = await db.select({ file: generalRules.file, type: generalRules.fileType, name: generalRules.fileName }).from(generalRules).where(eq(generalRules.id, 1)).limit(1);
  return r ?? null;
}
