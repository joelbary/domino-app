import { eq } from "drizzle-orm";
import { tournamentAdmins } from "@/db/schema";
import { db } from "@/lib/db";
import { adminTournament } from "@/lib/access";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdminBar from "@/components/AdminBar";
import { getT } from "@/lib/i18n";
import { currentRound, listEntries, listTeams } from "@/lib/tournaments";

export const dynamic = "force-dynamic";

export default async function TournamentHub({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { session, tour } = await adminTournament(slug);
  const { t, lang } = await getT();
  const [ents, tms, round] = await Promise.all([listEntries(tour.id), listTeams(tour.id), currentRound(tour.id)]);
  const n = ents.filter((e) => !e.standby).length;
  const waiting = ents.length - n;
  const coAdminCount = (await db.select({ id: tournamentAdmins.id }).from(tournamentAdmins).where(eq(tournamentAdmins.tournamentId, tour.id))).length + (tour.createdByAdminId ? 1 : 0);
  const rem = n % 4;
  const base = `/admin/t/${tour.slug}`;

  const tiles = [
    { href: `${base}/tables`, title: t("tables"), detail: round ? t("roundOf", { r: round, n: tour.gamesCount }) : t("createRotation") },
    { href: `${base}/players`, title: t("players"), detail: `${n} · ${t("playersTile")}` },
    ...(tour.teamsEnabled ? [{ href: `${base}/teams`, title: t("teams"), detail: t("teamsTile", { n: tms.length }) }] : []),
    { href: `${base}/standings`, title: `${t("standings")} · ${t("results")}`, detail: tour.resultsPublished ? t("resultsPublishedMsg") : t("publishResults") },
    { href: `${base}/message`, title: t("messagePlayersTitle"), detail: t("messagePlayersTile") },
    { href: `${base}/export`, title: t("downloadExcel"), detail: "Excel (.xlsx)" },
    { href: `${base}/settings`, title: t("settings"), detail: t("settingsTile") },
    { href: `${base}/rules`, title: t("rules"), detail: tour.rulesText || tour.hasRulesFile ? t("rulesTile") : t("usingGeneral") },
    { href: `${base}/admins`, title: t("coAdmins"), detail: t("coAdminsTile", { n: coAdminCount }) },
    { href: `${base}/qr`, title: t("qrTitle"), detail: t("qrTile") },
    { href: `/${tour.slug}`, title: t("publicPage"), detail: `domino.joelbary.com/${tour.slug}` },
  ];
  const later: string[] = [];

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
          {waiting > 0 && ` ${t("standbyCount", { n: waiting })}`}
        </div>
        {ents.some((e) => !e.phone) && (
          <Link href={`${base}/players?nophone=1`} className="notice bad" style={{ textDecoration: "none" }}>
            {t("noPhoneWarn", { n: ents.filter((e) => !e.phone).length })} {t("showNoPhone")} →
          </Link>
        )}
        {waiting > 0 && (
          <section className="card stack">
            <h2>{t("standbyTitle")} · {waiting}/3</h2>
            <div className="list">
              {ents.filter((e) => e.standby).sort((a, b) => a.entryId - b.entryId).map((e, i) => (
                <Link key={e.entryId} href={`${base}/players/${e.entryId}`} className="item" style={{ padding: "10px 14px" }}>
                  <span className="main"><span className="name">{i + 1}. {`${e.firstName} ${e.lastName}`.trim()}</span>{i === 0 && <span className="meta">{t("standbyNext")}</span>}</span>
                </Link>
              ))}
            </div>
            <p className="help">{t("standbyHubHelp")}</p>
          </section>
        )}
        <div className="tiles">
          {tiles.map((x) => x.href.endsWith("/export") ? (
            // A file download, so a plain link (not in-app navigation).
            <a key={x.href} href={x.href} className="tile" download>
              <span className="t">{x.title}</span>
              <span className="d">{x.detail}</span>
            </a>
          ) : (
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
        {session.role === "owner" && <Link href={`${base}/mpl`} className="mpl-link">MPL</Link>}
      </main>
    </>
  );
}
