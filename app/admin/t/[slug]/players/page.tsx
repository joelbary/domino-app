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
import { addFromBook, addPlayer, setStandby, standbyLast, uploadPlayers } from "../../../actions";
import Link from "next/link";

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
  const playing = ents.filter((e) => !e.standby);
  const waiting = ents.filter((e) => e.standby).sort((a, b) => a.entryId - b.entryId);
  const n = playing.length;
  const rem = n % 4;
  const room = 3 - waiting.length;
  // The last players who signed up (highest entry number) are the ones suggested for stand-by.
  const lastIn = playing.slice().sort((a, b) => b.entryId - a.entryId).slice(0, Math.min(rem, room));
  const okMsgs = new Set(["playerReplaced", "playerRemoved", "playerLinked", "standbyOn", "standbyOff", "standbyReplaced"]);
  const fullName = (e: { firstName: string; lastName: string }) => `${e.firstName} ${e.lastName}`.trim();

  return (
    <>
      <AdminBar title={`${t("players")} · ${n}${waiting.length ? ` + ${waiting.length}` : ""}`} sub={tour.name} back={{ href: base, label: t("backToTournament") }} lang={lang} here={`${base}/players`} langLabel={t("langToggle")} />
      <main className="page">
        {msg && okMsgs.has(msg) && <div className="notice ok" role="status">{t(msg as TKey)}</div>}
        <div className={`notice ${n > 0 && rem === 0 ? "ok" : "warn"}`}>
          {n > 0 && rem === 0 ? t("multipleOf4Ok", { n }) : t("multipleOf4Need", { n, k: 4 - rem, r: rem })}
        </div>
        {(waiting.length > 0 || (rem > 0 && lastIn.length > 0 && n > 4)) && (
          <section className="card stack">
            <h2>{t("standbyTitle")} · {waiting.length}/3</h2>
            <p className="help">{t("standbyHelp")}</p>
            {waiting.length > 0 && (
              <div className="list">
                {waiting.map((e, i) => (
                  <div key={e.entryId} className="item" style={{ padding: "10px 12px", gap: 8 }}>
                    <span className="main">
                      <Link href={`${base}/players/${e.entryId}`} className="name">{i + 1}. {fullName(e)}</Link>
                      <span className="meta">{formatPhone(e.phone) || t("noPhone")}</span>
                    </span>
                    <form action={setStandby}>
                      <input type="hidden" name="tournamentId" value={tour.id} />
                      <input type="hidden" name="entryId" value={e.entryId} />
                      <input type="hidden" name="on" value="0" />
                      <button className="btn ghost small">{t("standbyBack")}</button>
                    </form>
                  </div>
                ))}
              </div>
            )}
            {rem > 0 && lastIn.length > 0 && n > 4 && (
              <form action={standbyLast} className="stack">
                <input type="hidden" name="tournamentId" value={tour.id} />
                <p className="help">{t("standbySuggest", { n, k: lastIn.length, names: lastIn.map(fullName).join(", ") })}</p>
                <button className="btn">{t("standbyLastBtn", { k: lastIn.length })}</button>
              </form>
            )}
          </section>
        )}
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
          rows={ents.map((e) => ({ entryId: e.entryId, name: `${e.firstName} ${e.lastName}`.trim(), phone: formatPhone(e.phone), team: e.teamName, standby: e.standby }))}
        />
      </main>
    </>
  );
}
