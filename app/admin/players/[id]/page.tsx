import Link from "next/link";
import { notFound } from "next/navigation";
import AdminBar from "@/components/AdminBar";
import { SimpleForm } from "@/components/AdminForms";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { formatPhone } from "@/lib/phone";
import { playerById, playerRecord } from "@/lib/records";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { normName } from "@/lib/directory";
import { allPlayers } from "@/lib/records";
import { deleteBookPlayer, mergeBookPlayers, updateGlobalPlayer } from "../../admin-actions";

export const dynamic = "force-dynamic";

export default async function PlayerRecordPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; err?: string }> }) {
  await requireOwner();
  const { id } = await params;
  const { msg, err } = await searchParams;
  const p = await playerById(parseInt(id, 10));
  if (!p) notFound();
  const { t, lang } = await getT();
  const r = await playerRecord(p.id);
  const name = `${p.firstName} ${p.lastName}`.trim();
  const key = normName(p.firstName, p.lastName);
  const others = (await allPlayers()).filter((o) => o.id !== p.id);
  // Same name first, so the likely duplicate is at the top of the list.
  others.sort((a, b) => Number(normName(b.firstName, b.lastName) === key) - Number(normName(a.firstName, a.lastName) === key));
  const okMsgs = ["playersMerged"], errMsgs = ["errHasGames", "errBothPlayed"];
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
      <AdminBar title={name} sub={formatPhone(p.phone) || t("noPhone")} back={{ href: "/admin/players", label: t("addressBook") }} lang={lang} here={`/admin/players/${p.id}`} langLabel={t("langToggle")} />
      <main className="page">
        {msg && okMsgs.includes(msg) && <div className="notice ok">{t(msg as "playersMerged")}</div>}
        {err && errMsgs.includes(err) && <div className="notice bad" role="alert">{t(err as "errHasGames")}</div>}
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
        <details className="card disclose" open={others.some((o) => normName(o.firstName, o.lastName) === key) || undefined}>
          <summary>{t("mergeWith")}</summary>
          <form action={mergeBookPlayers} className="stack">
            <input type="hidden" name="keepId" value={p.id} />
            <p className="help">{t("mergeHelp")}</p>
            <label className="field">
              <select name="dropId" required defaultValue="">
                <option value="" disabled>—</option>
                {others.map((o) => (
                  <option key={o.id} value={o.id}>{`${o.firstName} ${o.lastName}`.trim()} · {formatPhone(o.phone) || t("noPhone")}</option>
                ))}
              </select>
            </label>
            <ConfirmSubmit message={t("mergeConfirm")} className="btn">{t("merge")}</ConfirmSubmit>
          </form>
        </details>
        <form action={deleteBookPlayer} style={{ marginTop: 8 }}>
          <input type="hidden" name="playerId" value={p.id} />
          <ConfirmSubmit message={t("deleteFromBookConfirm")} className="btn danger small">{t("deleteFromBook")}</ConfirmSubmit>
        </form>
      </main>
    </>
  );
}
