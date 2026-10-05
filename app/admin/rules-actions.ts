"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { generalRules, tournaments } from "@/db/schema";
import { adminTournamentById } from "@/lib/access";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { RULE_FILE_MAX, RULE_FILE_TYPES } from "@/lib/rules";
import type { FormState } from "./actions";

async function readRules(formData: FormData) {
  const { t } = await getT();
  const text = String(formData.get("text") ?? "").trim() || null;
  const file = formData.get("file");
  const remove = formData.get("removeFile") === "on";
  let upload: { file: Buffer; type: string; name: string } | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > RULE_FILE_MAX || !RULE_FILE_TYPES.has(file.type)) return { error: t("errRulesFile") };
    upload = { file: Buffer.from(await file.arrayBuffer()), type: file.type, name: file.name };
  }
  return { text, upload, remove };
}

export async function saveGeneralRules(_: FormState, formData: FormData): Promise<FormState> {
  await requireOwner();
  const { t } = await getT();
  const r = await readRules(formData);
  if ("error" in r) return { error: r.error };
  const fileCols = r.upload
    ? { file: r.upload.file, fileType: r.upload.type, fileName: r.upload.name }
    : r.remove ? { file: null, fileType: null, fileName: null } : {};
  await db
    .insert(generalRules)
    .values({ id: 1, text: r.text, ...fileCols, updatedAt: new Date() })
    .onConflictDoUpdate({ target: generalRules.id, set: { text: r.text, ...fileCols, updatedAt: new Date() } });
  revalidatePath("/", "layout");
  return { ok: t("saved") };
}

export async function saveTournamentRules(_: FormState, formData: FormData): Promise<FormState> {
  const { tour } = await adminTournamentById(parseInt(String(formData.get("tournamentId")), 10) || 0);
  const { t } = await getT();
  const r = await readRules(formData);
  if ("error" in r) return { error: r.error };
  const fileCols = r.upload
    ? { rulesFile: r.upload.file, rulesFileType: r.upload.type, rulesFileName: r.upload.name }
    : r.remove ? { rulesFile: null, rulesFileType: null, rulesFileName: null } : {};
  await db.update(tournaments).set({ rulesText: r.text, ...fileCols, updatedAt: new Date() }).where(eq(tournaments.id, tour.id));
  revalidatePath(`/${tour.slug}`, "layout");
  revalidatePath(`/admin/t/${tour.slug}`, "layout");
  return { ok: t("saved") };
}
