import Link from "next/link";
import { notFound } from "next/navigation";
import AdminBar from "@/components/AdminBar";
import { requireAdmin } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { currentRound, getTournamentBySlug, listEntries, listTeams } from "@/lib/tournaments";

export const dynamic = "force-dynamic";

export default async function TournamentHub({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  const tour = await getTournamentBySlug(slug);
  if (!tour) notFound();
  const { t, lang } = await getT();
  const [ents, tms, round] = await Promise.all([listEntries(tour.id), listTeams(tour.id), currentRound(tour.id)]);
  const n = ents.length;
  const rem = n % 4;
  const base = `/admin/t/${tour.slug}`;

  const tiles = [
    { href: `${base}/tables`, title: t("tables"), detail: round ? t("roundOf", { r: round, n: tour.gamesCount }) : t("createRotation") },
    { href: `${base}/players`, title: t("players"), detail: `${n} · ${t("playersTile")}` },
    ...(tour.teamsEnabled ? [{ href: `${base}/teams`, title: t("teams"), detail: t("teamsTile", { n: tms.length }) }] : []),
    { href: `${base}/standings`, title: `${t("standings")} · ${t("results")}`, detail: tour.resultsPublished ? t("resultsPublishedMsg") : t("publishResults") },
    { href: `${base}/settings`, title: t("settings"), detail: t("settingsTile") },
    { href: `/${tour.slug}`, title: t("publicPage"), detail: `domino.joelbary.com/${tour.slug}` },
  ];
  const later = [t("coAdmins")];

  return (
    <>
      <AdminBar
        title={tour.name}
        sub={`/${tour.slug} · ${n} ${t("players").toLowerCase()} · ${round ? t("roundOf", { r: round, n: tour.gamesCount }) : t("notStarted")}`}
        back={{ href: "/admin", label: t("backToAll") }}
        lang={lang} here={base} langLabel={t("langToggle")}
      />
      <main className="page">
        <div className={`notice ${n > 0 && rem === 0 ? "ok" : "warn"}`}>
          {n > 0 && rem === 0 ? t("multipleOf4Ok", { n }) : t("multipleOf4Need", { n, k: 4 - rem, r: rem })}
        </div>
        {ents.some((e) => !e.phone) && (
          <Link href={`${base}/players?nophone=1`} className="notice bad" style={{ textDecoration: "none" }}>
            {t("noPhoneWarn", { n: ents.filter((e) => !e.phone).length })} {t("showNoPhone")} →
          </Link>
        )}
        <div className="tiles">
          {tiles.map((x) => (
            <Link key={x.href} href={x.href} className="tile">
              <span className="t">{x.title}</span>
              <span className="d">{x.detail}</span>
            </Link>
          ))}
          {later.map((title) => (
            <div key={title} className="tile disabled" aria-disabled="true">
              <span className="t">{title}</span>
              <span className="d">{t("comingSoon")}</span>
            </div>
          ))}
        </div>
        <Link href={`${base}/mpl`} className="mpl-link">MPL</Link>
      </main>
    </>
  );
}
