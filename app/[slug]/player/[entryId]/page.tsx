import Link from "next/link";
import { notFound } from "next/navigation";
import PlayerShell from "@/components/PlayerShell";
import { playerView } from "@/lib/playerView";
import { sideOf } from "@/lib/play";
import { standingsFor } from "@/lib/schedule";
import { standingsVisibility } from "@/lib/visibility";

export const dynamic = "force-dynamic";

// One player's games, round by round.
export default async function PlayerGames({ params }: { params: Promise<{ slug: string; entryId: string }> }) {
  const { slug, entryId } = await params;
  const v = await playerView(slug);
  const { tour, t, rounds, names, nameOf, entry } = v;
  const id = parseInt(entryId, 10);
  const who = names.get(id);
  if (!who) notFound();
  const base = `/${tour.slug}`;
  const { hideAll, upto, hideRound } = standingsVisibility(tour, rounds);
  const isMe = entry?.id === id;
  const { standings } = await standingsFor(tour.id, upto);
  const me = standings.find((s) => s.entryId === id);

  const games = rounds.map((r) => {
    const x = r.tables.find((tb) => sideOf(tb, id));
    if (!x) return { r, x: null };
    const side = sideOf(x, id)!;
    const partner = side === "A" ? (x.a1 === id ? x.a2 : x.a1) : (x.b1 === id ? x.b2 : x.b1);
    const opp = side === "A" ? [x.b1, x.b2] : [x.a1, x.a2];
    const mine = side === "A" ? x.scoreA : x.scoreB;
    const theirs = side === "A" ? x.scoreB : x.scoreA;
    const final = x.status === "CONFIRMED" && mine !== null && theirs !== null;
    const hidden = hideRound(r.number) && !isMe;
    return { r, x, partner, opp, mine, theirs, final, hidden };
  });

  return (
    <PlayerShell v={v} tab="standings" here={`${base}/player/${id}`} refresh={20}>
      <Link href={`${base}/standings`} className="help" style={{ fontWeight: 600, color: "var(--felt)" }}>← {t("backToStandings")}</Link>
      <section className="card stack" style={{ gap: 8 }}>
        <h1 style={{ fontSize: 28 }}>{who.name}{isMe ? ` (${t("you")})` : ""}</h1>
        {who.team && <span className="help">{t("team")} {who.team}</span>}
        {me && !hideAll && me.played > 0 && (
          <div className="grid2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))", textAlign: "center" }}>
            {[
              [t("rankNow"), `#${me.rank}`],
              [t("wlt"), `${me.w}-${me.l}-${me.t}`],
              [t("pts"), String(me.pts)],
              [t("diff"), me.diff > 0 ? `+${me.diff}` : String(me.diff)],
            ].map(([k, val]) => (
              <div key={k} style={{ background: "var(--ground)", borderRadius: 10, padding: "8px 4px" }}>
                <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 22, color: "var(--felt)" }}>{val}</div>
                <div className="help" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k}</div>
              </div>
            ))}
          </div>
        )}
      </section>
      <h2 style={{ fontSize: 22 }}>{t("playerGames")}</h2>
      <div className="list" style={{ gap: 8 }}>
        {games.map((g) => {
          if (!g.x) return null;
          const res = g.final && !g.hidden ? (g.mine! > g.theirs! ? "win" : g.mine! < g.theirs! ? "loss" : "tie") : null;
          return (
            <section key={g.r.number} className="card" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="spread">
                <span style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 18 }}>{t("round")} {g.r.number} · {t("table")} {g.x.number}</span>
                {res && <span className={`pill ${res === "win" ? "ok" : res === "loss" ? "bad" : "warn"}`}>{t(res)} {res === "win" ? "+3" : res === "tie" ? "+1" : "0"}</span>}
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.45 }}>
                <div><span className="help">{t("partner")}:</span> <Link href={`${base}/player/${g.partner}`} style={{ color: "var(--ink)", fontWeight: 600 }}>{nameOf(g.partner!)}</Link></div>
                <div><span className="help">{t("opponents")}:</span> {g.opp!.map((o, i) => (
                  <span key={o}>{i > 0 && " & "}<Link href={`${base}/player/${o}`} style={{ color: "var(--ink)", fontWeight: 600 }}>{nameOf(o)}</Link></span>
                ))}</div>
              </div>
              <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 24 }}>
                {g.hidden ? <span className="help" style={{ fontFamily: "var(--body)", fontSize: 14 }}>{t("hiddenFinal")}</span>
                  : g.final ? <>{g.mine}–{g.theirs} <span className="help" style={{ fontFamily: "var(--body)", fontSize: 13, fontWeight: 500 }}>({t("diff")} {g.mine! - g.theirs! > 0 ? "+" : ""}{g.mine! - g.theirs!})</span></>
                  : <span className="help" style={{ fontFamily: "var(--body)", fontSize: 14 }}>{t("notPlayedYet")}</span>}
              </div>
            </section>
          );
        })}
      </div>
    </PlayerShell>
  );
}
