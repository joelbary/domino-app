"use client";

import { useEffect, useState } from "react";

// Greeting + short how-to after a player signs in. "Got it" hides it on this phone;
// "How the app works" brings it back.
export default function WelcomeCard({ storeKey, title, steps, gotIt, reopen }: {
  storeKey: string; title: string; steps: string[]; gotIt: string; reopen: string;
}) {
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => {
    let hidden = false;
    try { hidden = localStorage.getItem(storeKey) === "1"; } catch {}
    setOpen(!hidden);
  }, [storeKey]);
  const set = (v: boolean) => {
    setOpen(v);
    try { if (v) localStorage.removeItem(storeKey); else localStorage.setItem(storeKey, "1"); } catch {}
  };
  if (open === null) return null;
  if (!open) {
    return (
      <button type="button" onClick={() => set(true)} className="btn ghost small" style={{ alignSelf: "flex-start" }}>
        {reopen}
      </button>
    );
  }
  return (
    <section className="card stack welcome">
      <h2 style={{ fontSize: 24, margin: 0 }}>{title}</h2>
      <ol style={{ margin: 0, paddingLeft: 22, display: "grid", gap: 8, fontSize: 16, lineHeight: 1.4 }}>
        {steps.map((s) => <li key={s}>{s}</li>)}
      </ol>
      <button type="button" className="btn block" onClick={() => set(false)}>{gotIt}</button>
    </section>
  );
}
