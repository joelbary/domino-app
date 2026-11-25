import { adminTournament } from "@/lib/access";
import { qrPng, tournamentUrl } from "@/lib/qr";

export const dynamic = "force-dynamic";

// Downloads the tournament's QR code as a PNG image (for printing or sharing).
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tour } = await adminTournament(slug);
  const png = await qrPng(tournamentUrl(tour.slug));
  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename="${tour.slug}-qr.png"` },
  });
}
