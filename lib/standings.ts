// Standings: pure calculation from finished games (no database access).

export type GameResult = { round: number; a: [number, number]; b: [number, number]; scoreA: number; scoreB: number };

export type Standing = {
  entryId: number; rank: number; played: number; w: number; l: number; t: number;
  pts: number; pf: number; pa: number; diff: number;
};

// Order: 1) W/L/T points (3/1/0), 2) point difference, 3) points for, 4) fewest points against,
// 5) head-to-head among the tied players (games where they were opponents), 6) a fixed draw.
// Every player gets their own rank, so the Swiss seating always has an exact order.
export function computeStandings(entryIds: number[], games: GameResult[], draw?: (entryId: number) => number): Standing[] {
  const map = new Map<number, Standing>();
  for (const id of entryIds) map.set(id, { entryId: id, rank: 0, played: 0, w: 0, l: 0, t: 0, pts: 0, pf: 0, pa: 0, diff: 0 });
  const h2h = new Map<string, number>(); // "x>y" → how many times x beat y as opponents
  for (const g of games) {
    const sides: [number[], number, number][] = [[g.a, g.scoreA, g.scoreB], [g.b, g.scoreB, g.scoreA]];
    for (const [ids, mine, theirs] of sides) {
      for (const id of ids) {
        const s = map.get(id);
        if (!s) continue;
        s.played++;
        s.pf += mine;
        s.pa += theirs;
        if (mine > theirs) { s.w++; s.pts += 3; }
        else if (mine === theirs) { s.t++; s.pts += 1; }
        else s.l++;
      }
    }
    if (g.scoreA !== g.scoreB) {
      const [win, lose] = g.scoreA > g.scoreB ? [g.a, g.b] : [g.b, g.a];
      for (const x of win) for (const y of lose) h2h.set(`${x}>${y}`, (h2h.get(`${x}>${y}`) ?? 0) + 1);
    }
  }
  const list = [...map.values()];
  for (const s of list) s.diff = s.pf - s.pa;
  const cmp = (x: Standing, y: Standing) => y.pts - x.pts || y.diff - x.diff || y.pf - x.pf || x.pa - y.pa;
  const drawOf = (id: number) => (draw ? draw(id) : id);
  list.sort((x, y) => cmp(x, y) || drawOf(x.entryId) - drawOf(y.entryId));
  // Head-to-head inside each group that is tied on everything above.
  const out: Standing[] = [];
  for (let i = 0; i < list.length; ) {
    let j = i + 1;
    while (j < list.length && cmp(list[i], list[j]) === 0) j++;
    const group = list.slice(i, j);
    if (group.length > 1) {
      const net = new Map(group.map((s) => [s.entryId, 0]));
      for (const x of group) for (const y of group) {
        if (x === y) continue;
        net.set(x.entryId, net.get(x.entryId)! + (h2h.get(`${x.entryId}>${y.entryId}`) ?? 0) - (h2h.get(`${y.entryId}>${x.entryId}`) ?? 0));
      }
      group.sort((x, y) => net.get(y.entryId)! - net.get(x.entryId)! || drawOf(x.entryId) - drawOf(y.entryId));
    }
    out.push(...group);
    i = j;
  }
  out.forEach((s, i) => { s.rank = i + 1; });
  return out;
}

export type TeamStanding = { teamId: number; rank: number; size: number; avg: number };

// Teams: average of members' ranks (lower is better). Tie-break: drop each team's best and worst
// member and compare again; repeat while at least 2 remain; still tied → shared place.
export function teamStandings(members: Map<number, number[]>, rankOf: Map<number, number>): TeamStanding[] {
  const ranksOf = (teamId: number) => (members.get(teamId) ?? []).map((e) => rankOf.get(e)).filter((r): r is number => r !== undefined).sort((a, b) => a - b);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : Infinity);
  const compare = (t1: number, t2: number) => {
    let a = ranksOf(t1);
    let b = ranksOf(t2);
    while (true) {
      const d = avg(a) - avg(b);
      if (Math.abs(d) > 1e-9) return d;
      if (a.length - 2 < 2 || b.length - 2 < 2) return 0;
      a = a.slice(1, -1);
      b = b.slice(1, -1);
    }
  };
  const ids = [...members.keys()].filter((id) => ranksOf(id).length > 0);
  ids.sort(compare);
  const out: TeamStanding[] = [];
  ids.forEach((id, i) => {
    const rank = i > 0 && compare(ids[i - 1], id) === 0 ? out[i - 1].rank : i + 1;
    out.push({ teamId: id, rank, size: ranksOf(id).length, avg: avg(ranksOf(id)) });
  });
  return out;
}
