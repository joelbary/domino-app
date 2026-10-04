import Link from "next/link";
import LangToggle from "@/components/LangToggle";
import { getT, type TKey } from "@/lib/i18n";
import { listTournaments } from "@/lib/tournaments";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { t, lang } = await getT();
  const all = (await listTournaments()).filter((x) => x.status !== "FINISHED");
  return (
    <main>
      <section className="hero">
        <div style={{ alignSelf: "flex-end" }}>
          <LangToggle lang={lang} back="/" label={t("langToggle")} />
        </div>
        <div className="badge">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/domino-logo.svg" alt="" />
        </div>
        <h1>{t("appName")}</h1>
        <p>{t("homeTagline")}</p>
      </section>
      <div className="page">
        <div className="list">
          {all.map((x) => (
            <Link key={x.id} href={`/${x.slug}`} className="item">
              <span className="main">
                <span className="name">{x.name}</span>
                <span className="meta">domino.joelbary.com/{x.slug}</span>
              </span>
              <span className={`pill ${x.status === "LIVE" ? "live" : "warn"}`}>{t(`status${x.status}` as TKey)}</span>
            </Link>
          ))}
        </div>
        <Link href="/admin" className="mpl-link" style={{ alignSelf: "center" }}>{t("adminLink")}</Link>
      </div>
    </main>
  );
}
