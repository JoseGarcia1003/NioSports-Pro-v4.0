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
