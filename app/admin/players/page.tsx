import Link from "next/link";
import AdminBar from "@/components/AdminBar";
import DirectoryList from "@/components/DirectoryList";
import { BookAddForm, BookUploadForm } from "@/components/BookForms";
import { addBookPlayer, uploadBook } from "../admin-actions";
import { requireOwner } from "@/lib/auth";
import { getT } from "@/lib/i18n";
import { formatPhone } from "@/lib/phone";
import { allPlayers, allRecords } from "@/lib/records";

export const dynamic = "force-dynamic";

export default async function DirectoryPage({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  await requireOwner();
  const { sort = "name" } = await searchParams;
  const { t, lang } = await getT();
  const [ps, recs] = await Promise.all([allPlayers(), allRecords()]);
  const rows = ps.map((p) => {
    const r = recs.get(p.id);
    return {
      id: p.id, name: `${p.firstName} ${p.lastName}`.trim(), phone: formatPhone(p.phone),
      tournaments: r?.tournaments ?? 0, games: r?.games ?? 0, wins: r?.w ?? 0,
      wlt: r ? `${r.w}-${r.l}-${r.t}` : "0-0-0", best: r?.best ? `${t("bestFinish")}: #${r.best}` : "", titles: r?.titles ?? 0,
    };
  });
  if (sort === "wins") rows.sort((a, b) => b.wins - a.wins || b.games - a.games);
  if (sort === "tournaments") rows.sort((a, b) => b.tournaments - a.tournaments || b.wins - a.wins);
  const sorts = [["name", t("sortName")], ["wins", t("sortWins")], ["tournaments", t("sortTournaments")]];

  return (
    <>
      <AdminBar title={t("addressBook")} sub={`${rows.length} ${t("playersPlural")}`} back={{ href: "/admin", label: t("backToAll") }} lang={lang} here="/admin/players" langLabel={t("langToggle")} />
      <main className="page">
        <p className="help">{t("addressBookHelp")}</p>
        <div className="grid2 collapse" style={{ alignItems: "start" }}>
          <details className="card disclose">
            <summary>+ {t("addToBook")}</summary>
            <BookAddForm action={addBookPlayer} labels={{ firstName: t("firstName"), lastName: t("lastName"), phone: t("phone"), phoneHelp: t("phoneHelp"), addToBook: t("addToBook") }} />
          </details>
          <details className="card disclose">
            <summary>{t("uploadToBook")}</summary>
            <BookUploadForm action={uploadBook} labels={{ uploadHelp: t("uploadHelp"), downloadTemplate: t("downloadTemplate"), chooseFile: t("chooseFile"), upload: t("upload") }} />
          </details>
        </div>
        <p className="help">{t("directoryHelp")}</p>
        <nav className="chips" aria-label={t("sortBy")}>
          {sorts.map(([k, label]) => (
            <Link key={k} href={`/admin/players?sort=${k}`} className="chip" aria-current={sort === k ? "page" : undefined}>{label}</Link>
          ))}
        </nav>
        <DirectoryList rows={rows} labels={{ search: t("searchPlayers"), noPhone: t("noPhone"), tournaments: t("tournamentsPlayed"), games: t("gamesPlayed"), titles: t("titles") }} />
      </main>
    </>
  );
}
