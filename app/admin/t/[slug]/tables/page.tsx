import { adminTournament } from "@/lib/access";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdminBar from "@/components/AdminBar";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import SwipeRounds from "@/components/SwipeRounds";
import Timer from "@/components/Timer";
import { getT, type TKey } from "@/lib/i18n";
import {
  activeEntryIds, entryNames, forbiddenPairs, hasScore, isFinal, loadRounds, randomRoundCount, repeatsInRound, seatsOf, totalRepeats,
} from "@/lib/schedule";
import { listEntries } from "@/lib/tournaments";
import { whatsappDigits } from "@/lib/phone";
import {
  closeRound, deleteRotation, generateRotation, reopenRound, reshuffleRound, saveScore, startTournament, swapPlayers, timerControl,
} from "../../../schedule-actions";

export const dynamic = "force-dynamic";

const MSGS = new Set(["rotationCreated", "reshuffled", "swapped", "started", "scoreSaved", "scoreCleared", "roundClosed", "swissCreated", "lastRoundClosed", "reopened", "rotationDeleted"]);
const ERRS = new Set(["errCount", "errScored", "errNoRotation", "errNotLive", "errScore", "errMissingScores", "errLaterScored", "errGeneric"]);

export default async function TablesPage({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ r?: string; msg?: string; err?: string; rep?: string; f?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const { session, tour } = await adminTournament(slug);
  const { t, lang } = await getT();
  const base = `/admin/t/${tour.slug}`;
  const [all, names, active, forbidden] = await Promise.all([loadRounds(tour.id), entryNames(tour.id), activeEntryIds(tour.id), forbiddenPairs(tour)]);
  const nameOf = (id: number) => names.get(id)?.name ?? "?";
  const missingPhones = (await listEntries(tour.id)).filter((e) => !e.phone).length;
  const liveRound = all.find((r) => r.status === "LIVE")?.number;
  const selected = parseInt(sp.r ?? "", 10) || liveRound || 1;
  const round = all.find((r) => r.number === selected);
  const header = (
    <AdminBar title={t("rotationTitle")} sub={tour.name} back={{ href: base, label: t("backToTournament") }} lang={lang} here={`${base}/tables?r=${selected}`} langLabel={t("langToggle")} />
  );
  const notices = (
    <>
      {missingPhones > 0 && tour.status !== "FINISHED" && (
        <Link href={`${base}/players?nophone=1`} className="notice bad" style={{ textDecoration: "none" }}>
          {t("noPhoneWarn", { n: missingPhones })} {t("showNoPhone")} →
        </Link>
      )}
      {sp.msg && MSGS.has(sp.msg) && (
        sp.msg === "reshuffled" && Number(sp.rep) > 0
          ? <div className="notice warn" role="status">{t("reshuffledRepeats", { n: Number(sp.rep) })}</div>
          : <div className="notice ok" role="status">{t(sp.msg as TKey)}</div>
      )}
      {sp.err && ERRS.has(sp.err) && <div className="notice bad" role="alert">{t(sp.err as TKey)}</div>}
    </>
  );

  if (!all.length) {
    const n = active.length;
    return (
      <>
        {header}
        <main className="page">
          {notices}
          <section className="card stack">
            <h2>{t("noRotation")}</h2>
            <p className="help">{t("createRotationHelp", { n: randomRoundCount(tour) })}</p>
            {tour.rotationMode === "SWISS" && <p className="help">{t("swissLater", { r: tour.randomRoundsFirst + 1, p: tour.randomRoundsFirst })}</p>}
            {(n < 4 || n % 4 !== 0) && <div className="notice warn">{t("errCount")} ({n})</div>}
            <form action={generateRotation}>
              <input type="hidden" name="tournamentId" value={tour.id} />
              <button className="btn big block" disabled={n < 4 || n % 4 !== 0}>{t("createRotation")}</button>
            </form>
          </section>
        </main>
      </>
    );
  }

  const seated = new Set(all[0].tables.flatMap(seatsOf));
  const rosterChanged = seated.size !== active.length || active.some((id) => !seated.has(id));
  const problems = totalRepeats(all.filter((r) => !r.isSwiss), forbidden); // Swiss rounds may repeat by design
  const perTable = round?.isSwiss ? new Map<number, number>() : repeatsInRound(all, selected);
  const anyScore = all.some((r) => r.tables.some(hasScore));
  const roundScored = round?.tables.some(hasScore) ?? false;
  const allScored = round ? round.tables.every(isFinal) : false;
  const next = all.find((r) => r.number === selected + 1);
  const statusPill = (s: string) => (s === "LIVE" ? "live" : s === "CLOSED" ? "" : "warn");
  const roundIds = round ? round.tables.flatMap(seatsOf).sort((a, b) => nameOf(a).localeCompare(nameOf(b))) : [];

  return (
    <>
      {header}
      <main className="page wide">
        {notices}
        {rosterChanged && <div className="notice warn">{t("rosterChanged", { a: seated.size, b: active.length })}</div>}
        <p className="help">{problems.repeats ? t("repeatsTotal", { n: problems.repeats }) : t("repeatsNone")}</p>

        <nav className="row" aria-label={t("round")} style={{ gap: 6 }}>
          {Array.from({ length: tour.gamesCount }, (_, i) => i + 1).map((n) => {
            const r = all.find((x) => x.number === n);
            const on = n === selected;
            return r ? (
              <Link key={n} href={`${base}/tables?r=${n}`} className={`btn small ${on ? "" : "ghost"}`} aria-current={on ? "page" : undefined}>
                {t("roundShort", { r: n })}{r.status === "LIVE" ? " •" : ""}
              </Link>
            ) : (
              <span key={n} className="btn small dark" style={{ opacity: 0.45 }} title={t("swiss")}>{t("roundShort", { r: n })} · {t("swiss")}</span>
            );
          })}
        </nav>

        <SwipeRounds
          pageKey={selected}
          prevHref={selected > 1 ? `${base}/tables?r=${selected - 1}` : null}
          nextHref={selected < tour.gamesCount ? `${base}/tables?r=${selected + 1}` : null}
        >
        {!round ? (
          <section className="card"><p className="help">{t("swissLater", { r: selected, p: selected - 1 })}</p></section>
        ) : (
          <>
            <div className="spread">
              <h2 style={{ fontSize: 26 }}>{t("round")} {round.number} · {round.isSwiss ? t("swiss") : t("random")}</h2>
              <span className={`pill ${statusPill(round.status)}`}>{t(`status${round.status === "LIVE" ? "LIVE" : round.status}` as TKey)}</span>
            </div>

            {tour.status === "SETUP" && (
              <form action={startTournament} className="card stack">
                <input type="hidden" name="tournamentId" value={tour.id} />
                <p className="help">{t("startHelp")}</p>
                <button className="btn big amber block">{t("startTournament")}</button>
              </form>
            )}

            {tour.timerEnabled && round.status === "LIVE" && (
              <section id="timer" className="card stack" style={{ background: "var(--felt)", color: "var(--paper)" }}>
                <div className="spread">
                  <span className="kicker" style={{ color: "#cfe0d4", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>{t("timerTitle", { r: round.number })}</span>
                  <span className="pill" style={{ background: "var(--gold)", color: "var(--ink)" }}>
                    {round.timerEndsAt ? t("timerRunning") : round.timerRemainingSec !== null ? t("paused") : t("timerStopped")}
                  </span>
                </div>
                {round.timerEndsAt || round.timerRemainingSec !== null ? (
                  <Timer
                    variant="big" roundId={round.id} round={round.number}
                    endsAt={round.timerEndsAt ? round.timerEndsAt.toISOString() : null}
                    remaining={round.timerRemainingSec} serverNow={Date.now()}
                    labels={{ left: t("timeLeft"), up: t("timeUpShort"), paused: t("paused"), title: t("timeUpTitle"), body: t("timeUpBody"), go: t("goToScorecard"), ok: t("dismiss") }}
                  />
                ) : (
                  <div className="timer-big">{tour.roundMinutes}:00</div>
                )}
                <div className="row" style={{ justifyContent: "center" }}>
                  {(round.timerEndsAt
                    ? [["pause", t("timerPause")], ["add5", t("timerAdd5")], ["end", t("timerEnd")]]
                    : round.timerRemainingSec !== null
                      ? [["start", t("timerResume")], ["add5", t("timerAdd5")], ["reset", t("timerReset")]]
                      : [["start", t("timerStart")], ["add5", t("timerAdd5")]]
                  ).map(([op, label]) => (
                    <form key={op} action={timerControl}>
                      <input type="hidden" name="tournamentId" value={tour.id} />
                      <input type="hidden" name="number" value={round.number} />
                      <input type="hidden" name="op" value={op} />
                      <button className="btn" style={op === "start" || op === "pause" ? { background: "var(--paper)", color: "var(--felt)" } : { background: "transparent", border: "2px solid var(--paper)" }}>{label}</button>
                    </form>
                  ))}
                </div>
              </section>
            )}

            {round.status === "LIVE" && (() => {
              const c = { CONFIRMED: 0, SUBMITTED: 0, IN_PROGRESS: 0, NOT_STARTED: 0, DISPUTED: 0 } as Record<string, number>;
              for (const tb of round.tables) c[tb.status] = (c[tb.status] ?? 0) + 1;
              const pending = round.tables.length - c.CONFIRMED;
              const tiles: [string, number, string][] = [
                [t("dashConfirmed"), c.CONFIRMED, "#24402f"],
                [t("dashWaiting"), c.SUBMITTED, "#4a3a17"],
                [t("dashPlaying"), c.IN_PROGRESS, "#2c322b"],
                [t("dashNotStarted"), c.NOT_STARTED, "#4d221c"],
                ...(c.DISPUTED ? [[t("dashDisputed"), c.DISPUTED, "#7a1d12"] as [string, number, string]] : []),
              ];
              return (
                <section className="card stack" style={{ background: "var(--ink)", color: "var(--paper)" }}>
                  <div className="tiles" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>
                    {tiles.map(([label, n, bg]) => (
                      <div key={label} style={{ background: bg, borderRadius: 10, padding: "10px 12px" }}>
                        <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 28, lineHeight: 1 }}>{n}</div>
                        <div style={{ fontSize: 12, color: "#cfd3cb" }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  {pending === 0 ? (
                    <div className="notice ok">{t("allGood")}</div>
                  ) : (
                    <div className="row">
                      <Link href={`${base}/tables?r=${round.number}&f=attention`} className={`btn small ${sp.f === "attention" ? "" : "ghost"}`} style={sp.f === "attention" ? {} : { color: "var(--paper)", borderColor: "var(--paper)" }}>{t("needsAttention")} · {pending}</Link>
                      <Link href={`${base}/tables?r=${round.number}`} className={`btn small ${sp.f === "attention" ? "ghost" : ""}`} style={sp.f === "attention" ? { color: "var(--paper)", borderColor: "var(--paper)" } : {}}>{t("showAll")}</Link>
                    </div>
                  )}
                </section>
              );
            })()}

            <div className="tiles" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
              {round.tables.filter((tb) => !(sp.f === "attention" && round.status === "LIVE" && tb.status === "CONFIRMED")).map((tb) => {
                const rep = perTable.get(tb.number);
                return (
                  <section key={tb.id} id={`t${tb.number}`} className="card stack" style={{ gap: 8 }}>
                    <div className="spread">
                      <h3 style={{ fontSize: 22 }}>{t("table")} {tb.number}</h3>
                      <span className="row" style={{ gap: 6 }}>
                        {rep ? <span className="pill warn">{t("tableRepeat", { n: rep })}</span> : null}
                        {tb.status === "SUBMITTED" && <span className="pill warn">{t("gsSUBMITTED")}</span>}
                        {tb.status === "DISPUTED" && <span className="pill bad">{t("gsDISPUTED")}</span>}
                        {tb.status === "IN_PROGRESS" && <span className="pill">{t("gsIN_PROGRESS")}</span>}
                        {hasScore(tb) && <span className={`pill ${isFinal(tb) ? "ok" : ""}`}>{tb.scoreA}–{tb.scoreB}</span>}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, lineHeight: 1.4 }}>
                      <div><b>{nameOf(tb.a1)}</b> &amp; <b>{nameOf(tb.a2)}</b></div>
                      <div style={{ color: "var(--muted)", fontSize: 13 }}>{t("vs")}</div>
                      <div><b>{nameOf(tb.b1)}</b> &amp; <b>{nameOf(tb.b2)}</b></div>
                    </div>
                    {round.status !== "PENDING" && (
                      <form action={saveScore} className="row" style={{ flexWrap: "nowrap", gap: 6 }}>
                        <input type="hidden" name="tournamentId" value={tour.id} />
                        <input type="hidden" name="tableId" value={tb.id} />
                        <input type="hidden" name="number" value={round.number} />
                        <input type="number" name="scoreA" inputMode="numeric" min={0} max={999} defaultValue={tb.scoreA ?? ""} aria-label={`${t("enterScore")}: ${nameOf(tb.a1)} & ${nameOf(tb.a2)}`} style={{ textAlign: "center", fontWeight: 700 }} />
                        <span aria-hidden="true">–</span>
                        <input type="number" name="scoreB" inputMode="numeric" min={0} max={999} defaultValue={tb.scoreB ?? ""} aria-label={`${t("enterScore")}: ${nameOf(tb.b1)} & ${nameOf(tb.b2)}`} style={{ textAlign: "center", fontWeight: 700 }} />
                        <button className="btn small" style={{ flex: "none" }}>{t("saveScore")}</button>
                      </form>
                    )}
                    {tb.enteredByAdmin && hasScore(tb) && <span className="help">{t("scoreBy")}</span>}
                    {round.status === "LIVE" && tb.status !== "CONFIRMED" && (
                      <details className="disclose">
                        <summary style={{ minHeight: 36, fontSize: 14 }}>{t("messagePlayers")}</summary>
                        <div className="row" style={{ gap: 6 }}>
                          {seatsOf(tb).map((id) => {
                            const who = names.get(id);
                            if (!who?.phone) return <span key={id} className="pill bad">{who?.first ?? "?"} · {t("noPhone")}</span>;
                            const url = `https://domino.joelbary.com/${tour.slug}/score`;
                            const key = tb.status === "DISPUTED" ? "waDisputed" : tb.status === "SUBMITTED" ? "waConfirm" : "waMissing";
                            const text = t(key, { name: who.first, n: tb.number, r: round.number, url });
                            return (
                              <a key={id} href={`https://wa.me/${whatsappDigits(who.phone)}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="btn small" style={{ background: "#1f7a4d", gap: 6 }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z" /></svg>
                                {who.first}
                              </a>
                            );
                          })}
                        </div>
                      </details>
                    )}
                  </section>
                );
              })}
            </div>

            {round.status === "LIVE" && (
              <form action={closeRound} className="card stack">
                <input type="hidden" name="tournamentId" value={tour.id} />
                <input type="hidden" name="number" value={round.number} />
                {!allScored && <p className="help">{t("closeRoundHelp")}</p>}
                {!next && round.number < tour.gamesCount && <p className="help">{t("closeSwissHelp", { n: round.number + 1 })}</p>}
                <button className="btn big block" disabled={!allScored}>{t("closeRound", { r: round.number })}</button>
              </form>
            )}
            {round.status === "CLOSED" && !(next && next.tables.some(hasScore)) && (
              <form action={reopenRound}>
                <input type="hidden" name="tournamentId" value={tour.id} />
                <input type="hidden" name="number" value={round.number} />
                <button className="btn dark block">{t("reopenRound", { r: round.number })}</button>
              </form>
            )}

            {round.status !== "CLOSED" && !roundScored && (
              <div className="grid2 collapse" style={{ alignItems: "start" }}>
                <form action={swapPlayers} className="card stack">
                  <h2>{t("swapSeats")}</h2>
                  <p className="help">{t("swapHelp")}</p>
                  <input type="hidden" name="tournamentId" value={tour.id} />
                  <input type="hidden" name="number" value={round.number} />
                  {(["a", "b"] as const).map((k) => (
                    <select key={k} name={k} required defaultValue="" aria-label={t("swapSeats")}>
                      <option value="" disabled>—</option>
                      {roundIds.map((id) => <option key={id} value={id}>{nameOf(id)}</option>)}
                    </select>
                  ))}
                  <button className="btn ghost">{t("swap")}</button>
                </form>
                <form action={reshuffleRound} className="card stack">
                  <h2>{t("reshuffle")}</h2>
                  {!round.isSwiss && <p className="help">{t("reshuffleHelpRandom")}</p>}
                  <input type="hidden" name="tournamentId" value={tour.id} />
                  <input type="hidden" name="number" value={round.number} />
                  <ConfirmSubmit message={t("reshuffleConfirm", { r: round.number })} className="btn ghost">{t("reshuffle")}</ConfirmSubmit>
                </form>
              </div>
            )}
          </>
        )}
        </SwipeRounds>

        {!anyScore && (
          <details className="card disclose">
            <summary>{t("deleteRotation")}</summary>
            <form action={deleteRotation}>
              <input type="hidden" name="tournamentId" value={tour.id} />
              <ConfirmSubmit message={t("deleteRotationConfirm")} className="btn danger block">{t("deleteRotation")}</ConfirmSubmit>
            </form>
          </details>
        )}
      </main>
    </>
  );
}
