import AdminBar from "@/components/AdminBar";
import TournamentForm from "@/components/TournamentForm";
import { requireAdmin } from "@/lib/auth";
import { tournamentLabels } from "@/lib/formLabels";
import { getT } from "@/lib/i18n";
import { createTournament } from "../actions";

export default async function NewTournamentPage() {
  await requireAdmin();
  const { t, lang } = await getT();
  return (
    <>
      <AdminBar title={t("newTournament")} back={{ href: "/admin", label: t("backToAll") }} lang={lang} here="/admin/new" langLabel={t("langToggle")} />
      <main className="page">
        <TournamentForm
          action={createTournament}
          labels={tournamentLabels(t, t("createTournament"), t("nextAddPlayers"))}
          initial={{
            name: "", slug: "", eventDate: "", gamesCount: 5, rotationMode: "RANDOM", randomRoundsFirst: 2,
            teamsEnabled: false, teamMinSize: 6, teamMaxSize: 10, timerEnabled: true, roundMinutes: 30,
            hasLogo: false, logoUrl: "/domino-logo.svg",
          }}
        />
      </main>
    </>
  );
}
