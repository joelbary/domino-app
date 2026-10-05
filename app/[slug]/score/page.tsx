import PhoneSignIn from "@/components/PhoneSignIn";
import PlayerShell from "@/components/PlayerShell";
import ScoreCard from "@/components/ScoreCard";
import type { TKey } from "@/lib/i18n";
import { handsFor, sideOf } from "@/lib/play";
import { playerView } from "@/lib/playerView";

export const dynamic = "force-dynamic";

const ERRS = new Set(["errNotSeated", "errLocked", "errNeedScore", "errPoints", "errScore"]);
const KEYS: TKey[] = [
  "handByHand", "finalOnly", "addHand", "hands", "hand", "tapToFix", "noHands", "points", "whoWon", "addHandFor", "newHand", "fixHand",
  "deleteHand", "enterFinal", "finalHelp", "saveFinal", "submitScore", "submitHelp", "reached100", "waitingOpp", "oppSubmitted",
  "confirmScore", "wrongScore", "askSubmitTitle", "askSubmitBody", "askSubmitYes", "askConfirmTitle", "askConfirmBody", "askConfirmYes", "askNo", "correctScore", "correctHelp", "confirmedFinal", "disputedMsg", "editAfterSubmit", "submittedBy", "you", "cancel", "save",
];

export default async function ScorePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ err?: string }> }) {
  const { slug } = await params;
  const { err } = await searchParams;
  const v = await playerView(slug);
  const { tour, t, live, myTable, mySide, nameOf, firstOf } = v;
  const base = `/${tour.slug}`;
  const hs = myTable ? await handsFor(myTable.id) : [];
  const L = Object.fromEntries(KEYS.map((k) => [k, t(k)]));
  const short = (a: number, b: number) => `${firstOf(a)} & ${firstOf(b)}`;

  return (
    <PlayerShell v={v} tab="score" here={`${base}/score`} refresh={10}>
      {!v.player ? (
        <>
          <h2 style={{ fontSize: 22 }}>{t("signInToScore")}</h2>
          <PhoneSignIn back={`${base}/score`} labels={{ phone: t("yourPhone"), enter: t("enterTournament"), help: t("phoneLoginHelp") }} />
        </>
      ) : !live ? (
        <section className="card"><p className="help" style={{ fontSize: 16 }}>{t("noLiveRound")}</p></section>
      ) : !myTable || !mySide ? (
        <div className="notice warn">{t("notInRound")}</div>
      ) : (
        <>
          <div className="spread">
            <h1 style={{ fontSize: 26 }}>{t("scoreTitle", { r: live.number, n: myTable.number })}</h1>
            <span className="help">{t("firstTo100")}</span>
          </div>
          {err && ERRS.has(err) && <div className="notice bad" role="alert">{t(err as TKey)}</div>}
          <ScoreCard
            slug={tour.slug}
            tableId={myTable.id}
            mySide={mySide}
            pairA={short(myTable.a1, myTable.a2)}
            pairB={short(myTable.b1, myTable.b2)}
            scoreA={myTable.scoreA}
            scoreB={myTable.scoreB}
            status={myTable.status}
            submittedBySide={myTable.submittedBy ? sideOf(myTable, myTable.submittedBy) : null}
            submittedByName={myTable.submittedBy ? nameOf(myTable.submittedBy) : null}
            hands={hs.map((h) => ({ id: h.id, n: h.handNumber, pair: h.pair === "B" ? "B" : "A", points: h.points }))}
            L={L}
          />
        </>
      )}
    </PlayerShell>
  );
}
