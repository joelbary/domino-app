import Link from "next/link";
import LangToggle from "@/components/LangToggle";
import PhoneSignIn from "@/components/PhoneSignIn";
import { playerSignOut } from "@/app/play-actions";
import { getT, type TKey } from "@/lib/i18n";
import { currentPlayer, myTournaments } from "@/lib/play";
import { listTournaments } from "@/lib/tournaments";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { t, lang } = await getT();
  const player = await currentPlayer();
  const mine = player ? await myTournaments(player.id) : [];
  const open = player ? [] : (await listTournaments()).filter((x) => x.status !== "FINISHED");
  const groups = [
    { label: t("liveNow"), items: mine.filter((x) => x.status === "LIVE"), color: "var(--ok-ink)" },
    { label: t("comingUp"), items: mine.filter((x) => x.status === "SETUP"), color: "var(--amber)" },
    { label: t("pastTournaments"), items: mine.filter((x) => x.status === "FINISHED"), color: "var(--muted)" },
  ];

  return (
    <main>
      <section className="hero" style={{ paddingBottom: player ? 24 : 32 }}>
        <div style={{ alignSelf: "flex-end" }}>
          <LangToggle lang={lang} back="/" label={t("langToggle")} />
        </div>
        {!player && (
          <div className="badge">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/domino-logo.svg" alt="" />
          </div>
        )}
        <h1>{player ? t("hi", { name: player.firstName }) : t("appName")}</h1>
        <p>{player ? t("myTournaments") : t("homeTagline")}</p>
      </section>
      <div className="page">
        {!player && <PhoneSignIn back="/" labels={{ phone: t("yourPhone"), enter: t("enterTournament"), help: t("phoneLoginHelp") }} />}
        {player && mine.length === 0 && <p className="help">{t("noMyTournaments")}</p>}
        {groups.filter((g) => g.items.length).map((g) => (
          <div key={g.label} className="stack" style={{ gap: 8 }}>
            <div className="section-label" style={{ color: g.color }}>{g.label}</div>
            {g.items.map((x) => (
              <Link key={x.id} href={`/${x.slug}`} className="item" style={{ padding: "14px 16px", border: x.status === "LIVE" ? "2px solid var(--felt)" : undefined }}>
                <span className="main">
                  <span className="name" style={{ fontFamily: "var(--display)", fontSize: 21 }}>{x.name}</span>
                  <span className="meta">domino.joelbary.com/{x.slug}{x.eventDate ? ` · ${x.eventDate.toISOString().slice(0, 10)}` : ""}</span>
                </span>
                <span className={`pill ${x.status === "LIVE" ? "live" : x.status === "SETUP" ? "warn" : ""}`}>{t(`status${x.status}` as TKey)}</span>
              </Link>
            ))}
          </div>
        ))}
        {open.length > 0 && (
          <div className="list">
            {open.map((x) => (
              <Link key={x.id} href={`/${x.slug}`} className="item">
                <span className="main">
                  <span className="name">{x.name}</span>
                  <span className="meta">domino.joelbary.com/{x.slug}</span>
                </span>
                <span className={`pill ${x.status === "LIVE" ? "live" : "warn"}`}>{t(`status${x.status}` as TKey)}</span>
              </Link>
            ))}
          </div>
        )}
        {player && (
          <form action={playerSignOut} style={{ alignSelf: "center" }}>
            <input type="hidden" name="back" value="/" />
            <button className="btn dark small">{t("notYou")}</button>
          </form>
        )}
        <Link href="/admin" className="mpl-link" style={{ alignSelf: "center" }}>{t("adminLink")}</Link>
      </div>
    </main>
  );
}
