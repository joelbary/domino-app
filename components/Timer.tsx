"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  roundId: number; round: number; endsAt: string | null; remaining: number | null; serverNow: number;
  alert?: boolean; scoreHref?: string; variant?: "chip" | "big";
  labels: { left: string; up: string; paused: string; title: string; body: string; go: string; ok: string };
};

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.45, 0.9].forEach((at) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + at);
      g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + at);
      o.stop(ctx.currentTime + at + 0.4);
    });
  } catch {}
  try { navigator.vibrate?.([400, 150, 400, 150, 400]); } catch {}
}

// Countdown shown to everyone. When it reaches zero on a player's screen, a full-screen TIME! alert appears once.
export default function Timer(p: Props) {
  const offset = useRef(p.serverNow - Date.now());
  const [now, setNow] = useState(() => Date.now() + offset.current);
  const [showAlert, setShowAlert] = useState(false);
  const end = p.endsAt ? new Date(p.endsAt).getTime() : null;
  const left = end !== null ? Math.max(0, Math.ceil((end - now) / 1000)) : null;
  const key = `timeup-${p.roundId}-${p.endsAt}`;

  useEffect(() => {
    offset.current = p.serverNow - Date.now();
  }, [p.serverNow]);

  useEffect(() => {
    if (end === null) return;
    const id = setInterval(() => setNow(Date.now() + offset.current), 500);
    return () => clearInterval(id);
  }, [end]);

  useEffect(() => {
    if (!p.alert || end === null || left !== 0) return;
    let seen = false;
    try { seen = sessionStorage.getItem(key) === "1"; } catch {}
    // Only alert if time ran out in the last 3 minutes and this phone hasn't been alerted yet.
    if (!seen && now - end < 180_000) {
      setShowAlert(true);
      beep();
      try { sessionStorage.setItem(key, "1"); } catch {}
    }
  }, [left, end, now, key, p.alert]);

  if (end === null && p.remaining === null) return null;
  const text = end === null ? `${p.labels.paused} · ${fmt(p.remaining ?? 0)}` : left === 0 ? p.labels.up : p.labels.left.replace("{t}", fmt(left!));
  const urgent = end !== null && left !== null && left <= 60;

  return (
    <>
      {p.variant === "big" ? (
        <div className="timer-big" aria-live="polite">{end === null ? fmt(p.remaining ?? 0) : left === 0 ? p.labels.up : fmt(left!)}</div>
      ) : (
        <span className={`timer-chip${urgent ? " urgent" : ""}${end === null ? " paused" : ""}`} aria-live="polite">{text}</span>
      )}
      {showAlert && (
        <div className="timeup" role="alertdialog" aria-modal="true" aria-labelledby="timeup-title">
          <svg width="84" height="84" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9 2h6M12 2v3" /></svg>
          <div id="timeup-title" className="timeup-title">{p.labels.title}</div>
          <p>{p.labels.body.replace("{r}", String(p.round))}</p>
          {p.scoreHref && <a href={p.scoreHref} className="btn big block" style={{ background: "#fff", color: "#8a2215" }}>{p.labels.go}</a>}
          <button className="btn big block ghost" style={{ borderColor: "#fff", color: "#fff" }} onClick={() => setShowAlert(false)}>{p.labels.ok}</button>
        </div>
      )}
    </>
  );
}
