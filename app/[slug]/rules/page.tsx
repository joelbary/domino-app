import PlayerShell from "@/components/PlayerShell";
import { playerView } from "@/lib/playerView";
import { rulesFor } from "@/lib/rules";

export const dynamic = "force-dynamic";

export default async function RulesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const v = await playerView(slug);
  const { tour, t } = v;
  const rules = await rulesFor(tour);
  return (
    <PlayerShell v={v} tab="rules" here={`/${tour.slug}/rules`} refresh={120}>
      <h1 style={{ fontSize: 28 }}>{t("rules")}</h1>
      {!rules && <p className="help" style={{ fontSize: 16 }}>{t("noRules")}</p>}
      {rules?.file && (
        rules.file.type.startsWith("image/") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <a href={rules.file.url} target="_blank" rel="noopener noreferrer"><img src={rules.file.url} alt={t("rules")} style={{ width: "100%", borderRadius: 12, background: "#fff" }} /></a>
        ) : (
          <a href={rules.file.url} target="_blank" rel="noopener noreferrer" className="btn big block">{t("openRulesDoc")}</a>
        )
      )}
      {rules?.text && (
        <section className="card"><p className="rules-text">{rules.text}</p></section>
      )}
    </PlayerShell>
  );
}
