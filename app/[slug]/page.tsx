import Link from "next/link";
import PhoneSignIn from "@/components/PhoneSignIn";
import PlayerShell from "@/components/PlayerShell";
import SwipeRounds from "@/components/SwipeRounds";
import TablesList from "@/components/TablesList";
import { playerSignOut } from "@/app/play-actions";
import type { TKey } from "@/lib/i18n";
import { playerView } from "@/lib/playerView";
import { sideOf } from "@/lib/play";

export const dynamic = "force-dynamic";

export default async function TournamentTables({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ r?: string }> }) {
  const { slug } = await params;
  const { r } = await searchParams;
  const v = await playerView(slug);
  const { tour, t, entry, rounds, live, myTable, mySide, nameOf } = v;
  const base = `/${tour.slug}`;
  const selected = parseInt(r ?? "", 10) || live?.number || rounds.filter((x) => x.status === "CLOSED").at(-1)?.number || 1;
  const round = rounds.find((x) => x.number === selected);
  const pair = (a: number, b: number) => `${nameOf(a)} & ${nameOf(b)}`;
  const idx = rounds.findIndex((x) => x.number === selected);
  const prevHref = idx > 0 ? `${base}?r=${rounds[idx - 1].number}` : null;
  const nextHref = idx >= 0 && idx < rounds.length - 1 ? `${base}?r=${rounds[idx + 1].number}` : null;

  return (
    <PlayerShell v={v} tab="tables" here={`${base}${r ? `?r=${r}` : ""}`}>
      {!v.player && (
        <>
          <h2 style={{ fontSize: 22 }}>{t("signInToScore")}</h2>
          <PhoneSignIn back={base} labels={{ phone: t("yourPhone"), enter: t("enterTournament"), help: t("phoneLoginHelp") }} />
        </>
      )}
      {v.player && !entry && (
        <div className="notice warn">
          {t("notInTournament")}{" "}
          <form action={playerSignOut} style={{ display: "inline" }}>
            <input type="hidden" name="back" value={base} />
            <button className="btn small dark" style={{ marginTop: 6 }}>{t("notYou")}</button>
          </form>
        </div>
      )}

      {tour.status === "SETUP" && <section className="card"><p className="help" style={{ fontSize: 16 }}>{t("notStartedPublic")}</p></section>}

      {live && myTable && mySide && (
        <section className="mytable">
          <div className="spread">
            <span className="kick">{t("round")} {live.number}</span>
            <span className="tablenum">{t("table")} {myTable.number}</span>
          </div>
          {myTable.status === "SUBMITTED" && myTable.submittedBy && sideOf(myTable, myTable.submittedBy) !== mySide && (
            <Link href={`${base}/score`} className="notice warn" style={{ textDecoration: "none" }}>{t("oppSubmitted")} →</Link>
          )}
          <div className="pairbox mine">
            <div className="lbl">{t("yourPair")}</div>
            <div className="who">{mySide === "A" ? pair(myTable.a1, myTable.a2) : pair(myTable.b1, myTable.b2)}</div>
          </div>
          <div className="vs">{t("vs").toUpperCase()}</div>
          <div className="pairbox them">
            <div className="lbl">{t("opponents")}</div>
            <div className="who">{mySide === "A" ? pair(myTable.b1, myTable.b2) : pair(myTable.a1, myTable.a2)}</div>
          </div>
          <Link href={`${base}/score`} className="btn big block">{t("openScorecard")}</Link>
        </section>
      )}
      {live && entry && !myTable && <div className="notice warn">{t("notInRound")}</div>}

      {rounds.length > 0 && (
        <>
          <nav className="chips" aria-label={t("round")}>
            {rounds.map((x) => (
              <Link key={x.number} href={`${base}?r=${x.number}`} className={`chip${x.status === "LIVE" ? " live" : ""}`} aria-current={x.number === selected ? "page" : undefined}>
                {t("round")} {x.number}{x.isSwiss ? ` · ${t("swiss")}` : ""}
              </Link>
            ))}
          </nav>
          {round && (
            <SwipeRounds prevHref={prevHref} nextHref={nextHref}>
              <div className="spread">
                <h2 style={{ fontSize: 22 }}>{t("allTables", { r: round.number })}</h2>
                <span className="help">{t("tablesCount", { n: round.tables.length })}</span>
              </div>
              <TablesList
                labels={{ search: t("findPlayer"), noMatch: t("noMatch"), vs: t("vs") }}
                rows={round.tables.map((x) => ({
                  n: x.number,
                  a: pair(x.a1, x.a2),
                  b: pair(x.b1, x.b2),
                  status: x.status,
                  statusLabel: t(`gs${x.status}` as TKey),
                  // Final round scores stay hidden until the organizer publishes the results.
                  score: x.status === "CONFIRMED" && x.scoreA !== null && !(round.number === tour.gamesCount && !tour.resultsPublished) ? `${x.scoreA}–${x.scoreB}` : null,
                  mine: !!entry && !!sideOf(x, entry.id),
                }))}
              />
            </SwipeRounds>
          )}
        </>
      )}
    </PlayerShell>
  );
}
