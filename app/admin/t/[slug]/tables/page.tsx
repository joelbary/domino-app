import Link from "next/link";
import { notFound } from "next/navigation";
import AdminBar from "@/components/AdminBar";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import Timer from "@/components/Timer";
import { requireAdmin } from "@/lib/auth";
import { getT, type TKey } from "@/lib/i18n";
import {
  activeEntryIds, entryNames, forbiddenPairs, hasScore, isFinal, loadRounds, randomRoundCount, repeatsInRound, seatsOf, totalRepeats,
} from "@/lib/schedule";
import { getTournamentBySlug } from "@/lib/tournaments";
import {
  closeRound, deleteRotation, generateRotation, reopenRound, reshuffleRound, saveScore, startTournament, swapPlayers, timerControl,
} from "../../../schedule-actions";

export const dynamic = "force-dynamic";

const MSGS = new Set(["rotationCreated", "reshuffled", "swapped", "started", "scoreSaved", "scoreCleared", "roundClosed", "swissCreated", "lastRoundClosed", "reopened", "rotationDeleted"]);
const ERRS = new Set(["errCount", "errScored", "errNoRotation", "errNotLive", "errScore", "errMissingScores", "errLaterScored", "errGeneric"]);

export default async function TablesPage({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ r?: string; msg?: string; err?: string }>;
}) {
  await requireAdmin();
  const { slug } = await params;
  const sp = await searchParams;
  const tour = await getTournamentBySlug(slug);
  if (!tour) notFound();
  const { t, lang } = await getT();
  const base = `/admin/t/${tour.slug}`;
  const [all, names, active, forbidden] = await Promise.all([loadRounds(tour.id), entryNames(tour.id), activeEntryIds(tour.id), forbiddenPairs(tour)]);
  const nameOf = (id: number) => names.get(id)?.name ?? "?";
  const liveRound = all.find((r) => r.status === "LIVE")?.number;
  const selected = parseInt(sp.r ?? "", 10) || liveRound || 1;
  const round = all.find((r) => r.number === selected);
  const header = (
    <AdminBar title={t("rotationTitle")} sub={tour.name} back={{ href: base, label: t("backToTournament") }} lang={lang} here={`${base}/tables?r=${selected}`} langLabel={t("langToggle")} />
  );
  const notices = (
    <>
      {sp.msg && MSGS.has(sp.msg) && <div className="notice ok" role="status">{t(sp.msg as TKey)}</div>}
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

            <div className="tiles" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
              {round.tables.map((tb) => {
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
