"use client";

import { useState } from "react";

type Row = { n: number; a: string; b: string; status: string; statusLabel: string; score: string | null; mine: boolean };

const pillClass: Record<string, string> = { CONFIRMED: "ok", SUBMITTED: "warn", DISPUTED: "bad", IN_PROGRESS: "", NOT_STARTED: "" };

function norm(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// All tables of a round with a "find a player" search.
export default function TablesList({ rows, labels }: { rows: Row[]; labels: { search: string; noMatch: string; vs: string } }) {
  const [q, setQ] = useState("");
  const needle = norm(q.trim());
  const shown = needle ? rows.filter((r) => norm(`${r.a} ${r.b}`).includes(needle)) : rows;
  return (
    <div className="stack" style={{ gap: 8 }}>
      <label className="sr-only" htmlFor="find">{labels.search}</label>
      <input id="find" type="search" placeholder={labels.search} value={q} onChange={(e) => setQ(e.target.value)} />
      {shown.length === 0 && <p className="help">{labels.noMatch}</p>}
      {shown.map((r) => (
        <div key={r.n} className={`tablerow${needle || r.mine ? " hit" : ""}`}>
          <span className="num">{r.n}</span>
          <div className="who">
            <div>{r.a}</div>
            <div className="b">{labels.vs} {r.b}</div>
          </div>
          <span className={`pill ${pillClass[r.status] ?? ""}`}>{r.score ?? r.statusLabel}</span>
        </div>
      ))}
    </div>
  );
}
