import { adminTournament } from "@/lib/access";
import { notFound } from "next/navigation";
import AdminBar from "@/components/AdminBar";
import Collapsible from "@/components/Collapsible";
import { AddFromBook, AddPlayerForm, PlayerList, UploadForm } from "@/components/PlayerForms";
import { addressBook } from "@/lib/directory";
import { getT, type TKey } from "@/lib/i18n";
import { formatPhone } from "@/lib/phone";
import { playerLabels } from "@/lib/playerLabels";
import { listEntries, listTeams } from "@/lib/tournaments";
import { addFromBook, addPlayer, uploadPlayers } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function PlayersPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ msg?: string; nophone?: string }> }) {
  const { slug } = await params;
  const { msg, nophone } = await searchParams;
  const { session, tour } = await adminTournament(slug);
  const book = await addressBook(tour.id, session.role === "owner");
  const { t, lang } = await getT();
  const [ents, tms] = await Promise.all([listEntries(tour.id), listTeams(tour.id)]);
  const base = `/admin/t/${tour.slug}`;
  const labels = playerLabels(t);
  const n = ents.length;
  const rem = n % 4;
  const okMsgs = new Set(["playerReplaced", "playerRemoved", "playerLinked"]);

  return (
    <>
      <AdminBar title={`${t("players")} · ${n}`} sub={tour.name} back={{ href: base, label: t("backToTournament") }} lang={lang} here={`${base}/players`} langLabel={t("langToggle")} />
      <main className="page">
        {msg && okMsgs.has(msg) && <div className="notice ok" role="status">{t(msg as TKey)}</div>}
        <div className={`notice ${n > 0 && rem === 0 ? "ok" : "warn"}`}>
          {n > 0 && rem === 0 ? t("multipleOf4Ok", { n }) : t("multipleOf4Need", { n, k: 4 - rem, r: rem })}
        </div>
        {ents.some((e) => !e.phone) && <div className="notice bad">{t("noPhoneWarn", { n: ents.filter((e) => !e.phone).length })}</div>}
        <div className="grid2 collapse" style={{ alignItems: "start" }}>
          {book.some((b) => !b.inTournament) && (
            <Collapsible initialOpen summary={t("fromBook")}>
              <AddFromBook action={addFromBook} tournamentId={tour.id} teams={tms} teamsEnabled={tour.teamsEnabled} labels={labels} book={book} />
            </Collapsible>
          )}
          <Collapsible initialOpen={n === 0 && !book.some((b) => !b.inTournament)} summary={`+ ${t("addPlayer")} (${t("newPlayer")})`}>
            <AddPlayerForm action={addPlayer} tournamentId={tour.id} teams={tms} teamsEnabled={tour.teamsEnabled} labels={labels} book={book} />
          </Collapsible>
          <Collapsible summary={t("uploadFile")}>
            <UploadForm action={uploadPlayers} tournamentId={tour.id} labels={labels} />
          </Collapsible>
        </div>
        <PlayerList
          initialNoPhone={nophone === "1"}
          base={base}
          labels={labels}
          rows={ents.map((e) => ({ entryId: e.entryId, name: `${e.firstName} ${e.lastName}`.trim(), phone: formatPhone(e.phone), team: e.teamName }))}
        />
      </main>
    </>
  );
}
