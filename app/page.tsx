import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

async function databaseOk() {
  try {
    await pool.query("select 1");
    return true;
  } catch {
    return false;
  }
}

export default async function Home() {
  const ok = await databaseOk();
  return (
    <main className="shell">
      <section className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/domino/domino-logo.svg" alt="" className="logo" />
        <h1>Domino Tournament</h1>
        <p className="lead">Rotations, scores and live standings — coming soon.</p>
      </section>
      <section className="card">
        <div className="row">
          <span>App</span>
          <span className="pill ok">Online</span>
        </div>
        <div className="row">
          <span>Database</span>
          <span className={`pill ${ok ? "ok" : "bad"}`}>{ok ? "Connected" : "Not connected"}</span>
        </div>
      </section>
    </main>
  );
}
