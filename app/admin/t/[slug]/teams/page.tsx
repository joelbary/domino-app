import { adminTournament } from "@/lib/access";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddTeamForm from "@/components/AddTeamForm";
import AdminBar from "@/components/AdminBar";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { getT } from "@/lib/i18n";
import { formatPhone } from "@/lib/phone";
import { listEntries, listTeams } from "@/lib/tournaments";
import { addTeam, deleteTeam, renameTeam } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function TeamsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ err?: string }> }) {
  const { slug } = await params;
  const { err } = await searchParams;
  const { session, tour } = await adminTournament(slug);
  const { t, lang } = await getT();
  const base = `/admin/t/${tour.slug}`;
  const [tms, ents] = await Promise.all([listTeams(tour.id), listEntries(tour.id)]);
  const noTeam = ents.filter((e) => !e.teamId);

  return (
    <>
      <AdminBar title={t("teamsTitle")} sub={tour.name} back={{ href: base, label: t("backToTournament") }} lang={lang} here={`${base}/teams`} langLabel={t("langToggle")} />
      <main className="page">
        {!tour.teamsEnabled && <div className="notice warn">{t("teamsOff")}</div>}
        {err === "errTeamExists" && <div className="notice bad" role="alert">{t("errTeamExists")}</div>}
        <section className="card">
          <AddTeamForm action={addTeam} tournamentId={tour.id} labels={{ teamName: t("teamName"), addTeam: t("addTeam") }} />
        </section>
        {tms.length === 0 && <p className="help">{t("noTeams")}</p>}
        {tms.map((tm) => {
          const members = ents.filter((e) => e.teamId === tm.id);
          const small = members.length < tour.teamMinSize;
          const big = members.length > tour.teamMaxSize;
          return (
            <details key={tm.id} className="card disclose">
              <summary>
                <span style={{ flex: 1 }}>{t("team")} {tm.name}</span>
                <span className={`pill ${small || big ? "warn" : "ok"}`} style={{ marginLeft: 8 }}>
                  {t("members", { n: members.length })}
                </span>
              </summary>
              {(small || big) && (
                <p className="help" style={{ color: "var(--amber-ink)", fontWeight: 600 }}>
                  {small ? t("teamTooSmall", { m: tour.teamMinSize }) : t("teamTooBig", { m: tour.teamMaxSize })}
                </p>
              )}
              <div className="list" style={{ margin: "8px 0 12px" }}>
                {members.map((m) => (
                  <Link key={m.entryId} href={`${base}/players/${m.entryId}`} className="item" style={{ background: "var(--ground)" }}>
                    <span className="main">
                      <span className="name">{m.firstName} {m.lastName}</span>
                      <span className="meta">{formatPhone(m.phone)}</span>
                    </span>
                  </Link>
                ))}
              </div>
              <form action={renameTeam} className="row" style={{ flexWrap: "nowrap" }}>
                <input type="hidden" name="tournamentId" value={tour.id} />
                <input type="hidden" name="teamId" value={tm.id} />
                <input type="text" name="name" defaultValue={tm.name} aria-label={t("teamName")} />
                <button className="btn ghost" style={{ flex: "none" }}>{t("rename")}</button>
              </form>
              <form action={deleteTeam} style={{ marginTop: 10 }}>
                <input type="hidden" name="tournamentId" value={tour.id} />
                <input type="hidden" name="teamId" value={tm.id} />
                <ConfirmSubmit message={t("deleteTeamConfirm")} className="btn danger small">{t("deleteTeam")}</ConfirmSubmit>
              </form>
            </details>
          );
        })}
        {noTeam.length > 0 && tour.teamsEnabled && (
          <section className="card">
            <h2>{t("unassigned")} · {noTeam.length}</h2>
            <div className="list" style={{ marginTop: 8 }}>
              {noTeam.map((m) => (
                <Link key={m.entryId} href={`${base}/players/${m.entryId}`} className="item" style={{ background: "var(--ground)" }}>
                  <span className="main"><span className="name">{m.firstName} {m.lastName}</span></span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
