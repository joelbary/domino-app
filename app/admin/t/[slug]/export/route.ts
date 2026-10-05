import ExcelJS from "exceljs";
import { adminTournament } from "@/lib/access";
import { getT } from "@/lib/i18n";
import { formatPhone } from "@/lib/phone";
import { entryNames, isFinal, seatsOf, standingsFor, teamTable } from "@/lib/schedule";
import { listEntries, listTeams } from "@/lib/tournaments";

export const dynamic = "force-dynamic";

// Downloads the whole tournament as an Excel file: standings (with rank after each round), teams,
// every game, every player's games round by round, and the player list.
export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { tour } = await adminTournament(slug);
  const { t } = await getT();
  const [{ standings, rounds }, names, ents, tms] = await Promise.all([
    standingsFor(tour.id), entryNames(tour.id), listEntries(tour.id), listTeams(tour.id),
  ]);
  const nameOf = (id: number) => names.get(id)?.name ?? "?";
  const teamOf = (id: number) => names.get(id)?.team ?? "";
  const played = rounds.filter((r) => r.tables.some(isFinal)).map((r) => r.number);

  // Rank after each round (like the old spreadsheet's Rank1, Rank2…).
  const rankAfter = new Map<number, Map<number, number>>();
  for (const n of played) rankAfter.set(n, new Map((await standingsFor(tour.id, n)).standings.map((s) => [s.entryId, s.rank])));

  const wb = new ExcelJS.Workbook();
  wb.creator = "domino.joelbary.com";
  const bold = (ws: ExcelJS.Worksheet) => {
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F4D2E" } };
    ws.views = [{ state: "frozen", ySplit: 1 }];
  };

  // 1) Standings
  const st = wb.addWorksheet(t("standings"));
  st.columns = [
    { header: "#", key: "rank", width: 6 },
    { header: t("players"), key: "name", width: 26 },
    { header: t("team"), key: "team", width: 10 },
    { header: t("gamesPlayed"), key: "games", width: 9 },
    { header: "W", key: "w", width: 5 }, { header: "L", key: "l", width: 5 }, { header: "T", key: "t", width: 5 },
    { header: t("pts"), key: "pts", width: 7 },
    { header: t("diff"), key: "diff", width: 8 },
    { header: t("pf"), key: "pf", width: 9 },
    { header: t("against"), key: "pa", width: 9 },
    ...played.map((n) => ({ header: `${t("rankAfterRound")}${n}`, key: `r${n}`, width: 12 })),
  ];
  for (const s of standings) {
    const row: Record<string, string | number> = {
      rank: s.rank, name: nameOf(s.entryId), team: teamOf(s.entryId), games: s.played,
      w: s.w, l: s.l, t: s.t, pts: s.pts, diff: s.diff, pf: s.pf, pa: s.pa,
    };
    for (const n of played) row[`r${n}`] = rankAfter.get(n)?.get(s.entryId) ?? "";
    st.addRow(row);
  }
  bold(st);

  // 2) Teams
  if (tour.teamsEnabled) {
    const teams = await teamTable(tour.id, new Map(standings.map((s) => [s.entryId, s.rank])));
    const tname = new Map(tms.map((x) => [x.id, x.name]));
    const ws = wb.addWorksheet(t("teams"));
    ws.columns = [
      { header: "#", key: "rank", width: 6 }, { header: t("team"), key: "team", width: 14 },
      { header: t("players"), key: "size", width: 10 }, { header: t("avgRankCol"), key: "avg", width: 14 },
    ];
    for (const x of teams) ws.addRow({ rank: x.rank, team: tname.get(x.teamId) ?? "", size: x.size, avg: Math.round(x.avg * 100) / 100 });
    bold(ws);
  }

  // 3) Games (one row per table)
  const gm = wb.addWorksheet(t("gamesSheet"));
  gm.columns = [
    { header: t("round"), key: "round", width: 8 }, { header: t("table"), key: "table", width: 7 },
    { header: `${t("pairA")} 1`, key: "a1", width: 22 }, { header: `${t("pairA")} 2`, key: "a2", width: 22 },
    { header: `${t("pairB")} 1`, key: "b1", width: 22 }, { header: `${t("pairB")} 2`, key: "b2", width: 22 },
    { header: `${t("score")} A`, key: "sa", width: 9 }, { header: `${t("score")} B`, key: "sb", width: 9 },
    { header: t("statusCol"), key: "status", width: 20 },
  ];
  for (const r of rounds) {
    for (const x of r.tables) {
      gm.addRow({
        round: r.number, table: x.number, a1: nameOf(x.a1), a2: nameOf(x.a2), b1: nameOf(x.b1), b2: nameOf(x.b2),
        sa: x.scoreA ?? "", sb: x.scoreB ?? "", status: t(`gs${x.status}` as never),
      });
    }
  }
  bold(gm);

  // 4) Each player's games, round by round
  const pg = wb.addWorksheet(t("byPlayerSheet"));
  pg.columns = [
    { header: t("players"), key: "name", width: 26 }, { header: t("round"), key: "round", width: 8 },
    { header: t("table"), key: "table", width: 7 }, { header: t("partner"), key: "partner", width: 24 },
    { header: t("opponents"), key: "opp", width: 40 }, { header: t("pf"), key: "for", width: 9 },
    { header: t("against"), key: "against", width: 9 }, { header: "W/L/T", key: "res", width: 7 },
    { header: t("diff"), key: "diff", width: 7 }, { header: t("statusCol"), key: "status", width: 20 },
  ];
  const order = standings.map((s) => s.entryId);
  const rows: Array<Record<string, string | number>> = [];
  for (const r of rounds) {
    for (const x of r.tables) {
      const seats = seatsOf(x);
      seats.forEach((id, i) => {
        const sideA = i < 2;
        const partner = sideA ? seats[i === 0 ? 1 : 0] : seats[i === 2 ? 3 : 2];
        const opp = sideA ? [seats[2], seats[3]] : [seats[0], seats[1]];
        const mine = sideA ? x.scoreA : x.scoreB;
        const theirs = sideA ? x.scoreB : x.scoreA;
        const done = isFinal(x);
        rows.push({
          _order: order.indexOf(id), name: nameOf(id), round: r.number, table: x.number, partner: nameOf(partner),
          opp: opp.map(nameOf).join(" & "), for: mine ?? "", against: theirs ?? "",
          res: done ? (mine! > theirs! ? "W" : mine! < theirs! ? "L" : "T") : "",
          diff: done ? mine! - theirs! : "", status: t(`gs${x.status}` as never),
        });
      });
    }
  }
  rows.sort((a, b) => (a._order as number) - (b._order as number) || (a.round as number) - (b.round as number));
  for (const { _order, ...r } of rows) { void _order; pg.addRow(r); }
  bold(pg);

  // 5) Players
  const pl = wb.addWorksheet(t("players"));
  pl.columns = [
    { header: t("firstName"), key: "first", width: 16 }, { header: t("lastName"), key: "last", width: 20 },
    { header: t("phone"), key: "phone", width: 20 }, { header: t("team"), key: "team", width: 10 },
  ];
  for (const e of ents) pl.addRow({ first: e.firstName, last: e.lastName, phone: formatPhone(e.phone) || t("noPhone"), team: e.teamName ?? "" });
  bold(pl);

  const buf = await wb.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buf as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${tour.slug}-${date}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
