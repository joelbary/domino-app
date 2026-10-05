import AdminBar from "@/components/AdminBar";
import { SimpleForm } from "@/components/AdminForms";
import { requireAdmin } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { changeMyPassword } from "../admin-actions";

export default async function AccountPage() {
  const s = await requireAdmin();
  const { t, lang } = await getT();
  return (
    <>
      <AdminBar title={t("myAccount")} sub={s.role === "owner" ? t("mainAdmin") : s.name} back={{ href: "/admin", label: t("backToAll") }} lang={lang} here="/admin/account" langLabel={t("langToggle")} />
      <main className="page" style={{ maxWidth: 480 }}>
        {s.role === "admin" && (
          <section className="card">
            <h2 style={{ marginBottom: 10 }}>{t("changePassword")}</h2>
            <SimpleForm action={changeMyPassword} submit={t("changePassword")}>
              <label className="field">{t("currentPassword")}<input type="password" name="current" required autoComplete="current-password" /></label>
              <label className="field">{t("newPassword")}<input type="password" name="password" required minLength={8} autoComplete="new-password" /></label>
            </SimpleForm>
          </section>
        )}
      </main>
    </>
  );
}
