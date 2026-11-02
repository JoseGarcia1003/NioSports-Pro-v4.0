import { describe, it, expect } from 'vitest';
import { toGame, hitRate, average, referenceLine, statValue, seasonGames } from '../../src/lib/nba/props.js';

// [date, opp, home, min, pts, reb, ast, fg3m, season, team] newest first
const g = (pts, reb = 5, ast = 3, fg3m = 2, season = '2026-27') => toGame(['2026-10-30', 'HOU', true, '30.00', pts, reb, ast, fg3m, season, 'MIL']);

describe('prop analytics', () => {
  it('computes combined stats', () => {
    expect(statValue(g(20, 6, 4), 'pra')).toBe(30);
    expect(statValue(g(20, 6, 4), 'ra')).toBe(10);
  });

  it('counts overs, unders and pushes and excludes pushes from the rate', () => {
    const games = [g(25), g(20), g(18), g(20)];
    expect(hitRate(games, 'pts', 20)).toEqual({ n: 4, over: 1, under: 1, push: 2, rate: 0.5 });
    expect(hitRate(games, 'pts', 19.5, 2)).toEqual({ n: 2, over: 2, under: 0, push: 0, rate: 1 });
  });

  it('returns null rate for an empty sample instead of zero', () => {
    expect(hitRate([], 'pts', 10).rate).toBeNull();
    expect(average([], 'pts')).toBeNull();
  });

  it('places the reference line on a half point that no result can equal', () => {
    expect(referenceLine([g(20), g(22), g(24)], 'pts')).toBe(21.5);
    expect(referenceLine([g(20), g(23)], 'pts')).toBe(21.5);
    expect(referenceLine([g(0, 5, 3, 0), g(0, 5, 3, 0), g(0, 5, 3, 0)], 'fg3m')).toBe(0.5);
    expect(referenceLine([], 'pts')).toBeNull();
  });

  it('isolates the current season', () => {
    expect(seasonGames([g(10), g(12, 5, 3, 2, '2025-26')])).toHaveLength(1);
  });
});

import { defenseFor, splitRate } from '../../src/lib/nba/props.js';
describe('matchup context', () => {
  const defense = { ORL: { games: 6, pts: 110, reb: 44, ast: 25, fg3m: 12 }, CHI: { games: 6, pts: 129, reb: 48, ast: 29, fg3m: 15 }, BOS: { games: 5, pts: 105, reb: 40, ast: 22, fg3m: 14 } };
  it('ranks what the opponent allows, 1 = most allowed', () => {
    expect(defenseFor(defense, 'CHI', 'pts')).toEqual({ value: 129, rank: 1, of: 3, games: 6 });
    expect(defenseFor(defense, 'BOS', 'fg3m').rank).toBe(2);
    expect(defenseFor(defense, 'ORL', 'pra').value).toBe(179);
    expect(defenseFor(defense, 'XXX', 'pts')).toBeNull();
  });
  it('computes split hit rates', () => {
    const games = [toGame(['d', 'ORL', true, 30, 25, 5, 3, 2, 's', 'BOS']), toGame(['d', 'CHI', false, 30, 10, 5, 3, 2, 's', 'BOS'])];
    expect(splitRate(games, 'pts', 19.5, g => g.home).rate).toBe(1);
    expect(splitRate(games, 'pts', 19.5, g => g.opponent === 'CHI').rate).toBe(0);
  });
});

import { sided, sortRows } from '../../src/lib/nba/props.js';
describe('board ordering and sides', () => {
  it('reads the under side without counting pushes', () => {
    expect(sided({ n: 5, over: 1, under: 3, push: 1 }, 'under')).toMatchObject({ hits: 3, rate: 0.75 });
    expect(sided({ n: 0, over: 0, under: 0, push: 0 }, 'over').rate).toBeNull();
  });
  it('sorts by rate with empty samples last and larger samples first on ties', () => {
    const r = (id, rate, n) => ({ id, l10: { rate, n } });
    expect(sortRows([r('a', 0.5, 10), r('b', null, 0), r('c', 0.8, 10), r('d', 0.8, 5)], 'l10').map(x => x.id)).toEqual(['c', 'd', 'a', 'b']);
  });
});

import { teammateSplit } from '../../src/lib/nba/props.js';
describe('teammateSplit', () => {
  const t = (id, pts, team = 'BOS', season = '2026-27') => toGame(['2026-10-30', 'NYK', true, 34, pts, 5, 3, 2, season, team, id]);
  it('splits hit rates by whether the teammate played, within his team and season', () => {
    const games = [t('g1', 30), t('g2', 20), t('g3', 28), t('g4', 18), t('g0', 40, 'MIL'), t('g9', 40, 'BOS', '2025-26'), t(null, 40)];
    const split = teammateSplit(games, 'pts', 24.5, { team: 'BOS', season: '2026-27', gameIds: ['g2', 'g4'] });
    expect(split.without).toMatchObject({ over: 2, under: 0, n: 2 });
    expect(split.with).toMatchObject({ over: 0, under: 2, n: 2 });
  });
});
