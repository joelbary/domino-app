import { notFound } from "next/navigation";
import LangToggle from "@/components/LangToggle";
import { getT } from "@/lib/i18n";
import { getTournamentBySlug } from "@/lib/tournaments";

export const dynamic = "force-dynamic";

// Players' page for one tournament. Tables, scores and standings arrive in later phases.
export default async function TournamentPublic({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tour = await getTournamentBySlug(slug.toLowerCase());
  if (!tour) notFound();
  const { t, lang } = await getT();
  return (
    <main>
      <section className="hero" style={{ minHeight: "100dvh", justifyContent: "center" }}>
        <div style={{ position: "absolute", top: 16, right: 16 }}>
          <LangToggle lang={lang} back={`/${tour.slug}`} label={t("langToggle")} />
        </div>
        <div className="badge">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/t/${tour.slug}/logo?v=${tour.updatedAt.getTime()}`} alt="" />
        </div>
        <h1>{tour.name}</h1>
        <p>{tour.gamesCount} {t("games")}{tour.teamsEnabled ? ` · ${t("teams")}` : ""}</p>
        <p style={{ maxWidth: 340 }}>{t("publicSoon")}</p>
      </section>
    </main>
  );
}
