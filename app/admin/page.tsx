import Link from "next/link";
import AdminBar from "@/components/AdminBar";
import { requireAdmin } from "@/lib/auth";
import { getT, type TKey } from "@/lib/i18n";
import { listTournaments } from "@/lib/tournaments";
import { manageableIds } from "@/lib/access";
import { logout } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const session = await requireAdmin();
  const { t, lang } = await getT();
  const allowed = await manageableIds(session);
  const list = (await listTournaments()).filter((x) => allowed === null || allowed.includes(x.id));
  const pill = { LIVE: "live", SETUP: "warn", FINISHED: "" } as const;
  return (
    <>
      <AdminBar title={t("allTournaments")} kicker={session.role === "owner" ? t("globalAdmin") : t("signedInAs", { name: session.name ?? "" })} lang={lang} here="/admin" langLabel={t("langToggle")} />
      <main className="page">
        <Link href="/admin/new" className="btn big block">+ {t("newTournament")}</Link>
        {list.length === 0 && <p className="help">{t("noTournaments")}</p>}
        <div className="list">
          {list.map((x) => (
            <Link key={x.id} href={`/admin/t/${x.slug}`} className="item" style={{ padding: "14px 16px" }}>
              <span className="main">
                <span className="name" style={{ fontFamily: "var(--display)", fontSize: 21 }}>{x.name}</span>
                <span className="meta">domino.joelbary.com/{x.slug}</span>
                <span className="meta">
                  {x.playerCount} {t("players").toLowerCase()} · {x.gamesCount} {t("games")}
                  {x.rotationMode === "SWISS" ? ` · ${t("randomSwiss")}` : ""}
                  {x.teamsEnabled ? ` · ${t("teams")}` : ""}
                  {x.eventDate ? ` · ${x.eventDate.toISOString().slice(0, 10)}` : ""}
                </span>
              </span>
              <span className={`pill ${pill[x.status]}`}>{t(`status${x.status}` as TKey)}</span>
            </Link>
          ))}
        </div>
        <div className="row" style={{ justifyContent: "center" }}>
          {session.role === "owner" ? (
            <>
              <Link href="/admin/players" className="btn dark small">{t("playerDirectory")}</Link>
              <Link href="/admin/rules" className="btn dark small">{t("generalRules")}</Link>
              <Link href="/admin/admins" className="btn dark small">{t("coAdminsTitle")}</Link>
            </>
          ) : (
            <Link href="/admin/account" className="btn dark small">{t("myAccount")}</Link>
          )}
          <form action={logout}>
            <button className="btn dark small">{t("signOut")}</button>
          </form>
        </div>
      </main>
    </>
  );
}
