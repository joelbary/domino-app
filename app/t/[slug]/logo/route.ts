import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { tournaments } from "@/db/schema";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Serves a tournament's uploaded logo, or the default domino tile.
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [tour] = await db.select({ logo: tournaments.logo, logoMimeType: tournaments.logoMimeType }).from(tournaments).where(eq(tournaments.slug, slug)).limit(1);
  const headers: Record<string, string> = {
    "Cache-Control": "public, max-age=300",
    // Uploaded SVGs can't run scripts.
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    "X-Content-Type-Options": "nosniff",
  };
  if (tour?.logo && tour.logoMimeType) {
    return new Response(new Uint8Array(tour.logo), { headers: { ...headers, "Content-Type": tour.logoMimeType } });
  }
  const svg = await readFile(path.join(process.cwd(), "public", "domino-logo.svg"));
  return new Response(new Uint8Array(svg), { headers: { ...headers, "Content-Type": "image/svg+xml" } });
}
