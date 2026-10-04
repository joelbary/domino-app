import Link from "next/link";
import PlayerShell from "@/components/PlayerShell";
import { playerView } from "@/lib/playerView";
import { sideOf } from "@/lib/play";
import { standingsFor, teamTable } from "@/lib/schedule";
import { listTeams } from "@/lib/tournaments";

export const dynamic = "force-dynamic";

export default async function PlayerStandings({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ view?: string }> }) {
  const { slug } = await params;
  const { view } = await searchParams;
  const v = await playerView(slug);
  const { tour, t, entry, rounds, live, names } = v;
  const base = `/${tour.slug}`;
  const last = tour.gamesCount;
  const lastRound = rounds.find((r) => r.number === last);
  const allDone = !!lastRound && lastRound.status === "CLOSED";
  const finalLive = live?.number === last;

  // Visibility: during the final round, show standings as of the previous round; after the
  // final round, hide everything until the organizer publishes the results.
  const hideAll = !tour.resultsPublished && allDone;
  const upto = tour.resultsPublished ? undefined : finalLive || allDone ? last - 1 : undefined;
  const { standings } = await standingsFor(tour.id, upto);
  const played = standings.some((s) => s.played > 0);
  const closed = rounds.filter((r) => r.status === "CLOSED").length;
  const showTeams = tour.teamsEnabled && view === "teams";
  const teams = showTeams ? await teamTable(tour.id, new Map(standings.map((s) => [s.entryId, s.rank]))) : [];
  const teamName = new Map((showTeams ? await listTeams(tour.id) : []).map((x) => [x.id, x.name]));
  const myGames = entry
    ? rounds.flatMap((r) => r.tables.filter((x) => sideOf(x, entry.id)).map((x) => ({ r: r.number, x })))
    : [];

  return (
    <PlayerShell v={v} tab="standings" here={`${base}/standings${view ? `?view=${view}` : ""}`} refresh={20}>
      {hideAll ? (
        <section className="card stack" style={{ background: "var(--felt)", color: "var(--paper)", textAlign: "center", padding: "36px 20px" }}>
          <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 40, lineHeight: 1, color: "var(--gold)" }}>{t("finalSoon")}</div>
          <p style={{ margin: 0, color: "#cfe0d4", fontSize: 17 }}>{t("finalSoonHelp")}</p>
          {myGames.length > 0 && (
            <div style={{ background: "rgba(0,0,0,0.22)", borderRadius: 14, padding: "12px 14px", textAlign: "left", fontSize: 15, lineHeight: 1.6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold)" }}>{t("yourGames")}</div>
              {myGames.map(({ r, x }) => {
                const mine = sideOf(x, entry!.id) === "A" ? x.scoreA : x.scoreB;
                const theirs = sideOf(x, entry!.id) === "A" ? x.scoreB : x.scoreA;
                if (mine === null || theirs === null) return null;
                const res = mine > theirs ? t("win") : mine < theirs ? t("loss") : t("tie");
                return <div key={r}>R{r} · {res} {mine}–{theirs}</div>;
              })}
            </div>
          )}
        </section>
      ) : (
        <>
          <div className="spread">
            <h1 style={{ fontSize: 26 }}>{tour.resultsPublished ? t("finalStandings") : t("standings")}</h1>
            {closed > 0 && !tour.resultsPublished && <span className="help">{t("standingsAfter", { r: upto ?? closed, n: last })}</span>}
          </div>
          {upto !== undefined && played && <div className="notice warn">{t("standingsAsOf", { r: upto })}</div>}
          {tour.teamsEnabled && (
            <div className="seg">
              <Link href={`${base}/standings`} className="btn small" style={view === "teams" ? { background: "transparent", color: "var(--ink-2)" } : {}}>{t("players")}</Link>
              <Link href={`${base}/standings?view=teams`} className="btn small" style={view === "teams" ? {} : { background: "transparent", color: "var(--ink-2)" }}>{t("teams")}</Link>
            </div>
          )}
          {!played ? (
            <p className="help">{t("noGamesYet")}</p>
          ) : showTeams ? (
            <section className="card stack" style={{ gap: 4 }}>
              {teams.map((tm) => (
                <div key={tm.teamId} className="spread" style={{ borderBottom: "1px solid var(--line)", padding: "8px 0" }}>
                  <span style={{ fontWeight: 600 }}><span style={{ fontFamily: "var(--display)", color: "var(--felt)", fontSize: 18 }}>{tm.rank}.</span> {t("team")} {teamName.get(tm.teamId)}</span>
                  <span className="help">{t("avgRank", { a: tm.avg.toFixed(1) })}</span>
                </div>
              ))}
            </section>
          ) : (
            <div className="card" style={{ padding: "6px 4px", overflowX: "auto" }}>
              <table className="standings">
                <thead><tr><th>#</th><th style={{ textAlign: "left" }}>{t("players")}</th><th>{t("pts")}</th><th>{t("diff")}</th><th>{t("pf")}</th></tr></thead>
                <tbody>
                  {standings.map((s) => (
                    <tr key={s.entryId} className={entry?.id === s.entryId ? "me" : undefined}>
                      <td className="rank">{s.rank}</td>
                      <td style={{ textAlign: "left" }}>
                        <span style={{ fontWeight: 600 }}>{names.get(s.entryId)?.name}{entry?.id === s.entryId ? ` (${t("you")})` : ""}</span>
                        <span className="help" style={{ display: "block" }}>{s.w}-{s.l}-{s.t}{names.get(s.entryId)?.team ? ` · ${t("team")} ${names.get(s.entryId)?.team}` : ""}</span>
                      </td>
                      <td><b>{s.pts}</b></td>
                      <td>{s.diff > 0 ? `+${s.diff}` : s.diff}</td>
                      <td>{s.pf}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </PlayerShell>
  );
}
