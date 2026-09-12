import { describe, expect, it } from 'vitest';
import { settleNbaTotal } from '../../src/lib/engine/settlement.js';

const mapping = { id: 'nba-a', external_id: '123' };
const result = { id: 123, status: 'Final', home_team_score: 110, visitor_team_score: 100 };
const pick = { game_id: 'nba-a', period: 'FULL', bet_type: 'OVER', line: 205, source: 'manual' };

describe('NBA result isolation', () => {
  it('does not mix two simultaneous games', () => {
    expect(settleNbaTotal(pick, mapping, result)).toEqual({ outcome: 'win', actualTotal: 210 });
    expect(settleNbaTotal(pick, mapping, { ...result, id: 456 })).toBeNull();
    expect(settleNbaTotal({ ...pick, game_id: 'nba-b' }, mapping, result)).toBeNull();
  });
  it.each(['Q1', 'HALF', undefined])('does not use FULL scores for %s', period => {
    expect(settleNbaTotal({ ...pick, period }, mapping, result)).toBeNull();
  });
  it.each([['OVER', 205, 'win'], ['UNDER', 205, 'loss'], ['OVER', 210, 'push'],
    ['UNDER', 210, 'push'], ['UNDER', 215, 'win'], ['OVER', 215, 'loss']])(
    '%s at %s resolves %s', (bet_type, line, outcome) => {
      expect(settleNbaTotal({ ...pick, bet_type, line }, mapping, result)?.outcome).toBe(outcome);
    });
  it.each([null, undefined, NaN, Infinity, '100', -1])('rejects invalid scores %s', score => {
    expect(settleNbaTotal(pick, mapping, { ...result, home_team_score: score })).toBeNull();
  });
  it.each([null, undefined, NaN, Infinity, '205', 0, -1])('rejects invalid lines %s', line => {
    expect(settleNbaTotal({ ...pick, line }, mapping, result)).toBeNull();
  });
  it.each(['demo', 'backtest', 'synthetic'])('excludes %s', source => {
    expect(settleNbaTotal({ ...pick, source }, mapping, result)).toBeNull();
  });
  it('rejects combos, ambiguous direction, missing mapping and unfinished games', () => {
    expect(settleNbaTotal({ ...pick, is_combo: true }, mapping, result)).toBeNull();
    expect(settleNbaTotal({ ...pick, direction: 'UNDER' }, mapping, result)).toBeNull();
    expect(settleNbaTotal(pick, { id: 'nba-a' }, result)).toBeNull();
    expect(settleNbaTotal(pick, mapping, { ...result, status: 'Live' })).toBeNull();
  });
});
