"use client";

import { useEffect, useMemo, useState } from "react";

type P = { id: number; first: string; name: string; phone: string; display: string };
type L = Record<
  "message" | "messageHelp" | "groupTitle" | "groupHelp" | "groupBtn" | "oneByOne" | "oneByOneHelp" | "whatsapp" | "text" |
  "sent" | "progress" | "copyNumbers" | "copied" | "resetSent" | "noPhoneList" | "noPlayers",
  string
>;

// Builds a "text everyone" link. iPhone and Android use different formats for several numbers.
function groupSms(numbers: string[], body: string, ios: boolean) {
  const b = encodeURIComponent(body);
  return ios ? `sms:/open?addresses=${numbers.join(",")}&body=${b}` : `sms:${numbers.join(",")}?body=${b}`;
}
function oneSms(number: string, body: string, ios: boolean) {
  return `sms:${number}${ios ? "&" : "?"}body=${encodeURIComponent(body)}`;
}
const fill = (msg: string, first: string) =>
  first ? msg.replaceAll("{name}", first) : msg.replaceAll("{name}", "").replace(/[ \t]+([,!.?])/g, "$1").replace(/[ \t]{2,}/g, " ");

export default function MessagePlayers({ storeKey, defaultMessage, players, noPhone, labels: t }: {
  storeKey: string; defaultMessage: string; players: P[]; noPhone: string[]; labels: L;
}) {
  const [msg, setMsg] = useState(defaultMessage);
  const [sent, setSent] = useState<number[]>([]);
  const [copied, setCopied] = useState(false);
  const [ios, setIos] = useState(false);
  // Remembered on this phone only (the draft and who was already messaged).
  useEffect(() => {
    setIos(/iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent));
    try {
      const m = localStorage.getItem(`${storeKey}:msg`);
      if (m) setMsg(m);
      const s = localStorage.getItem(`${storeKey}:sent`);
      if (s) setSent(JSON.parse(s));
    } catch {}
  }, [storeKey]);
  const saveMsg = (v: string) => { setMsg(v); try { localStorage.setItem(`${storeKey}:msg`, v); } catch {} };
  const mark = (id: number) => {
    setSent((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      try { localStorage.setItem(`${storeKey}:sent`, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const toggle = (id: number) => {
    setSent((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem(`${storeKey}:sent`, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const reset = () => { setSent([]); try { localStorage.removeItem(`${storeKey}:sent`); } catch {} };
  const numbers = useMemo(() => players.map((p) => p.phone), [players]);

  if (!players.length) return <p className="help">{t.noPlayers}</p>;

  return (
    <div className="stack">
      <section className="card stack">
        <label className="field">{t.message}
          <textarea rows={7} value={msg} onChange={(e) => saveMsg(e.target.value)} style={{ fontSize: 16, lineHeight: 1.4, fontFamily: "inherit" }} />
        </label>
        <p className="help">{t.messageHelp}</p>
      </section>

      <section className="card stack">
        <h2>{t.groupTitle}</h2>
        <p className="help">{t.groupHelp}</p>
        <a className="btn block" href={groupSms(numbers, fill(msg, ""), ios)}>{t.groupBtn}</a>
        <button type="button" className="btn ghost block" onClick={async () => {
          try { await navigator.clipboard.writeText(numbers.join(", ")); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
        }}>{copied ? t.copied : t.copyNumbers}</button>
      </section>

      <section className="card stack">
        <h2>{t.oneByOne}</h2>
        <p className="help">{t.oneByOneHelp}</p>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <strong>{t.progress.replace("{s}", String(sent.length)).replace("{n}", String(players.length))}</strong>
          {sent.length > 0 && <button type="button" className="btn ghost small" onClick={reset}>{t.resetSent}</button>}
        </div>
        <div className="list">
          {players.map((p) => {
            const done = sent.includes(p.id);
            const body = fill(msg, p.first);
            return (
              <div key={p.id} className="item" style={{ padding: "10px 12px", gap: 8, flexWrap: "wrap", opacity: done ? 0.55 : 1 }}>
                <button type="button" onClick={() => toggle(p.id)} aria-pressed={done} aria-label={t.sent}
                  style={{ width: 28, height: 28, borderRadius: 14, border: "2px solid var(--felt)", background: done ? "var(--felt)" : "transparent", color: "var(--paper)", fontWeight: 700, flex: "none", cursor: "pointer" }}>
                  {done ? "✓" : ""}
                </button>
                <span className="main" style={{ minWidth: 120 }}>
                  <span className="name">{p.name}</span>
                  <span className="meta">{p.display}</span>
                </span>
                <span style={{ display: "flex", gap: 6 }}>
                  <a className="btn small" style={{ background: "#1f7a4d" }} href={`https://wa.me/${p.phone.replace(/\D/g, "")}?text=${encodeURIComponent(body)}`} target="_blank" rel="noopener noreferrer" onClick={() => mark(p.id)}>{t.whatsapp}</a>
                  <a className="btn small ghost" href={oneSms(p.phone, body, ios)} onClick={() => mark(p.id)}>{t.text}</a>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {noPhone.length > 0 && (
        <div className="notice warn">{t.noPhoneList} {noPhone.join(", ")}</div>
      )}
    </div>
  );
}
