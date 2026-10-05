import { adminTournament } from "@/lib/access";
import { notFound } from "next/navigation";
import AdminBar from "@/components/AdminBar";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import TournamentForm from "@/components/TournamentForm";
import { tournamentLabels } from "@/lib/formLabels";
import { getT } from "@/lib/i18n";
import { deleteTournament, updateTournament } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { slug } = await params;
  const { saved } = await searchParams;
  const { session, tour } = await adminTournament(slug);
  const { t, lang } = await getT();
  const base = `/admin/t/${tour.slug}`;
  return (
    <>
      <AdminBar title={t("settings")} sub={tour.name} back={{ href: base, label: t("backToTournament") }} lang={lang} here={`${base}/settings`} langLabel={t("langToggle")} />
      <main className="page">
        <TournamentForm
          action={updateTournament}
          labels={tournamentLabels(t, t("saveChanges"))}
          initialState={saved ? { ok: t("saved") } : {}}
          initial={{
            id: tour.id, name: tour.name, slug: tour.slug,
            eventDate: tour.eventDate ? tour.eventDate.toISOString().slice(0, 10) : "",
            gamesCount: tour.gamesCount, rotationMode: tour.rotationMode, randomRoundsFirst: tour.randomRoundsFirst,
            teamsEnabled: tour.teamsEnabled, teamMinSize: tour.teamMinSize, teamMaxSize: tour.teamMaxSize,
            timerEnabled: tour.timerEnabled, roundMinutes: tour.roundMinutes,
            hasLogo: tour.hasLogo, logoUrl: `/t/${tour.slug}/logo?v=${tour.updatedAt.getTime()}`,
          }}
        />
        <details className="card disclose">
          <summary>{t("deleteTournament")}</summary>
          <form action={deleteTournament} className="stack">
            <input type="hidden" name="id" value={tour.id} />
            <label className="field" style={{ fontWeight: 500 }}>{t("deleteConfirm")}
              <input type="text" name="confirm" autoComplete="off" />
            </label>
            <ConfirmSubmit message={t("deleteTournament") + "?"} className="btn danger block">{t("deleteTournament")}</ConfirmSubmit>
          </form>
        </details>
      </main>
    </>
  );
}
