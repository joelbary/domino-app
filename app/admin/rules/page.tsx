import AdminBar from "@/components/AdminBar";
import RulesForm from "@/components/RulesForm";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { getGeneralRules } from "@/lib/rules";
import { saveGeneralRules } from "../rules-actions";
import { rulesLabels } from "@/lib/rulesLabels";

export const dynamic = "force-dynamic";

export default async function GeneralRulesPage() {
  await requireOwner();
  const { t, lang } = await getT();
  const g = await getGeneralRules();
  return (
    <>
      <AdminBar title={t("generalRules")} back={{ href: "/admin", label: t("backToAll") }} lang={lang} here="/admin/rules" langLabel={t("langToggle")} />
      <main className="page">
        <p className="help">{t("generalRulesHelp")}</p>
        <RulesForm
          action={saveGeneralRules}
          text={g?.text ?? ""}
          file={g?.fileType ? { url: `/rules-file?v=${g.updatedAt.getTime()}`, name: g.fileName ?? "rules" } : null}
          labels={rulesLabels(t)}
        />
      </main>
    </>
  );
}
