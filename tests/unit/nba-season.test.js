import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('$lib/server/entitlements.js', () => ({ adminDatabase: vi.fn() }));
vi.mock('$lib/server/identity.js', () => ({ requireIdentity: vi.fn() }));
import { adminDatabase } from '$lib/server/entitlements.js';
import { requireIdentity } from '$lib/server/identity.js';
import { TEAMS, seasonFor, previousSeason, playerRow, teamRows, standings, qualifies, sortBy, withRanks } from '../../src/lib/nba/season.js';
import { loadSeason, clearSeasonCache, allowedSeasons } from '../../src/lib/server/nba-season.js';
import { GET } from '../../src/routes/api/nba/stats/+server.js';

const game = (team, opponent, pts, opp_pts, game_date, is_home = true, extra = {}) => ({ team, opponent, pts, opp_pts, game_date, is_home, game_id: `${game_date}-${team}`, fgm: 40, fga: 85, fg3m: 12, fg3a: 34, ftm: 18, fta: 22, oreb: 10, dreb: 33, reb: 43, ast: 25, tov: 13, stl: 8, blk: 5, pf: 19, ...extra });

describe('season helpers', () => {
  it('maps all 30 teams to a conference and division', () => {
    expect(Object.keys(TEAMS)).toHaveLength(30);
    expect(Object.values(TEAMS).filter(t => t[0] === 'E')).toHaveLength(15);
    expect(TEAMS.MEM).toEqual(['W', 'Suroeste', 'Memphis Grizzlies']);
  });
  it('labels seasons from October', () => {
    expect(seasonFor(Date.parse('2026-11-02T12:00:00Z'))).toBe('2026-27');
    expect(seasonFor(Date.parse('2027-04-10T12:00:00Z'))).toBe('2026-27');
    expect(seasonFor(Date.parse('2027-10-01T12:00:00Z'))).toBe('2027-28');
    expect(previousSeason('2026-27')).toBe('2025-26');
    expect(previousSeason('2000-01')).toBe('1999-00');
  });
});

describe('player leaders', () => {
  // Sabonis, 6 games as on stats.nba.com (FG 69.1 %, 15.8 REB)
  const sabonis = { player_id: 1, player_name: 'Domantas Sabonis', team: 'SAC', gp: 6, w: 0, l: 6, min: 223.2, pts: 96, fgm: 38, fga: 55, fg3m: 1, fg3a: 2, ftm: 19, fta: 23, oreb: 26, dreb: 69, reb: 95, ast: 44, tov: 22, stl: 6, blk: 1, pf: 22, plus_minus: -61 };
  it('derives per-game values and percentages from season totals', () => {
    const r = playerRow(sabonis);
    expect(r.reb).toBeCloseTo(15.83, 2);
    expect(r.fgPct).toBeCloseTo(69.09, 2);
    expect(r.fg3Pct).toBe(50);
    expect(r.pm).toBeCloseTo(-10.17, 2);
    expect(playerRow({ ...sabonis, fta: 0, ftm: 0 }).ftPct).toBeNull();
  });
  it('requires volume to rank by a percentage', () => {
    const one = playerRow({ ...sabonis, gp: 1, fga: 1, fgm: 1 });
    expect(qualifies(one, 'fgPct', 6)).toBe(false);
    expect(qualifies(playerRow(sabonis), 'fgPct', 6)).toBe(true);
    expect(qualifies(one, 'pts', 6)).toBe(true);
  });
  it('sorts with empty values last and shares ranks at the shown precision', () => {
    const rows = [{ name: 'A', reb: 12.33 }, { name: 'B', reb: null }, { name: 'C', reb: 15.8 }, { name: 'D', reb: 12.3333 }, { name: 'E', reb: 10.7 }];
    const sorted = sortBy(rows, 'reb');
    expect(sorted.map(r => r.name)).toEqual(['C', 'D', 'A', 'E', 'B']);
    expect(withRanks(sorted, 'reb').map(r => r.rank)).toEqual([1, 2, 2, 4, 5]);
    expect(sortBy(rows, 'reb', 'asc')[0].name).toBe('E');
  });
});

describe('teams and standings', () => {
  const games = [
    game('MEM', 'HOU', 121, 110, '2026-10-30'), game('HOU', 'MEM', 110, 121, '2026-10-30', false),
    game('MEM', 'BOS', 118, 100, '2026-10-28', false), game('BOS', 'MEM', 100, 118, '2026-10-28'),
    game('HOU', 'LAL', 125, 120, '2026-10-26'), game('LAL', 'HOU', 120, 125, '2026-10-26', false),
    game('BOS', 'PHI', 115, 101, '2026-10-25'), game('PHI', 'BOS', 101, 115, '2026-10-25', false)
  ];
  it('computes team per-game stats and win %', () => {
    const mem = teamRows(games).find(t => t.team === 'MEM');
    expect(mem).toMatchObject({ gp: 2, w: 2, l: 0, winPct: 1, pts: 119.5, oppPts: 105, diff: 14.5, name: 'Memphis Grizzlies' });
    expect(mem.fgPct).toBeCloseTo(47.06, 2);
  });
  it('builds conference standings with games behind, splits, last 10 and streak', () => {
    const s = standings(games);
    expect(s.W.map(r => r.team)).toEqual(['MEM', 'HOU', 'LAL']);
    expect(s.W[0]).toMatchObject({ rank: 1, gb: 0, w: 2, l: 0, home: '1-0', away: '1-0', streak: 'G2', confRecord: '1-0', last10: '2-0' });
    expect(s.W[1]).toMatchObject({ w: 1, l: 1, gb: 1, streak: 'P1' });
    expect(s.E.map(r => r.team)).toEqual(['BOS', 'PHI']);
    expect(s.E[0]).toMatchObject({ w: 1, l: 1, confRecord: '1-0' });
  });
});

describe('/api/nba/stats', () => {
  const rpc = vi.fn(async name => ({ data: name === 'nba_player_season' ? [{ player_id: 1, player_name: 'X', team: 'MEM', gp: 1, pts: 30 }] : [game('MEM', 'HOU', 121, 110, '2026-10-30'), game('HOU', 'MEM', 110, 121, '2026-10-30', false)], error: null }));
  beforeEach(() => { vi.clearAllMocks(); clearSeasonCache(); adminDatabase.mockReturnValue({ rpc }); requireIdentity.mockResolvedValue({ uid: 'u' }); });
  it('requires a session and only serves the current or previous season', async () => {
    requireIdentity.mockRejectedValueOnce(Object.assign(new Error('unauthorized'), { status: 401 }));
    await expect(GET({ url: new URL('http://x/api/nba/stats'), request: new Request('http://x') })).rejects.toThrow('unauthorized');
    const bad = await GET({ url: new URL('http://x/api/nba/stats?season=1999-00'), request: new Request('http://x') });
    expect(bad.status).toBe(400);
  });
  it('returns players, teams, standings and the last game date, cached', async () => {
    const res = await GET({ url: new URL('http://x/api/nba/stats'), request: new Request('http://x') });
    const body = await res.json();
    expect(body.through).toBe('2026-10-30');
    expect(body.players[0]).toMatchObject({ name: 'X', pts: 30 });
    expect(body.standings.W[0].team).toBe('MEM');
    expect(body.seasons).toEqual(allowedSeasons());
    await GET({ url: new URL('http://x/api/nba/stats'), request: new Request('http://x') });
    expect(rpc).toHaveBeenCalledTimes(2); // second call served from cache
  });
  it('reports unavailability instead of inventing numbers', async () => {
    adminDatabase.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'x' } }) });
    const res = await GET({ url: new URL('http://x/api/nba/stats'), request: new Request('http://x') });
    expect(res.status).toBe(503);
  });
});
