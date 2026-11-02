import { describe, it, expect, vi } from 'vitest';
vi.mock('$env/dynamic/public', () => ({ env: { PUBLIC_FIREBASE_PROJECT_ID: 'niosports-test' } }));
import { selectPlayers, scheduleFor } from '../../src/lib/server/nba-props.js';

const game = (min, season = '2026-27') => ['2026-10-30', 'HOU', true, min, 20, 5, 3, 2, season, 'MIL'];
const games = [{ id: 7, home: 'MIL', visitor: 'CLE' }];

describe('props board selection', () => {
  it('keeps current-season rotation players and attaches the opponent', () => {
    const rows = [
      { player_id: 1, player_name: 'Starter', team: 'MIL', games: [game(34), game(32)] },
      { player_id: 2, player_name: 'Bench', team: 'MIL', games: [game(6), game(4)] },
      { player_id: 3, player_name: 'Retired', team: 'CLE', games: [game(30, '2025-26')] },
      { player_id: 4, player_name: 'Other', team: 'BOS', games: [game(30)] }
    ];
    const out = selectPlayers(rows, games);
    expect(out.map(p => p.name)).toEqual(['Starter']);
    expect(out[0]).toMatchObject({ opp: 'CLE', home: true, gameId: 7, minutesL5: 33 });
  });

  it('maps the provider schedule and fails loudly on errors', async () => {
    const ok = async () => new Response(JSON.stringify({ data: [{ id: 1, datetime: 'x', status_state: 'scheduled', home_team: { abbreviation: 'ORL', full_name: 'Orlando Magic' }, visitor_team: { abbreviation: 'BOS', full_name: 'Boston Celtics' } }] }));
    expect((await scheduleFor('2026-11-01', 'k', ok))[0]).toMatchObject({ home: 'ORL', visitor: 'BOS' });
    await expect(scheduleFor('2026-11-01', 'k', async () => new Response('{}', { status: 401 }))).rejects.toThrow('schedule 401');
  });
});

import { GET as propsGET } from '../../src/routes/api/nba/props/+server.js';
import { GET as playerGET } from '../../src/routes/api/nba/player/+server.js';
describe('props APIs require a session', () => {
  it('rejects anonymous requests before touching data', async () => {
    const anon = new Request('http://x/api/nba/props');
    await expect(propsGET({ url: new URL(anon.url), request: anon })).rejects.toMatchObject({ status: 401 });
    await expect(playerGET({ url: new URL('http://x/api/nba/player?id=7'), request: anon })).rejects.toMatchObject({ status: 401 });
  });
});

import { GET as signalsGET } from '../../src/routes/api/nba/signals/+server.js';
describe('signals API requires a session', () => {
  it('rejects anonymous requests', async () => {
    await expect(signalsGET({ request: new Request('http://x/api/nba/signals') })).rejects.toMatchObject({ status: 401 });
  });
});

import { rotationTeammates } from '../../src/lib/server/nba-props.js';
describe('rotationTeammates', () => {
  const scope = { team: 'BOS', season: '2026-27', gameIds: ['0022600001', '0022600002', '0022600003', '0022600004'] };
  const row = (id, name, game, minutes) => ({ player_id: id, player_name: name, game_id: game, minutes });
  it('averages minutes over games played, counts misses and drops fringe players', () => {
    const rows = [
      row(1, 'Jaylen', '0022600001', 35), row(1, 'Jaylen', '0022600002', 33), row(1, 'Jaylen', '0022600004', 34),
      row(2, 'Derrick', '0022600001', 30), row(2, 'Derrick', '0022600002', 30), row(2, 'Derrick', '0022600003', 30), row(2, 'Derrick', '0022600004', 30),
      row(3, 'Bench', '0022600001', 6),
      row(4, 'Other season', '0022500999', 40)
    ];
    const out = rotationTeammates(rows, scope);
    expect(out.map(m => m.name)).toEqual(['Jaylen', 'Derrick']);
    expect(out[0]).toMatchObject({ id: 1, minutes: 34, missed: 1, team: 'BOS', season: '2026-27' });
    expect(out[0].gameIds).toEqual(['0022600001', '0022600002', '0022600004']);
    expect(out[1].missed).toBe(0);
  });
  it('skips late arrivals who played too few of the games', () => {
    const rows = [row(5, 'New', '0022600004', 30)];
    expect(rotationTeammates(rows, scope)).toEqual([]);
  });
  it('returns nothing without games in scope', () => {
    expect(rotationTeammates([row(1, 'X', '0022600001', 30)], { ...scope, gameIds: [] })).toEqual([]);
  });
});

import { groupByPosition, loadBoard } from '../../src/lib/server/nba-props.js';
describe('defense by position on the board', () => {
  it('groups the RPC rows by team and primary position', () => {
    expect(groupByPosition([{ team: 'ORL', pos: 'G', games: 5, pts: '48.2', reb: '9', ast: '12.4', fg3m: '6' }, { team: 'ORL', pos: 'X', games: 5, pts: 1, reb: 1, ast: 1, fg3m: 1 }]))
      .toEqual({ ORL: { G: { games: 5, pts: 48.2, reb: 9, ast: 12.4, fg3m: 6 } } });
  });

  it('attaches official positions and position defense, and stays usable without them', async () => {
    const schedule = { data: [{ id: 9, datetime: '2026-11-02T23:00:00Z', status: 'scheduled', home_team: { abbreviation: 'ORL', full_name: 'Orlando Magic' }, visitor_team: { abbreviation: 'BOS', full_name: 'Boston Celtics' } }] };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(schedule))));
    const rows = [{ player_id: 7, player_name: 'Jayson Tatum', team: 'BOS', games: [game(36)] }];
    const db = positions => ({
      rpc: vi.fn(async name => ({ data: name === 'nba_recent_player_games' ? rows.map(r => ({ ...r, games: r.games.map(g => [...g.slice(0, 9), 'BOS']) })) : name === 'nba_team_allowed' ? [] : name === 'nba_team_recent_games' ? [{ team: 'BOS', games: [['2026-10-30', 'CHI', true, 125, 111, '2026-27']] }] : [{ team: 'ORL', pos: 'F', games: 5, pts: 40, reb: 14, ast: 6, fg3m: 5 }], error: null })),
      from: () => ({ select: () => ({ in: async () => ({ data: positions, error: null }) }) })
    });
    const withPos = await loadBoard(db([{ player_id: 7, position: 'F-G' }]), 'key');
    expect(withPos.players[0].position).toBe('F-G');
    expect(withPos.defenseByPosition).toEqual({ ORL: { F: { games: 5, pts: 40, reb: 14, ast: 6, fg3m: 5 } } });
    expect(withPos.teams).toEqual({ BOS: [['2026-10-30', 'CHI', true, 125, 111, '2026-27']] });
    const without = await loadBoard(db([]), 'key');
    expect(without.players[0].position).toBeNull();
    expect(without.defenseByPosition).toBeNull();
    vi.unstubAllGlobals();
  });
});
