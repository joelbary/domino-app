import { fileResponse } from "@/lib/fileResponse";
import { tournamentRulesFile } from "@/lib/rules";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await tournamentRulesFile(slug);
  return fileResponse(r?.file, r?.type, r?.name);
}
