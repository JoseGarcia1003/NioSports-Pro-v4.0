import { describe, it, expect } from 'vitest';
import { toTeamGame, rateVs, mean, teamReferenceLine, marketTotalFor, nickname } from '../../src/lib/nba/team-props.js';

describe('team props', () => {
  it('maps a team game and its combined total', () => {
    expect(toTeamGame(['2026-10-30', 'CHI', true, 125, 111, '2026-27'])).toEqual({ date: '2026-10-30', opponent: 'CHI', home: true, pf: 125, pa: 111, season: '2026-27', total: 236 });
  });
  it('counts over, under and pushes against a line', () => {
    expect(rateVs([120, 110, 115, 118], 115)).toEqual({ n: 4, over: 2, under: 1, push: 1, rate: 2 / 3 });
    expect(rateVs([120, 110, 115], 115.5, 2)).toMatchObject({ n: 2, over: 1, under: 1 });
    expect(rateVs([], 100).rate).toBeNull();
  });
  it('places the reference line on the half point from the last 10', () => {
    expect(teamReferenceLine([110, 120, 115, 118, 112])).toBe(115.5);
    expect(teamReferenceLine([110, 121])).toBe(115.5);
    expect(teamReferenceLine([])).toBeNull();
    expect(mean([1, 2, 3, 100], 3)).toBe(2);
  });
  it('pairs a board game with the market total by nickname and start time', () => {
    const totals = { events: [{ home: 'Orlando Magic', away: 'Boston Celtics', commenceTime: '2026-11-02T23:00:00Z', consensus: 211.5, books: [{}, {}] }] };
    const game = { homeName: 'Orlando Magic', visitorName: 'Boston Celtics', datetime: '2026-11-02T23:30:00Z' };
    expect(marketTotalFor(game, totals)).toEqual({ point: 211.5, books: 2 });
    expect(marketTotalFor({ ...game, datetime: '2026-11-04T23:30:00Z' }, totals)).toBeNull();
    expect(marketTotalFor({ homeName: 'LA Clippers', visitorName: 'Golden State Warriors', datetime: '2026-11-02T23:00:00Z' }, { events: [{ home: 'Los Angeles Clippers', away: 'Golden State Warriors', commenceTime: '2026-11-02T23:00:00Z', consensus: 220.5, books: [] }] })).toMatchObject({ point: 220.5 });
    expect(nickname('Portland Trail Blazers')).toBe('blazers');
  });
});
