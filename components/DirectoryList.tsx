"use client";

import Link from "next/link";
import { useState } from "react";

type Row = { id: number; name: string; phone: string; tournaments: number; games: number; wlt: string; best: string; titles: number };

function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export default function DirectoryList({ rows, labels }: { rows: Row[]; labels: Record<string, string> }) {
  const [q, setQ] = useState("");
  const needle = norm(q.trim());
  const shown = needle ? rows.filter((r) => norm(r.name).includes(needle) || r.phone.replace(/\D/g, "").includes(q.replace(/\D/g, "") || "~")) : rows;
  return (
    <div className="stack">
      <input type="search" placeholder={labels.search} aria-label={labels.search} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="list">
        {shown.map((r) => (
          <Link key={r.id} href={`/admin/players/${r.id}`} className="item">
            <span className="main">
              <span className="name">{r.name}{r.titles ? <span className="pill live" style={{ marginLeft: 8, fontSize: 11 }}>{labels.titles} {r.titles}</span> : null}</span>
              <span className="meta">{r.phone || labels.noPhone} · {r.tournaments} {labels.tournaments.toLowerCase()} · {r.games} {labels.games.toLowerCase()}</span>
            </span>
            <span style={{ textAlign: "right", flex: "none" }}>
              <span style={{ display: "block", fontWeight: 700 }}>{r.wlt}</span>
              <span className="meta">{r.best}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
