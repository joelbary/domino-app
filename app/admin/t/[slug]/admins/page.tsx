import { asc, eq } from "drizzle-orm";
import AdminBar from "@/components/AdminBar";
import { NewAdminForm, SimpleForm } from "@/components/AdminForms";
import { admins, tournamentAdmins } from "@/db/schema";
import { adminTournament } from "@/lib/access";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { addTournamentAdmin, removeTournamentAdmin } from "../../../admin-actions";

export const dynamic = "force-dynamic";

export default async function TournamentAdminsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ msg?: string }> }) {
  const { slug } = await params;
  const { msg } = await searchParams;
  const { tour } = await adminTournament(slug);
  const { t, lang } = await getT();
  const base = `/admin/t/${tour.slug}`;
  const all = await db.select().from(admins).where(eq(admins.active, true)).orderBy(asc(admins.name));
  const assigned = await db.select({ adminId: tournamentAdmins.adminId }).from(tournamentAdmins).where(eq(tournamentAdmins.tournamentId, tour.id));
  const ids = new Set(assigned.map((a) => a.adminId));
  const creator = all.find((a) => a.id === tour.createdByAdminId);
  const L = { fullName: t("fullName"), loginName: t("loginName"), tempPassword: t("tempPassword") };

  return (
    <>
      <AdminBar title={t("coAdminsTitle")} sub={tour.name} back={{ href: base, label: t("backToTournament") }} lang={lang} here={`${base}/admins`} langLabel={t("langToggle")} />
      <main className="page">
        {msg && ["accessRemoved", "accessAdded", "accountCreated"].includes(msg) && (
          <div className="notice ok">{t(msg as "accessRemoved" | "accessAdded" | "accountCreated")}</div>
        )}
        <section className="card stack" style={{ gap: 8 }}>
          <h2>{t("tournamentAdmins")}</h2>
          <div className="item" style={{ background: "var(--ground)" }}>
            <span className="main"><span className="name">{t("mainAdmin")}</span></span>
          </div>
          {creator && (
            <div className="item" style={{ background: "var(--ground)" }}>
              <span className="main"><span className="name">{creator.name}</span><span className="meta">{t("createdBy", { name: creator.name })}</span></span>
            </div>
          )}
          {all.filter((a) => ids.has(a.id)).map((a) => (
            <form key={a.id} action={removeTournamentAdmin} className="item" style={{ background: "var(--ground)" }}>
              <input type="hidden" name="tournamentId" value={tour.id} />
              <input type="hidden" name="adminId" value={a.id} />
              <span className="main"><span className="name">{a.name}</span><span className="meta">{a.email}</span></span>
              <button className="btn danger small">{t("removeAccess")}</button>
            </form>
          ))}
        </section>
        {all.some((a) => !ids.has(a.id) && a.id !== tour.createdByAdminId) && (
          <section className="card">
            <SimpleForm action={addTournamentAdmin} hidden={{ tournamentId: tour.id }} submit={t("add")} className="stack">
              <label className="field">{t("addExisting")}
                <select name="adminId" required defaultValue="">
                  <option value="" disabled>—</option>
                  {all.filter((a) => !ids.has(a.id) && a.id !== tour.createdByAdminId).map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                  ))}
                </select>
              </label>
            </SimpleForm>
          </section>
        )}
        <details className="card disclose">
          <summary>{t("orCreateNew")}</summary>
          <NewAdminForm action={addTournamentAdmin} labels={L} hidden={{ tournamentId: tour.id }} submit={t("createAccount")} />
        </details>
        <p className="help">{t("coAdminsHelp")}</p>
      </main>
    </>
  );
}
