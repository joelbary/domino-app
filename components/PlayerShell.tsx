import Link from "next/link";
import AutoRefresh from "@/components/AutoRefresh";
import LangToggle from "@/components/LangToggle";
import Timer from "@/components/Timer";
import type { PlayerView } from "@/lib/playerView";

const icons = {
  tables: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 4v16" /></svg>,
  score: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 4h14v16H5z" /><path d="M9 9h6M9 13h6M9 17h3" /></svg>,
  standings: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 20V10M12 20V4M18 20v-7" /></svg>,
  rules: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" /><path d="M8 7h7M8 11h7M8 15h4" /></svg>,
};

export default function PlayerShell({ v, tab, here, children, refresh = 15 }: {
  v: PlayerView; tab: "tables" | "score" | "standings" | "rules"; here: string; children: React.ReactNode; refresh?: number;
}) {
  const { tour, t, lang } = v;
  const base = `/${tour.slug}`;
  const links = [
    { key: "tables", href: base, label: t("tabTables") },
    { key: "score", href: `${base}/score`, label: t("tabScore") },
    { key: "standings", href: `${base}/standings`, label: t("tabStandings") },
    { key: "rules", href: `${base}/rules`, label: t("tabRules") },
  ] as const;
  return (
    <>
      <header className="ptop">
        <div className="ptop-inner">
          <Link href="/" className="home-btn" aria-label={t("myTournaments")} title={t("myTournaments")}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M3 11l9-8 9 8" /><path d="M5 10v10h5v-6h4v6h5V10" /></svg>
          </Link>
          <Link href="/" className="plogo" aria-label={t("myTournaments")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/t/${tour.slug}/logo?v=${tour.updatedAt.getTime()}`} alt="" />
          </Link>
          <div className="pname">
            {tour.name}
            {v.player && <small>{v.player.firstName} {v.player.lastName}</small>}
          </div>
          {v.timer && <Timer {...v.timer} alert={!!v.myTable} scoreHref={`${base}/score`} />}
          <LangToggle lang={lang} back={here} label={t("langToggle")} />
        </div>
      </header>
      <main className="pmain">{children}</main>
      <nav className="pnav" aria-label={tour.name}>
        <div className="pnav-inner">
          {links.map((l) => (
            <Link key={l.key} href={l.href} aria-current={tab === l.key ? "page" : undefined}>
              {icons[l.key]}
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
      {tour.status === "LIVE" && <AutoRefresh seconds={refresh} />}
    </>
  );
}
