import { adminTournament } from "@/lib/access";
import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackIcon } from "@/components/AdminBar";
import PinPad from "@/components/PinPad";
import { exclusions } from "@/db/schema";
import { isMplUnlocked } from "@/lib/auth";
import { db } from "@/lib/db";
import { getT } from "@/lib/i18n";
import { listEntries } from "@/lib/tournaments";
import { mplAdd, mplLock, mplRemove, mplSetMe, mplUnlock } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function MplPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { session, tour } = await adminTournament(slug);
  if (session.role !== "owner") notFound();
  const { t } = await getT();
  const base = `/admin/t/${tour.slug}`;
  const unlocked = await isMplUnlocked();

  const top = (
    <div className="bar-inner">
      <Link href={base} className="icon-btn" aria-label={t("backToTournament")}><BackIcon /></Link>
      <h1 style={{ flex: 1, fontSize: 22, letterSpacing: "0.08em" }}>MPL</h1>
      {unlocked && (
        <form action={mplLock}>
          <input type="hidden" name="slug" value={tour.slug} />
          <button className="btn small" style={{ background: "#2c322b" }}>{t("lock")}</button>
        </form>
      )}
    </div>
  );

  if (!unlocked) {
    return (
      <main className="pin-page">
        {top}
        <PinPad action={mplUnlock} slug={tour.slug} label={t("enterPin")} />
      </main>
    );
  }

  const ents = await listEntries(tour.id);
  const list = await db.select().from(exclusions).where(and(eq(exclusions.tournamentId, tour.id)));
  const nameOf = (id: number) => {
    const e = ents.find((x) => x.entryId === id);
    return e ? `${e.firstName} ${e.lastName}`.trim() : "?";
  };
  const me = tour.mplOwnerEntryId;
  const listed = new Set(list.map((x) => x.entryBId));

  return (
    <main className="pin-page">
      {top}
      <div className="page" style={{ color: "var(--ink)" }}>
        <form action={mplSetMe} className="card stack">
          <input type="hidden" name="tournamentId" value={tour.id} />
          <label className="field">{t("mplMe")}
            <select name="entryId" defaultValue={me ?? ""}>
              <option value="">{t("mplNotPlaying")}</option>
              {ents.map((e) => <option key={e.entryId} value={e.entryId}>{e.firstName} {e.lastName}</option>)}
            </select>
          </label>
          <p className="help">{t("mplMeHelp")}</p>
          <button className="btn small" style={{ alignSelf: "flex-start" }}>{t("save")}</button>
        </form>

        {me && (
          <section className="card stack">
            <h2>{t("mplList")}</h2>
            {list.length === 0 && <p className="help">{t("mplEmpty")}</p>}
            <div className="list">
              {list.map((x) => (
                <form key={x.id} action={mplRemove} className="item" style={{ background: "var(--ground)" }}>
                  <input type="hidden" name="tournamentId" value={tour.id} />
                  <input type="hidden" name="id" value={x.id} />
                  <span className="main"><span className="name">{nameOf(x.entryBId)}</span></span>
                  <button className="icon-btn" aria-label={`${t("remove")}: ${nameOf(x.entryBId)}`} style={{ border: 0, background: "transparent", cursor: "pointer" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                  </button>
                </form>
              ))}
            </div>
            <form action={mplAdd} className="row" style={{ flexWrap: "nowrap" }}>
              <input type="hidden" name="tournamentId" value={tour.id} />
              <select name="entryId" aria-label={t("mplAdd")} required defaultValue="">
                <option value="" disabled>—</option>
                {ents.filter((e) => e.entryId !== me && !listed.has(e.entryId)).map((e) => (
                  <option key={e.entryId} value={e.entryId}>{e.firstName} {e.lastName}</option>
                ))}
              </select>
              <button className="btn" style={{ flex: "none" }}>{t("mplAdd")}</button>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}
