import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import AdminBar from "@/components/AdminBar";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { EditPlayerForm, ReplaceForm } from "@/components/PlayerForms";
import { entries, players } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { formatPhone } from "@/lib/phone";
import { playerLabels } from "@/lib/playerLabels";
import { getTournamentBySlug, listTeams } from "@/lib/tournaments";
import { removePlayer, replacePlayer, updatePlayer } from "../../../../actions";

export const dynamic = "force-dynamic";

export default async function EditPlayerPage({ params }: { params: Promise<{ slug: string; entryId: string }> }) {
  await requireAdmin();
  const { slug, entryId } = await params;
  const tour = await getTournamentBySlug(slug);
  if (!tour) notFound();
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

  return (
    <>
      <AdminBar title={name} sub={t("editPlayer")} back={{ href: `${base}/players`, label: t("players") }} lang={lang} here={`${base}/players/${id}`} langLabel={t("langToggle")} />
      <main className="page" style={{ maxWidth: 560 }}>
        <section className="card stack">
          <h2>{t("editPlayer")}</h2>
          <EditPlayerForm
            action={updatePlayer} tournamentId={tour.id} entryId={id} teams={tms} teamsEnabled={tour.teamsEnabled}
            labels={labels} teamId={row.entry.teamId}
            values={{ firstName: row.player.firstName, lastName: row.player.lastName, phone: formatPhone(row.player.phone) }}
          />
        </section>
        <details className="card disclose">
          <summary>{t("replacePlayer")}</summary>
          <ReplaceForm action={replacePlayer} tournamentId={tour.id} entryId={id} labels={labels} />
        </details>
        <form action={removePlayer}>
          <input type="hidden" name="tournamentId" value={tour.id} />
          <input type="hidden" name="entryId" value={id} />
          <ConfirmSubmit message={t("removeConfirm")} className="btn danger block">{t("remove")}</ConfirmSubmit>
        </form>
      </main>
    </>
  );
}
