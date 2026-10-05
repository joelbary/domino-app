import { fileResponse } from "@/lib/fileResponse";
import { generalRulesFile } from "@/lib/rules";

export const dynamic = "force-dynamic";

export async function GET() {
  const r = await generalRulesFile();
  return fileResponse(r?.file, r?.type, r?.name);
}
