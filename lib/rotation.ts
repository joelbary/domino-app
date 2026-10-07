// Rotation engine: seats players at tables of 4 (pair A = seats 0+1, pair B = seats 2+3).
// Pure functions — no database access — so they can be tested on their own.

export type Table = [number, number, number, number]; // entry ids: a1, a2, b1, b2
export type Round = Table[];

const key = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

// Counts how many times each pair of players has shared a table (as partners or opponents).
export function meetings(history: Table[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of history) {
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
      const k = key(t[i], t[j]);
      m.set(k, (m.get(k) ?? 0) + 1);
    }
  }
  return m;
}

function shuffle<T>(arr: T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Small seeded random generator so results can be reproduced in tests.
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const FORBIDDEN_COST = 1_000_000;

type Ctx = { met: Map<string, number>; forbid: Set<string> };

function pairCost(ctx: Ctx, a: number, b: number): number {
  const k = key(a, b);
  if (ctx.forbid.has(k)) return FORBIDDEN_COST;
  const n = ctx.met.get(k) ?? 0;
  return n === 0 ? 0 : n * n; // meeting someone a 3rd time is worse than a 2nd
}

function tableCost(ctx: Ctx, t: number[]): number {
  let c = 0;
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) c += pairCost(ctx, t[i], t[j]);
  return c;
}

// Cost of player p sitting with the other members of table t (excluding seat `skip`).
function costWith(ctx: Ctx, p: number, t: number[], skip: number): number {
  let c = 0;
  for (let i = 0; i < 4; i++) if (i !== skip) c += pairCost(ctx, p, t[i]);
  return c;
}

// One round by local search: start from a random split, then swap players between tables
// while it lowers (or keeps) the number of repeat meetings.
function optimizeRound(players: number[], ctx: Ctx, rnd: () => number, iterations: number): { tables: number[][]; cost: number } {
  const order = shuffle(players, rnd);
  const tables: number[][] = [];
  for (let i = 0; i < order.length; i += 4) tables.push(order.slice(i, i + 4));
  const costs = tables.map((t) => tableCost(ctx, t));
  let total = costs.reduce((a, b) => a + b, 0);
  const T = tables.length;
  if (T < 2) return { tables, cost: total };

  for (let it = 0; it < iterations && total > 0; it++) {
    // Prefer moving someone from a table that has a problem.
    let ta = Math.floor(rnd() * T);
    if (costs[ta] === 0) {
      for (let tries = 0; tries < 4 && costs[ta] === 0; tries++) ta = Math.floor(rnd() * T);
    }
    let tb = Math.floor(rnd() * (T - 1));
    if (tb >= ta) tb++;
    const sa = Math.floor(rnd() * 4);
    const sb = Math.floor(rnd() * 4);
    const pa = tables[ta][sa];
    const pb = tables[tb][sb];
    const before = costWith(ctx, pa, tables[ta], sa) + costWith(ctx, pb, tables[tb], sb);
    const after = costWith(ctx, pb, tables[ta], sa) + costWith(ctx, pa, tables[tb], sb);
    const delta = after - before;
    if (delta <= 0 || rnd() < 0.002) {
      tables[ta][sa] = pb;
      tables[tb][sb] = pa;
      costs[ta] = tableCost(ctx, tables[ta]);
      costs[tb] = tableCost(ctx, tables[tb]);
      total += delta;
    }
  }
  return { tables, cost: total };
}

export type ScheduleResult = { rounds: Round[]; repeats: number; forbiddenViolations: number };

// Builds `count` random rounds that avoid anyone meeting twice (counting `history`, the rounds
// already fixed) and never seat a forbidden pair together. When a perfect schedule is impossible,
// it returns the best one found within the time budget.
export function randomSchedule(opts: {
  players: number[]; count: number; history?: Table[]; forbidden?: Array<[number, number]>;
  timeMs?: number; seed?: number;
}): ScheduleResult {
  const { players, count } = opts;
  if (players.length % 4 !== 0) throw new Error("Player count must be a multiple of 4");
  const rnd = opts.seed !== undefined ? seeded(opts.seed) : Math.random;
  const forbid = new Set((opts.forbidden ?? []).map(([a, b]) => key(a, b)));
  const start = Date.now();
  const budget = opts.timeMs ?? 3000;
  const deadline = start + budget * 0.25; // round-by-round attempts, then whole-schedule search
  const iterations = Math.max(4000, players.length * 600);

  let best: { rounds: number[][][]; score: number } | null = null;
  let attempt = 0;
  do {
    attempt++;
    const met = meetings(opts.history ?? []);
    const ctx: Ctx = { met, forbid };
    const rounds: number[][][] = [];
    let score = 0;
    for (let r = 0; r < count; r++) {
      let bestRound = optimizeRound(players, ctx, rnd, iterations);
      for (let k = 0; k < 3 && bestRound.cost > 0; k++) {
        const again = optimizeRound(players, ctx, rnd, iterations);
        if (again.cost < bestRound.cost) bestRound = again;
      }
      rounds.push(bestRound.tables);
      score += bestRound.cost;
      for (const t of bestRound.tables) {
        for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
          const k = key(t[i], t[j]);
          met.set(k, (met.get(k) ?? 0) + 1);
        }
      }
      if (best && score >= best.score) break; // already worse than the best schedule found
    }
    if (rounds.length === count && (!best || score < best.score)) best = { rounds, score };
  } while (best!.score > 0 && Date.now() < deadline && attempt < 500);

  if (best!.score > 0) improveSchedule(best!.rounds, opts.history ?? [], forbid, rnd, start + budget);
  const final = best!.rounds.map((round) => round.map((t) => shuffle(t, rnd) as Table));
  return { rounds: final, ...countProblems([...(opts.history ?? []), ...final.flat()], forbid) };
}

// Whole-schedule search (tabu search, as used for the "social golfer" problem): repeatedly take a
// player who meets someone again, try every swap with a player at another table of that round,
// and make the best one — remembering recent swaps so the search doesn't go in circles.
function improveSchedule(rounds: number[][][], history: Table[], forbid: Set<string>, rnd: () => number, deadline: number) {
  const met = meetings(history);
  for (const round of rounds) for (const t of round) {
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
      const k = key(t[i], t[j]);
      met.set(k, (met.get(k) ?? 0) + 1);
    }
  }
  const cnt = (a: number, b: number) => met.get(key(a, b)) ?? 0;
  const add = (a: number, b: number, d: number) => {
    const k = key(a, b);
    met.set(k, (met.get(k) ?? 0) + d);
  };
  const isForbid = (a: number, b: number) => forbid.has(key(a, b));
  // Cost change when p leaves table X (seat sx) and joins table Y (seat sy, replacing q) — and q the reverse.
  const swapDelta = (X: number[], sx: number, Y: number[], sy: number) => {
    const p = X[sx];
    const q = Y[sy];
    let d = 0;
    for (let i = 0; i < 4; i++) {
      if (i !== sx) {
        const o = X[i];
        d -= isForbid(p, o) ? FORBIDDEN_COST : cnt(p, o) - 1; // p leaves o
        d += isForbid(q, o) ? FORBIDDEN_COST : cnt(q, o); // q joins o
      }
      if (i !== sy) {
        const o = Y[i];
        d -= isForbid(q, o) ? FORBIDDEN_COST : cnt(q, o) - 1;
        d += isForbid(p, o) ? FORBIDDEN_COST : cnt(p, o);
      }
    }
    return d;
  };
  const conflicted = (t: number[], s: number) => {
    for (let i = 0; i < 4; i++) if (i !== s && (cnt(t[s], t[i]) > 1 || isForbid(t[s], t[i]))) return true;
    return false;
  };
  let total = 0;
  for (const [k, c] of met) total += forbid.has(k) ? c * FORBIDDEN_COST : (c * (c - 1)) / 2;

  const R = rounds.length;
  if (rounds.every((rd) => rd.length < 2)) return; // one table: nothing to swap
  let bestTotal = total;
  let bestCopy = rounds.map((rd) => rd.map((t) => t.slice()));
  const tabu = new Map<string, number>();
  let step = 0;
  let sinceBest = 0;

  while (total > 0) {
    step++;
    if ((step & 63) === 0 && Date.now() > deadline) break;

    // Find a conflicted player: random round, random table, random seat — retry until found.
    let r = -1, ta = -1, sa = -1;
    for (let tries = 0; tries < 400; tries++) {
      const rr = Math.floor(rnd() * R);
      const tt = Math.floor(rnd() * rounds[rr].length);
      const ss = Math.floor(rnd() * 4);
      if (conflicted(rounds[rr][tt], ss)) { r = rr; ta = tt; sa = ss; break; }
    }
    if (r < 0) break;
    const round = rounds[r];
    const A = round[ta];
    const p = A[sa];

    let bestD = Infinity, bestMoves: [number, number][] = [];
    for (let tb = 0; tb < round.length; tb++) {
      if (tb === ta) continue;
      const B = round[tb];
      for (let sb = 0; sb < 4; sb++) {
        const d = swapDelta(A, sa, B, sb);
        const tk = `${r}:${Math.min(p, B[sb])}:${Math.max(p, B[sb])}`;
        const isTabu = (tabu.get(tk) ?? 0) > step;
        if (isTabu && total + d >= bestTotal) continue; // aspiration: allow tabu if it beats the best
        if (d < bestD) { bestD = d; bestMoves = [[tb, sb]]; }
        else if (d === bestD) bestMoves.push([tb, sb]);
      }
    }
    if (!bestMoves.length) continue;
    const [tb, sb] = bestMoves[Math.floor(rnd() * bestMoves.length)];
    const B = round[tb];
    const q = B[sb];
    for (let i = 0; i < 4; i++) if (i !== sa) add(p, A[i], -1);
    for (let i = 0; i < 4; i++) if (i !== sb) add(q, B[i], -1);
    A[sa] = q;
    B[sb] = p;
    for (let i = 0; i < 4; i++) if (i !== sa) add(q, A[i], 1);
    for (let i = 0; i < 4; i++) if (i !== sb) add(p, B[i], 1);
    total += bestD;
    tabu.set(`${r}:${Math.min(p, q)}:${Math.max(p, q)}`, step + 5 + Math.floor(rnd() * 10));

    if (total < bestTotal) {
      bestTotal = total;
      bestCopy = rounds.map((rd) => rd.map((t) => t.slice()));
      sinceBest = 0;
    } else if (++sinceBest > 4000) {
      // Stuck: shake things up with a few random swaps from the best arrangement.
      sinceBest = 0;
      for (let rr = 0; rr < R; rr++) for (let t = 0; t < rounds[rr].length; t++) rounds[rr][t] = bestCopy[rr][t].slice();
      for (let k = 0; k < 3; k++) {
        const rr = Math.floor(rnd() * R);
        const T = rounds[rr].length;
        if (T < 2) continue;
        const x = Math.floor(rnd() * T);
        let y = Math.floor(rnd() * (T - 1));
        if (y >= x) y++;
        const sx = Math.floor(rnd() * 4), sy = Math.floor(rnd() * 4);
        [rounds[rr][x][sx], rounds[rr][y][sy]] = [rounds[rr][y][sy], rounds[rr][x][sx]];
      }
      met.clear();
      for (const [k, v] of meetings(history)) met.set(k, v);
      for (const rd of rounds) for (const t of rd) for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) add(t[i], t[j], 1);
      total = 0;
      for (const [k, c] of met) total += forbid.has(k) ? c * FORBIDDEN_COST : (c * (c - 1)) / 2;
      tabu.clear();
    }
  }
  for (let r = 0; r < R; r++) for (let t = 0; t < rounds[r].length; t++) rounds[r][t] = bestCopy[r][t];
}

function countProblems(all: Table[], forbid: Set<string>) {
  const m = meetings(all);
  let repeats = 0;
  let forbiddenViolations = 0;
  for (const [k, n] of m) {
    if (n > 1) repeats += n - 1;
    if (forbid.has(k)) forbiddenViolations += n;
  }
  return { repeats, forbiddenViolations };
}

export function scheduleProblems(all: Table[], forbidden: Array<[number, number]> = []) {
  return countProblems(all, new Set(forbidden.map(([a, b]) => key(a, b))));
}

// Size of the top ("winners") pool: half the players, rounded UP to a multiple of 4.
// How many times each pair were partners / opponents in the given tables.
export function pairHistory(tables: Table[]) {
  const partners = new Map<string, number>();
  const opponents = new Map<string, number>();
  const add = (m: Map<string, number>, x: number, y: number) => m.set(key(x, y), (m.get(key(x, y)) ?? 0) + 1);
  for (const t of tables) {
    add(partners, t[0], t[1]);
    add(partners, t[2], t[3]);
    for (const x of [t[0], t[1]]) for (const y of [t[2], t[3]]) add(opponents, x, y);
  }
  return { partners, opponents };
}

// Splits four players into two teams: of the 3 possible splits, the one with the fewest repeated
// partners, then the fewest repeated opponents; a random pick among splits that are still equal.
export function bestSplit(four: number[], hist: ReturnType<typeof pairHistory>, rnd: () => number = Math.random): Table {
  const [a, b, c, d] = four;
  const options: Table[] = [[a, b, c, d], [a, c, b, d], [a, d, b, c]];
  const n = (m: Map<string, number>, x: number, y: number) => m.get(key(x, y)) ?? 0;
  const score = (t: Table) => {
    const p = n(hist.partners, t[0], t[1]) + n(hist.partners, t[2], t[3]);
    let o = 0;
    for (const x of [t[0], t[1]]) for (const y of [t[2], t[3]]) o += n(hist.opponents, x, y);
    return p * 1000 + o;
  };
  const scored = options.map((t) => ({ t, s: score(t) }));
  const min = Math.min(...scored.map((x) => x.s));
  const best = scored.filter((x) => x.s === min);
  return best[Math.floor(rnd() * best.length)].t;
}

// Re-splits the teams at every table of a set of rounds, using everything played before
// (and the earlier rounds of the set) as history. Who sits at each table doesn't change.
export function splitTeams(rounds: Table[][], history: Table[], rnd: () => number = Math.random): Table[][] {
  const seen = history.slice();
  return rounds.map((round) => {
    const hist = pairHistory(seen);
    const out = round.map((t) => bestSplit(t, hist, rnd));
    seen.push(...out);
    return out;
  });
}

// A Swiss round: the ranking (best first) is cut into tables of four in order — 1–4, 5–8, …
// Nobody is moved to another table; history only decides the partners inside each table.
export function swissRound(ranked: number[], history: Table[], rnd: () => number = Math.random): Table[] {
  const hist = pairHistory(history);
  const tables: Table[] = [];
  for (let i = 0; i + 4 <= ranked.length; i += 4) tables.push(bestSplit(ranked.slice(i, i + 4), hist, rnd));
  return tables;
}

// Swaps two players inside one round's tables.
export function swapSeats(round: Table[], a: number, b: number): Table[] {
  return round.map((t) => t.map((id) => (id === a ? b : id === b ? a : id)) as Table);
}
