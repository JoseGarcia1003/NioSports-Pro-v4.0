import { beforeEach, expect, it, vi } from 'vitest';

const fixture = vi.hoisted(() => ({ rows: {}, writes: [] }));
vi.mock('$env/dynamic/private', () => ({ env: {
  CRON_SECRET: 'fixture', BALLDONTLIE_API_KEY: 'fixture', VITE_SUPABASE_URL: 'https://fixture.test',
} }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from(table) {
  const filters = [];
  let updates;
  const query = {
    select() { return query; },
    eq(key, value) { filters.push(row => row[key] === value); return query; },
    is(key, value) { filters.push(row => row[key] === value); return query; },
    update(value) { updates = value; return query; },
    async throwOnError() {
      const rows = fixture.rows[table].filter(row => filters.every(filter => filter(row)));
      if (updates) for (const row of rows) {
        fixture.writes.push({ table, id: row.id, updates });
        Object.assign(row, updates);
      }
      return { data: rows.map(row => ({ ...row })) };
    },
  };
  return query;
} }) }));
import { GET } from '../../src/routes/api/cron/verify-results/+server.js';

beforeEach(() => {
  const date = new Date(); date.setUTCDate(date.getUTCDate() - 1);
  fixture.rows = {
    games: [1, 2].map(id => ({ id: `game-${id}`, external_id: String(id), date: date.toISOString().slice(0, 10) })),
    picks: [1, 2].flatMap(id => ['FULL', 'HALF', 'Q1'].map(period => ({
      id: `${id}-${period}`, game_id: `game-${id}`, period, status: 'pending', line: 200,
      bet_type: 'OVER', source: 'manual',
    }))),
    predictions: [1, 2].map(id => ({ id, game_id: `game-${id}`, period: 'FULL',
      result: null, source: 'live', direction: 'OVER', line: 200 })),
  };
  fixture.writes = [];
  vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ data: [
    { id: 1, status: 'Final', home_team_score: 110, visitor_team_score: 100 },
    { id: 2, status: 'Final', home_team_score: 90, visitor_team_score: 90 },
  ] }) });
});
const invoke = () => GET({ request: new Request('https://fixture.test', { headers: { authorization: 'Bearer fixture' } }) });

it('isolates two games and leaves Q1/HALF pending, including a retry', async () => {
  const response = await invoke();
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ picks_resolved: 2, predictions_resolved: 2 });
  expect(fixture.rows.picks.find(row => row.id === '1-FULL').status).toBe('win');
  expect(fixture.rows.picks.find(row => row.id === '2-FULL').status).toBe('loss');
  expect(fixture.rows.picks.filter(row => row.period !== 'FULL').every(row => row.status === 'pending')).toBe(true);
  expect(await (await invoke()).json()).toMatchObject({ picks_resolved: 0, predictions_resolved: 0 });
  expect(fixture.writes).toHaveLength(4);
});

it('abstains on ambiguous provider mappings', async () => {
  fixture.rows.games.push({ ...fixture.rows.games[0], id: 'duplicate' });
  await invoke();
  expect(fixture.writes.every(write => write.id === '2-FULL' || write.id === 2)).toBe(true);
});

it('does not write after a provider failure', async () => {
  vi.mocked(fetch).mockResolvedValue({ ok: false });
  expect((await invoke()).status).toBe(500);
  expect(fixture.writes).toHaveLength(0);
});
