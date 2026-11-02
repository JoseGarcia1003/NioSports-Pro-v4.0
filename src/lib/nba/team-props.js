// Team props from stored box scores: points scored by a team and the combined
// game total, measured against a line. Pure functions; no estimates.
const r5 = x => Math.round(x * 2) / 2;

/** [date, opp, home, pointsFor, pointsAgainst, season] → object. */
export function toTeamGame(t) {
  return { date: t[0], opponent: t[1], home: t[2], pf: Number(t[3]), pa: Number(t[4]), season: t[5], total: Number(t[3]) + Number(t[4]) };
}

/** Over/under/push of `values` against a line for the first n (null = all). */
export function rateVs(values, line, n = null) {
  const sample = (n == null ? values : values.slice(0, n)).filter(Number.isFinite);
  let over = 0, under = 0, push = 0;
  for (const v of sample) { if (v > line) over++; else if (v < line) under++; else push++; }
  const decided = over + under;
  return { n: sample.length, over, under, push, rate: decided ? over / decided : null };
}

export function mean(values, n = null) {
  const v = (n == null ? values : values.slice(0, n)).filter(Number.isFinite);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}

/** Reference line: median of the last 10 values, set on the half point (never a market line). */
export function teamReferenceLine(values) {
  const v = values.slice(0, 10).filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  const median = v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
  const half = r5(median);
  return Number.isInteger(half) ? half + 0.5 : half;
}

/** Last word of a full team name ("Boston Celtics" → "celtics") to pair providers. */
export const nickname = full => String(full || '').trim().split(/\s+/).pop().toLowerCase();

/** Market game total for a board game ({homeName, visitorName, datetime}) from cached totals. */
export function marketTotalFor(game, totals) {
  if (!Array.isArray(totals?.events)) return null;
  const start = Date.parse(game.datetime);
  const hit = totals.events.find(e => String(e.home).toLowerCase().endsWith(nickname(game.homeName)) && String(e.away).toLowerCase().endsWith(nickname(game.visitorName)) && Math.abs(Date.parse(e.commenceTime) - start) < 12 * 3600000);
  return hit && Number.isFinite(hit.consensus) ? { point: hit.consensus, books: hit.books?.length ?? 0 } : null;
}
