import { redirect } from "next/navigation";
import AdminBar from "@/components/AdminBar";
import { getAdmin } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  const { t, lang } = await getT();
  return (
    <>
      <AdminBar title={t("adminLogin")} kicker={t("appName")} lang={lang} here="/admin/login" langLabel={t("langToggle")} />
      <main className="page" style={{ maxWidth: 420 }}>
        <LoginForm labels={{ password: t("password"), signIn: t("signIn") }} />
      </main>
    </>
  );
}
