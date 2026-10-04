import Link from "next/link";
import PlayerShell from "@/components/PlayerShell";
import { playerView } from "@/lib/playerView";
import { sideOf } from "@/lib/play";
import { standingsFor, teamTable } from "@/lib/schedule";
import { listTeams } from "@/lib/tournaments";
import { standingsVisibility } from "@/lib/visibility";

export const dynamic = "force-dynamic";

export default async function PlayerStandings({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ view?: string }> }) {
  const { slug } = await params;
  const { view } = await searchParams;
  const v = await playerView(slug);
  const { tour, t, entry, rounds, live, names } = v;
  const base = `/${tour.slug}`;
  const last = tour.gamesCount;
  const { hideAll, upto } = standingsVisibility(tour, rounds);
  const { standings } = await standingsFor(tour.id, upto);
  // Movement arrows: compare with the standings one round earlier.
  const counted = Math.max(0, ...rounds.filter((r) => (upto === undefined || r.number <= upto) && r.tables.some((x) => x.status === "CONFIRMED")).map((r) => r.number));
  const prevRank = new Map<number, number>();
  if (counted > 1) for (const s0 of (await standingsFor(tour.id, counted - 1)).standings) prevRank.set(s0.entryId, s0.rank);
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
              <table className="standings p">
                <thead><tr><th>#</th><th aria-label={t("movement")}></th><th style={{ textAlign: "left" }}>{t("players")}</th><th>{t("pts")}</th><th>{t("diff")}</th><th>{t("pf")}</th></tr></thead>
                <tbody>
                  {standings.map((s) => (
                    <tr key={s.entryId} className={entry?.id === s.entryId ? "me" : undefined}>
                      <td className="rank">{s.rank}</td>
                      <td className="move">{(() => {
                        const p0 = prevRank.get(s.entryId);
                        if (!p0 || p0 === s.rank) return <span className="same">–</span>;
                        return p0 > s.rank ? <span className="up">▲{p0 - s.rank}</span> : <span className="down">▼{s.rank - p0}</span>;
                      })()}</td>
                      <td style={{ textAlign: "left" }}>
                        <Link href={`${base}/player/${s.entryId}`} style={{ fontWeight: 600, color: "var(--ink)" }}>{names.get(s.entryId)?.name}{entry?.id === s.entryId ? ` (${t("you")})` : ""}</Link>
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
          {played && !showTeams && <p className="help">{t("standingsLegend")}</p>}
        </>
      )}
    </PlayerShell>
  );
}
