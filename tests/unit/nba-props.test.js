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
