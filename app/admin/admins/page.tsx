import { asc, eq } from "drizzle-orm";
import AdminBar from "@/components/AdminBar";
import { NewAdminForm, SimpleForm } from "@/components/AdminForms";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { admins, tournamentAdmins, tournaments } from "@/db/schema";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { createCoAdmin, deleteCoAdmin, setCoAdminPassword, toggleCoAdmin } from "../admin-actions";

export const dynamic = "force-dynamic";

export default async function CoAdminsPage() {
  await requireOwner();
  const { t, lang } = await getT();
  const list = await db.select().from(admins).orderBy(asc(admins.name));
  const links = await db
    .select({ adminId: tournamentAdmins.adminId, name: tournaments.name })
    .from(tournamentAdmins)
    .innerJoin(tournaments, eq(tournamentAdmins.tournamentId, tournaments.id));
  const created = await db.select({ adminId: tournaments.createdByAdminId, name: tournaments.name }).from(tournaments);
  const managesOf = (id: number) => [...new Set([...created, ...links].filter((x) => x.adminId === id).map((x) => x.name))];
  const L = { fullName: t("fullName"), loginName: t("loginName"), tempPassword: t("tempPassword") };

  return (
    <>
      <AdminBar title={t("coAdminsTitle")} back={{ href: "/admin", label: t("backToAll") }} lang={lang} here="/admin/admins" langLabel={t("langToggle")} />
      <main className="page">
        <p className="help">{t("coAdminsHelp")}</p>
        <details className="card disclose" open={list.length === 0}>
          <summary>+ {t("addCoAdmin")}</summary>
          <NewAdminForm action={createCoAdmin} labels={L} submit={t("createAccount")} />
        </details>
        <div className="list" style={{ gap: 10 }}>
          {list.map((a) => {
            const m = managesOf(a.id);
            return (
              <section key={a.id} className="card stack" style={{ gap: 8 }}>
                <div className="spread">
                  <div>
                    <h2 style={{ fontSize: 20 }}>{a.name}</h2>
                    <span className="help">{a.email}</span>
                  </div>
                  {!a.active && <span className="pill bad">{t("disabled")}</span>}
                </div>
                <p className="help">{m.length ? t("manages", { list: m.join(", ") }) : t("managesNone")}</p>
                <details className="disclose">
                  <summary>{t("resetPassword")}</summary>
                  <SimpleForm action={setCoAdminPassword} hidden={{ adminId: a.id }} submit={t("resetPassword")}>
                    <input type="text" name="password" minLength={8} required aria-label={t("newPassword")} placeholder={t("newPassword")} autoComplete="new-password" />
                  </SimpleForm>
                </details>
                <div className="row">
                  <form action={toggleCoAdmin}>
                    <input type="hidden" name="adminId" value={a.id} />
                    <input type="hidden" name="active" value={a.active ? "0" : "1"} />
                    <button className="btn dark small">{a.active ? t("disable") : t("enable")}</button>
                  </form>
                  <form action={deleteCoAdmin}>
                    <input type="hidden" name="adminId" value={a.id} />
                    <ConfirmSubmit message={t("deleteAdminConfirm")} className="btn danger small">{t("deleteAdmin")}</ConfirmSubmit>
                  </form>
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
