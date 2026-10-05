import AdminBar from "@/components/AdminBar";
import RulesForm from "@/components/RulesForm";
import { adminTournament } from "@/lib/access";
import { getT } from "@/lib/i18n";
import { rulesLabels } from "@/lib/rulesLabels";
import { saveTournamentRules } from "../../../rules-actions";

export const dynamic = "force-dynamic";

export default async function TournamentRulesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tour } = await adminTournament(slug);
  const { t, lang } = await getT();
  const base = `/admin/t/${tour.slug}`;
  return (
    <>
      <AdminBar title={t("rules")} sub={tour.name} back={{ href: base, label: t("backToTournament") }} lang={lang} here={`${base}/rules`} langLabel={t("langToggle")} />
      <main className="page">
        <p className="help">{t("tournamentRulesHelp")}</p>
        {!tour.rulesText && !tour.hasRulesFile && <div className="notice warn">{t("usingGeneral")}</div>}
        <RulesForm
          action={saveTournamentRules}
          hidden={{ tournamentId: tour.id }}
          text={tour.rulesText ?? ""}
          file={tour.hasRulesFile ? { url: `/t/${tour.slug}/rules-file?v=${tour.updatedAt.getTime()}`, name: tour.rulesFileName ?? "rules" } : null}
          labels={rulesLabels(t)}
        />
      </main>
    </>
  );
}
