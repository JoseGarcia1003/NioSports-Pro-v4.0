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
