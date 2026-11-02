import { describe, it, expect } from 'vitest';
import { buildSignals, settle, summarize, MAX_SIGNALS } from '../../src/lib/nba/signals.js';

// tuple: [date, opp, home, min, pts, reb, ast, fg3m, season, team]
const t = (pts, extra = {}) => ['2026-10-30', extra.opp ?? 'CHI', extra.home ?? true, 34, pts, 5, 4, 2, extra.season ?? '2026-27', 'BOS'];
const hot = [t(31), t(29), t(33), t(30), t(28), t(32), t(27), t(30), t(29), t(31), t(22), t(21), t(20), t(23), t(22), t(21), t(20), t(22), t(23), t(21)];
const now = Date.parse('2026-11-02T18:00:00Z');
const games = [{ id: 1, datetime: '2026-11-02T23:30:00Z' }, { id: 2, datetime: '2026-11-02T17:00:00Z' }];
const defense = { ORL: { games: 10, pts: 125, reb: 45, ast: 28, fg3m: 14 }, CHI: { games: 10, pts: 105, reb: 40, ast: 22, fg3m: 11 }, MIA: { games: 10, pts: 110, reb: 42, ast: 24, fg3m: 12 } };
const player = (id, gameId, name = `P${id}`) => ({ id, name, team: 'BOS', opp: 'ORL', home: true, gameId, games: hot });
const market = { p1: { consensus: 25.5, books: [{}, {}] }, p2: { consensus: 25.5, books: [{}] }, 'luka doncic': { consensus: 25.5, books: [{}] } };

describe('daily signals', () => {
  it('keeps only clearly favourable readings against a market line, before tip-off', () => {
    const out = buildSignals({ players: [player(1, 1), player(2, 2)], market, games, defense, now });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ playerId: 1, side: 'over', line: 25.5, books: 2, stat: 'pts' });
    expect(out[0].favour).toBeGreaterThanOrEqual(3);
    expect(out[0].findings.every(f => f.weight !== 0)).toBe(true);
  });

  it('ignores players without a sportsbook line and matches accented names', () => {
    expect(buildSignals({ players: [player(9, 1, 'Nobody')], market, games, defense, now })).toEqual([]);
    expect(buildSignals({ players: [player(3, 1, 'Luka Dončić')], market, games, defense, now })).toHaveLength(1);
  });

  it('caps the edition size', () => {
    const many = Array.from({ length: 20 }, (_, i) => player(i + 1, 1, 'p1'));
    expect(buildSignals({ players: many, market, games, defense, now }).length).toBe(MAX_SIGNALS);
  });

  it('settles hits, misses, pushes and players who did not play', () => {
    const over = { side: 'over', line: 25.5 }, under = { side: 'under', line: 25.5 }, whole = { side: 'over', line: 25 };
    expect(settle(over, { pts: 30, minutes: 34 })).toEqual({ status: 'hit', actual: 30 });
    expect(settle(under, { pts: 30, minutes: 34 })).toEqual({ status: 'miss', actual: 30 });
    expect(settle(whole, { pts: 25, minutes: 34 })).toEqual({ status: 'push', actual: 25 });
    expect(settle(over, { pts: 0, minutes: 0 }).status).toBe('void');
    expect(settle(over, null)).toEqual({ status: 'pending' });
  });

  it('summarizes without inventing a rate on an empty sample', () => {
    expect(summarize([{ status: 'hit' }, { status: 'miss' }, { status: 'hit' }, { status: 'pending' }])).toMatchObject({ hits: 2, misses: 1, decided: 3, pending: 1 });
    expect(summarize([{ status: 'pending' }]).rate).toBeNull();
  });
});
