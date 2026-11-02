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
