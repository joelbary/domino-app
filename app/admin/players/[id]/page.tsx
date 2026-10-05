import Link from "next/link";
import { notFound } from "next/navigation";
import AdminBar from "@/components/AdminBar";
import { SimpleForm } from "@/components/AdminForms";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { formatPhone } from "@/lib/phone";
import { playerById, playerRecord } from "@/lib/records";
import { updateGlobalPlayer } from "../../admin-actions";

export const dynamic = "force-dynamic";

export default async function PlayerRecordPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;
  const p = await playerById(parseInt(id, 10));
  if (!p) notFound();
  const { t, lang } = await getT();
  const r = await playerRecord(p.id);
  const name = `${p.firstName} ${p.lastName}`.trim();
  const pct = r && r.games ? Math.round((r.w / r.games) * 100) : 0;
  const stats: [string, string][] = [
    [t("tournamentsPlayed"), String(r?.tournaments ?? 0)],
    [t("gamesPlayed"), String(r?.games ?? 0)],
    [t("wlt"), r ? `${r.w}-${r.l}-${r.t}` : "0-0-0"],
    [t("winPct"), `${pct}%`],
    [t("bestFinish"), r?.best ? `#${r.best}` : "—"],
    [t("titles"), String(r?.titles ?? 0)],
  ];

  return (
    <>
      <AdminBar title={name} sub={formatPhone(p.phone) || t("noPhone")} back={{ href: "/admin/players", label: t("playerDirectory") }} lang={lang} here={`/admin/players/${p.id}`} langLabel={t("langToggle")} />
      <main className="page">
        <section className="card stack">
          <h2>{t("allTime")}</h2>
          <div className="tiles" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {stats.map(([k, v]) => (
              <div key={k} style={{ background: "var(--ground)", borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 24, color: "var(--felt)" }}>{v}</div>
                <div className="help" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k}</div>
              </div>
            ))}
          </div>
        </section>
        <h2 style={{ fontSize: 22 }}>{t("history")}</h2>
        <div className="list">
          {(r?.results ?? []).slice().reverse().map((x) => (
            <Link key={x.tournamentId} href={`/admin/t/${x.slug}`} className="item" style={{ padding: "12px 14px" }}>
              <span className="main">
                <span className="name">{x.name}</span>
                <span className="meta">{x.date ? x.date.toISOString().slice(0, 10) + " · " : ""}{x.w}-{x.l}-{x.t} · {t("diff")} {x.pf - x.pa > 0 ? "+" : ""}{x.pf - x.pa}</span>
              </span>
              <span className={`pill ${x.place === 1 ? "live" : ""}`}>{x.place ? t("place", { p: x.place, n: x.of }) : t("placePending")}</span>
            </Link>
          ))}
        </div>
        <details className="card disclose">
          <summary>{t("editGlobal")}</summary>
          <SimpleForm action={updateGlobalPlayer} hidden={{ playerId: p.id }} submit={t("save")}>
            <div className="grid2 collapse">
              <label className="field">{t("firstName")}<input type="text" name="firstName" defaultValue={p.firstName} required /></label>
              <label className="field">{t("lastName")}<input type="text" name="lastName" defaultValue={p.lastName} /></label>
            </div>
            <label className="field">{t("phone")}<input type="tel" name="phone" defaultValue={formatPhone(p.phone)} /></label>
          </SimpleForm>
        </details>
      </main>
    </>
  );
}
