import { adminTournament } from "@/lib/access";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import AdminBar from "@/components/AdminBar";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { EditPlayerForm, ReplaceForm } from "@/components/PlayerForms";
import { entries, players } from "@/db/schema";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { formatPhone } from "@/lib/phone";
import { playerLabels } from "@/lib/playerLabels";
import { listTeams } from "@/lib/tournaments";
import { removePlayer, replacePlayer, replaceWithStandby, setStandby, updatePlayer } from "../../../../actions";
import { listEntries } from "@/lib/tournaments";

export const dynamic = "force-dynamic";

export default async function EditPlayerPage({ params, searchParams }: { params: Promise<{ slug: string; entryId: string }>; searchParams: Promise<{ err?: string }> }) {
  const { slug, entryId } = await params;
  const { err } = await searchParams;
  const { session, tour } = await adminTournament(slug);
  const id = parseInt(entryId, 10);
  const [row] = await db
    .select({ entry: entries, player: players })
    .from(entries)
    .innerJoin(players, eq(entries.playerId, players.id))
    .where(and(eq(entries.id, id), eq(entries.tournamentId, tour.id)))
    .limit(1);
  if (!row) notFound();
  const { t, lang } = await getT();
  const tms = await listTeams(tour.id);
  const base = `/admin/t/${tour.slug}`;
  const labels = playerLabels(t);
  const name = `${row.player.firstName} ${row.player.lastName}`.trim();
  const waiting = (await listEntries(tour.id)).filter((e) => e.standby && e.entryId !== id).sort((a, b) => a.entryId - b.entryId);
  const errs = ["errStandbyFull", "errStandbySeated", "errStandbyPlayed"];
  const nextName = waiting[0] ? `${waiting[0].firstName} ${waiting[0].lastName}`.trim() : "";

  return (
    <>
      <AdminBar title={name} sub={t("editPlayer")} back={{ href: `${base}/players`, label: t("players") }} lang={lang} here={`${base}/players/${id}`} langLabel={t("langToggle")} />
      <main className="page" style={{ maxWidth: 560 }}>
        {err && errs.includes(err) && <div className="notice bad" role="alert">{t(err as "errStandbyFull")}</div>}
        {row.entry.standby ? (
          <section className="card stack">
            <h2>{t("standbyTitle")}</h2>
            <p className="help">{t("standbyIsOn")}</p>
            <form action={setStandby}>
              <input type="hidden" name="tournamentId" value={tour.id} />
              <input type="hidden" name="entryId" value={id} />
              <input type="hidden" name="on" value="0" />
              <button className="btn block">{t("standbyBack")}</button>
            </form>
          </section>
        ) : waiting.length > 0 && (
          <section className="card stack">
            <h2>{t("standbyReplaceTitle")}</h2>
            <p className="help">{t("standbyReplaceHelp", { name: row.player.firstName, next: nextName })}</p>
            <form action={replaceWithStandby} className="stack">
              <input type="hidden" name="tournamentId" value={tour.id} />
              <input type="hidden" name="entryId" value={id} />
              <ConfirmSubmit message={t("standbyReplaceConfirm", { name, next: nextName })} className="btn block">{t("standbyReplaceBtn", { next: nextName })}</ConfirmSubmit>
            </form>
          </section>
        )}
        <section className="card stack">
          <h2>{t("editPlayer")}</h2>
          <EditPlayerForm
            action={updatePlayer} tournamentId={tour.id} entryId={id} teams={tms} teamsEnabled={tour.teamsEnabled}
            labels={labels} teamId={row.entry.teamId} phoneNote={row.player.phoneNote}
            values={{ firstName: row.player.firstName, lastName: row.player.lastName, phone: formatPhone(row.player.phone) }}
          />
        </section>
        <details className="card disclose">
          <summary>{t("replacePlayer")}</summary>
          <ReplaceForm action={replacePlayer} tournamentId={tour.id} entryId={id} labels={labels} />
        </details>
        {!row.entry.standby && (
          <form action={setStandby} style={{ marginBottom: 10 }}>
            <input type="hidden" name="tournamentId" value={tour.id} />
            <input type="hidden" name="entryId" value={id} />
            <input type="hidden" name="on" value="1" />
            <button className="btn ghost block">{t("standbyMove")}</button>
          </form>
        )}
        <form action={removePlayer}>
          <input type="hidden" name="tournamentId" value={tour.id} />
          <input type="hidden" name="entryId" value={id} />
          <ConfirmSubmit message={t("removeConfirm")} className="btn danger block">{t("remove")}</ConfirmSubmit>
        </form>
      </main>
    </>
  );
}
