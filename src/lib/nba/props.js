// Pure prop analytics over a player's newest-first game list.
// Game tuple from the API: [date, opponent, isHome, minutes, pts, reb, ast, fg3m, season, team]

export const STATS = {
  pts: { label: 'Puntos', short: 'PTS', value: g => g[4] },
  reb: { label: 'Rebotes', short: 'REB', value: g => g[5] },
  ast: { label: 'Asistencias', short: 'AST', value: g => g[6] },
  fg3m: { label: 'Triples', short: '3PM', value: g => g[7] },
  pra: { label: 'Pts + Reb + Ast', short: 'PRA', value: g => g[4] + g[5] + g[6] },
  pr: { label: 'Pts + Reb', short: 'P+R', value: g => g[4] + g[5] },
  pa: { label: 'Pts + Ast', short: 'P+A', value: g => g[4] + g[6] },
  ra: { label: 'Reb + Ast', short: 'R+A', value: g => g[5] + g[6] }
};

export function toGame(t) {
  return { date: t[0], opponent: t[1], home: t[2], minutes: Number(t[3]), season: t[8], team: t[9], raw: [t[0], t[1], t[2], Number(t[3]), Number(t[4]), Number(t[5]), Number(t[6]), Number(t[7])] };
}

export function statValue(game, stat) {
  return STATS[stat].value(game.raw);
}

/** Over/under/push counts against a line for the first n games (n = null → all). */
export function hitRate(games, stat, line, n = null) {
  const sample = n == null ? games : games.slice(0, n);
  let over = 0, under = 0, push = 0;
  for (const g of sample) {
    const v = statValue(g, stat);
    if (v > line) over++; else if (v < line) under++; else push++;
  }
  const decided = over + under;
  return { n: sample.length, over, under, push, rate: decided ? over / decided : null };
}

export function average(games, stat, n = null) {
  const sample = n == null ? games : games.slice(0, n);
  if (!sample.length) return null;
  return sample.reduce((s, g) => s + statValue(g, stat), 0) / sample.length;
}

export function median(values) {
  const v = [...values].sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/**
 * Reference line used until a sportsbook line exists: the L10 median moved to the
 * nearest x.5 below it, so a reference never coincides with a possible result.
 * It is labelled as a reference, never as the market line.
 */
export function referenceLine(games, stat) {
  const m = median(games.slice(0, 10).map(g => statValue(g, stat)));
  if (m == null) return null;
  return Math.max(0.5, Number.isInteger(m) ? m - 0.5 : Math.floor(m) + 0.5);
}

export function currentSeason(games) {
  return games[0]?.season ?? null;
}

export function seasonGames(games) {
  const s = currentSeason(games);
  return games.filter(g => g.season === s);
}

const DEFENSE_FIELDS = { pts: ['pts'], reb: ['reb'], ast: ['ast'], fg3m: ['fg3m'], pra: ['pts', 'reb', 'ast'], pr: ['pts', 'reb'], pa: ['pts', 'ast'], ra: ['reb', 'ast'] };

/**
 * What the opponent allows per game for a stat and its rank among teams
 * (1 = allows the most, i.e. the most favourable matchup for an over).
 * @param {Record<string, {games:number, pts:number, reb:number, ast:number, fg3m:number}>} defense
 */
export function defenseFor(defense, team, stat) {
  if (!defense?.[team]) return null;
  const value = t => DEFENSE_FIELDS[stat].reduce((s, f) => s + Number(defense[t][f]), 0);
  const ordered = Object.keys(defense).sort((a, b) => value(b) - value(a));
  return { value: value(team), rank: ordered.indexOf(team) + 1, of: ordered.length, games: defense[team].games };
}

/** Hit rate restricted to games matching a predicate (splits: home/away, opponent, minutes). */
export function splitRate(games, stat, line, predicate) {
  return hitRate(games.filter(predicate), stat, line);
}

/** Re-reads a hit-rate result for one side: 'over' (más de) or 'under' (menos de). */
export function sided(h, side) {
  const hits = side === 'under' ? h.under : h.over;
  const decided = h.over + h.under;
  return { ...h, hits, rate: decided ? hits / decided : null };
}

/** Sorts board rows by a rate key, best first; empty samples go last. */
export function sortRows(rows, key) {
  if (key === 'minutes') return rows;
  return [...rows].sort((a, b) => {
    const ra = a[key].rate, rb = b[key].rate;
    if (ra == null && rb == null) return 0;
    if (ra == null) return 1;
    if (rb == null) return -1;
    return rb - ra || b[key].n - a[key].n;
  });
}

/**
 * Compares sportsbook prices for one side of a player line (decimal odds).
 * bestPrice marks the highest price among books offering exactly `line`;
 * bestLine marks the most favourable point for the side (lowest for over,
 * highest for under). margin is the book's overround: 1/over + 1/under − 1.
 * @param {Array<{key:string,title:string,point:number,over:number,under:number}>} books
 * @param {'over'|'under'} side
 * @param {number} line
 */
export function compareBooks(books, side, line) {
  const valid = (books || []).filter(b => [b.point, b.over, b.under].every(Number.isFinite) && b.over > 1 && b.under > 1);
  if (!valid.length) return [];
  const price = b => (side === 'under' ? b.under : b.over);
  const atLine = valid.filter(b => b.point === line);
  const topPrice = atLine.length ? Math.max(...atLine.map(price)) : null;
  const points = valid.map(b => b.point);
  const topPoint = side === 'under' ? Math.max(...points) : Math.min(...points);
  const distinctPoints = new Set(points).size > 1;
  return valid
    .map(b => ({
      key: b.key, title: b.title, point: b.point, price: price(b),
      margin: 1 / b.over + 1 / b.under - 1,
      bestPrice: atLine.length > 1 && b.point === line && price(b) === topPrice,
      bestLine: distinctPoints && b.point === topPoint
    }))
    .sort((a, b) => (side === 'under' ? b.point - a.point : a.point - b.point) || b.price - a.price);
}
