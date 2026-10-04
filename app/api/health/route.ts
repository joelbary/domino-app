import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

// Simple check that the app is running and can reach the database.
export async function GET() {
  try {
    await pool.query("select 1");
    return NextResponse.json({ ok: true, database: "connected" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ ok: false, database: "unreachable" }, { status: 500 });
  }
}
