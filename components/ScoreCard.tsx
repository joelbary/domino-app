"use client";

import { useState } from "react";
import { addHand, confirmScore, disputeScore, editHand, setFinalScore, submitScore } from "@/app/play-actions";

type Hand = { id: number; n: number; pair: "A" | "B"; points: number };
type Props = {
  slug: string; tableId: number; mySide: "A" | "B";
  pairA: string; pairB: string; scoreA: number | null; scoreB: number | null;
  status: string; submittedBySide: "A" | "B" | null; submittedByName: string | null; hands: Hand[];
  L: Record<string, string>;
};

const fill = (s: string, v: Record<string, string | number>) => Object.entries(v).reduce((acc, [k, x]) => acc.replaceAll(`{${k}}`, String(x)), s);

export default function ScoreCard(p: Props) {
  const { L } = p;
  const locked = p.status === "CONFIRMED";
  const [mode, setMode] = useState<"hands" | "final">(p.hands.length === 0 && p.scoreA !== null ? "final" : "hands");
  const [sheet, setSheet] = useState<null | { pair: "A" | "B"; hand?: Hand }>(null);
  const [correcting, setCorrecting] = useState(false);
  const a = p.scoreA ?? 0;
  const b = p.scoreB ?? 0;
  const theySubmitted = p.status === "SUBMITTED" && p.submittedBySide && p.submittedBySide !== p.mySide;
  const weSubmitted = p.status === "SUBMITTED" && p.submittedBySide === p.mySide;
  // While checking the other pair's submitted score, editing is behind a "Correct the score" button.
  const canEdit = !locked && (!theySubmitted || correcting);
  const reached = a >= 100 ? p.pairA : b >= 100 ? p.pairB : null;
  const pct = (x: number) => `${Math.min(100, x)}%`;
  const hidden = (
    <>
      <input type="hidden" name="slug" value={p.slug} />
      <input type="hidden" name="tableId" value={p.tableId} />
    </>
  );

  return (
    <div className="stack">
      {p.status === "CONFIRMED" && <div className="notice ok">{L.confirmedFinal}</div>}
      {p.status === "DISPUTED" && <div className="notice bad">{L.disputedMsg}</div>}
      {weSubmitted && <div className="notice warn">{L.waitingOpp}</div>}

      {theySubmitted && (
        <section className="card stack" style={{ border: "2px solid var(--amber)" }}>
          <div className="notice warn">{L.oppSubmitted}</div>
          <div className="spread"><span style={{ fontWeight: 600 }}>{p.pairA}</span><span className="total" style={{ fontFamily: "var(--display)", fontSize: 40, fontWeight: 700, color: "var(--felt)" }}>{a}</span></div>
          <div className="spread"><span style={{ fontWeight: 600 }}>{p.pairB}</span><span style={{ fontFamily: "var(--display)", fontSize: 40, fontWeight: 700 }}>{b}</span></div>
          {p.submittedByName && <p className="help">{fill(L.submittedBy, { name: p.submittedByName })}</p>}
          <form action={confirmScore}>{hidden}<button className="btn big block">{L.confirmScore}</button></form>
          {!correcting && <button type="button" className="btn ghost block" onClick={() => setCorrecting(true)}>{L.correctScore}</button>}
          {correcting && <p className="help">{L.correctHelp}</p>}
          <form action={disputeScore}>{hidden}<button className="btn danger block small">{L.wrongScore}</button></form>
        </section>
      )}

      {canEdit && (
        <div className="seg" role="tablist" aria-label={L.handByHand}>
          <label><input type="radio" name="mode" checked={mode === "hands"} onChange={() => setMode("hands")} />{L.handByHand}</label>
          <label><input type="radio" name="mode" checked={mode === "final"} onChange={() => setMode("final")} />{L.finalOnly}</label>
        </div>
      )}

      {(mode === "hands" || !canEdit) && (!theySubmitted || correcting) && (
        <>
          <div className="grid2">
            {(["A", "B"] as const).map((side) => (
              <div key={side} className={`scorepair ${side === "A" ? "a" : "b"}`}>
                <div className="names">{side === "A" ? p.pairA : p.pairB}{p.mySide === side ? ` (${L.you})` : ""}</div>
                <div className="total">{side === "A" ? a : b}</div>
                <div className="bar100"><span style={{ width: pct(side === "A" ? a : b) }} /></div>
                {canEdit && (
                  <button type="button" className={`btn block ${side === "A" ? "" : ""}`} style={side === "A" ? { background: "var(--paper)", color: "var(--felt)", marginTop: 6 } : { marginTop: 6 }} onClick={() => setSheet({ pair: side })}>
                    {L.addHand}
                  </button>
                )}
              </div>
            ))}
          </div>
          {reached && canEdit && <div className="notice ok">{fill(L.reached100, { pair: reached })}</div>}
          {canEdit && (
            <>
              <div className="spread"><h2 style={{ fontSize: 20 }}>{L.hands}</h2>{p.hands.length > 0 && <span className="help">{L.tapToFix}</span>}</div>
              {p.hands.length === 0 && <p className="help">{L.noHands}</p>}
              <div className="list">
                {[...p.hands].reverse().map((h) => (
                  <div key={h.id} className="handrow">
                    <span className="n">{fill(L.hand, { n: h.n })}</span>
                    <span className="pa">{h.pair === "A" ? `+${h.points}` : "—"}</span>
                    <span className="pb">{h.pair === "B" ? `+${h.points}` : "—"}</span>
                    <button type="button" className="icon-btn" aria-label={fill(L.fixHand, { n: h.n })} onClick={() => setSheet({ pair: h.pair, hand: h })} style={{ border: 0, background: "transparent", cursor: "pointer", color: "var(--ink-2)" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {mode === "final" && canEdit && (
        <form action={setFinalScore} className="card stack">
          {hidden}
          <h2 style={{ fontSize: 18 }}>{L.enterFinal}</h2>
          <div className="grid2">
            <label className="field" style={{ fontWeight: 500, fontSize: 13 }}>{p.pairA}
              <input type="number" name="scoreA" inputMode="numeric" min={0} max={999} required defaultValue={p.scoreA ?? ""} className="bigscore" />
            </label>
            <label className="field" style={{ fontWeight: 500, fontSize: 13 }}>{p.pairB}
              <input type="number" name="scoreB" inputMode="numeric" min={0} max={999} required defaultValue={p.scoreB ?? ""} className="bigscore" />
            </label>
          </div>
          <p className="help">{L.finalHelp}{p.hands.length ? ` ${L.editAfterSubmit}` : ""}</p>
          <button className="btn block ghost">{L.saveFinal}</button>
        </form>
      )}

      {!locked && !theySubmitted && !weSubmitted && (
        <form action={submitScore} className="stack" style={{ gap: 6 }}>
          {hidden}
          <button className="btn big amber block" disabled={p.scoreA === null}>{L.submitScore}</button>
          <p className="help" style={{ textAlign: "center" }}>{L.submitHelp}</p>
        </form>
      )}
      {weSubmitted && <p className="help" style={{ textAlign: "center" }}>{L.editAfterSubmit}</p>}

      {sheet && (
        <>
          <div className="sheet-back" onClick={() => setSheet(null)} />
          <form action={sheet.hand ? editHand : addHand} className="sheet" onSubmit={() => setTimeout(() => setSheet(null), 50)}>
            {hidden}
            {sheet.hand && <input type="hidden" name="handId" value={sheet.hand.id} />}
            <div className="grab" />
            <h2 style={{ fontSize: 24 }}>{sheet.hand ? fill(L.fixHand, { n: sheet.hand.n }) : fill(L.addHandFor, { pair: sheet.pair === "A" ? p.pairA : p.pairB })}</h2>
            {sheet.hand && (
              <div className="seg" role="radiogroup" aria-label={L.whoWon}>
                <label><input type="radio" name="pair" value="A" defaultChecked={sheet.pair === "A"} />{p.pairA}</label>
                <label><input type="radio" name="pair" value="B" defaultChecked={sheet.pair === "B"} />{p.pairB}</label>
              </div>
            )}
            {!sheet.hand && <input type="hidden" name="pair" value={sheet.pair} />}
            <label className="field">{L.points}
              <input type="number" name="points" inputMode="numeric" min={1} max={300} required autoFocus defaultValue={sheet.hand?.points ?? ""} className="bigscore" />
            </label>
            <div className="grid2">
              {sheet.hand ? (
                <button name="delete" value="1" className="btn danger" formNoValidate>{L.deleteHand}</button>
              ) : (
                <button type="button" className="btn dark" onClick={() => setSheet(null)}>{L.cancel}</button>
              )}
              <button className="btn">{L.save}</button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
