// Daily NBA signals: points props whose rule-based reading is clearly favourable
// against the sportsbook consensus line. Built once, sealed before tip-off,
// settled later from box scores. A signal is a summary of evidence, not a promise.
import { toGame, hitRate, sided } from './props.js';
import { analyseProp } from './analysis.js';
import { playerKey } from '$lib/product/teams.js';

export const SIGNAL_METHOD = 'reading-v1';
export const MAX_SIGNALS = 12;

/**
 * @param {{ players: any[], market: Record<string, any>, games: any[], defense?: any, now?: number }} input
 *   players: board rows (tuples in `games`); market: player-points consensus by playerKey.
 */
export function buildSignals({ players, market, games, defense = null, now = Date.now() }) {
  const start = new Map(games.map(g => [g.id, Date.parse(g.datetime)]));
  const out = [];
  for (const p of players) {
    const tip = start.get(p.gameId);
    if (!Number.isFinite(tip) || tip <= now) continue; // sealed only before tip-off
    const m = market?.[playerKey(p.name)];
    if (!m || !Number.isFinite(m.consensus)) continue;
    const history = p.games.map(toGame);
    for (const side of ['over', 'under']) {
      const r = analyseProp({ games: history, history, stat: 'pts', side, line: m.consensus, opponent: p.opp, home: p.home, defense });
      if (r.reading !== 'favorable') continue;
      const l10 = sided(hitRate(history, 'pts', m.consensus, 10), side);
      out.push({
        playerId: p.id, name: p.name, team: p.team, opponent: p.opp, home: p.home, gameId: p.gameId,
        tipoff: new Date(tip).toISOString(), stat: 'pts', side, line: m.consensus, books: m.books.length,
        favour: r.favour, against: r.against, l10: { hits: l10.hits, n: l10.over + l10.under },
        findings: r.findings.filter(f => f.weight !== 0).map(f => ({ weight: f.weight, title: f.title, text: f.text }))
      });
    }
  }
  return out
    .sort((a, b) => (b.favour - b.against) - (a.favour - a.against) || b.l10.hits / (b.l10.n || 1) - a.l10.hits / (a.l10.n || 1))
    .slice(0, MAX_SIGNALS);
}

/** Result of one signal from the player's box score on that day (null while pending). */
export function settle(entry, boxScore) {
  if (!boxScore || !Number.isFinite(boxScore.pts)) return { status: 'pending' };
  if (boxScore.minutes === 0) return { status: 'void', actual: boxScore.pts, reason: 'No jugó' };
  const v = boxScore.pts;
  if (v === entry.line) return { status: 'push', actual: v };
  const over = v > entry.line;
  return { status: (entry.side === 'over') === over ? 'hit' : 'miss', actual: v };
}

/** Totals over settled signals; never a rate without its sample. */
export function summarize(results) {
  const count = s => results.filter(r => r.status === s).length;
  const hits = count('hit'), misses = count('miss');
  const decided = hits + misses;
  return { hits, misses, pushes: count('push'), voids: count('void'), pending: count('pending'), decided, rate: decided ? hits / decided : null };
}
