import { requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();
  const csv = "﻿First name,Last name,Phone,Team\nJuan,Pérez,(305) 555-0100,1\nAna,Gómez,(786) 555-0101,2\n";
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="players-template.csv"' },
  });
}
