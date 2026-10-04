import { notFound } from "next/navigation";
import AdminBar from "@/components/AdminBar";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { setResultsPublished } from "../../../schedule-actions";
import { requireAdmin } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { entryNames, standingsFor, teamTable } from "@/lib/schedule";
import { getTournamentBySlug, listTeams } from "@/lib/tournaments";

export const dynamic = "force-dynamic";

export default async function StandingsPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  const tour = await getTournamentBySlug(slug);
  if (!tour) notFound();
  const { t, lang } = await getT();
  const base = `/admin/t/${tour.slug}`;
  const [{ standings }, names, tms] = await Promise.all([standingsFor(tour.id), entryNames(tour.id), listTeams(tour.id)]);
  const played = standings.some((s) => s.played > 0);
  const rankOf = new Map(standings.map((s) => [s.entryId, s.rank]));
  const teams = tour.teamsEnabled && played ? await teamTable(tour.id, rankOf) : [];
  const teamName = new Map(tms.map((x) => [x.id, x.name]));

  return (
    <>
      <AdminBar title={t("standings")} sub={tour.name} back={{ href: base, label: t("backToTournament") }} lang={lang} here={`${base}/standings`} langLabel={t("langToggle")} />
      <main className="page">
        <div className={`notice ${tour.resultsPublished ? "ok" : "warn"}`}>{tour.resultsPublished ? t("resultsPublishedMsg") : t("resultsHidden")}</div>
        {played && (
          <form action={setResultsPublished}>
            <input type="hidden" name="tournamentId" value={tour.id} />
            <input type="hidden" name="publish" value={tour.resultsPublished ? "0" : "1"} />
            {tour.resultsPublished ? (
              <button className="btn dark block">{t("hideResults")}</button>
            ) : (
              <ConfirmSubmit message={t("publishConfirm")} className="btn big amber block">{t("publishResults")}</ConfirmSubmit>
            )}
          </form>
        )}
        {!played && <p className="help">{t("noGamesYet")}</p>}
        {teams.length > 0 && (
          <section className="card stack" style={{ gap: 6 }}>
            <h2>{t("teamRanking")}</h2>
            {teams.map((tm) => (
              <div key={tm.teamId} className="spread" style={{ borderBottom: "1px solid var(--line)", padding: "6px 0" }}>
                <span><b>{tm.rank}.</b> {t("team")} {teamName.get(tm.teamId)}</span>
                <span className="help">{t("avgRank", { a: tm.avg.toFixed(1) })}</span>
              </div>
            ))}
          </section>
        )}
        {played && (
          <div className="card" style={{ padding: "8px 6px", overflowX: "auto" }}>
            <table className="standings">
              <thead>
                <tr><th>#</th><th style={{ textAlign: "left" }}>{t("players")}</th><th>{t("wlt")}</th><th>{t("pts")}</th><th>{t("diff")}</th><th>{t("pf")}</th></tr>
              </thead>
              <tbody>
                {standings.map((s) => (
                  <tr key={s.entryId}>
                    <td className="rank">{s.rank}</td>
                    <td style={{ textAlign: "left" }}>
                      <span style={{ fontWeight: 600 }}>{names.get(s.entryId)?.name}</span>
                      {names.get(s.entryId)?.team && <span className="help" style={{ display: "block" }}>{t("team")} {names.get(s.entryId)?.team}</span>}
                    </td>
                    <td>{s.w}-{s.l}-{s.t}</td>
                    <td><b>{s.pts}</b></td>
                    <td>{s.diff > 0 ? `+${s.diff}` : s.diff}</td>
                    <td>{s.pf}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
