// @vitest-environment node
import { beforeAll, afterAll, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

let db;
beforeAll(async () => {
  db = new PGlite();
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;alter default privileges grant all on tables to service_role;');
  for (const f of ['20261101210228_provider_cache.sql', '20261101211742_nba_player_games.sql', '20261102002438_nba_signal_editions.sql', '20261102012329_nba_players_positions.sql', '20261102025324_first_party_observability.sql', '20261107014907_prediction_seal_ledger.sql', '20261107015003_ingest_runs.sql'])
    await db.exec(readFileSync(`supabase/migrations/${f}`, 'utf8'));
}, 30000);
afterAll(() => db?.close());

it('records runs, rejects malformed ones and is append-only', async () => {
  await db.query("insert into ingest_runs(sport,kind,provider,trigger,status,started_at,records_in,records_valid) values('mlb','schedule','mlb-statsapi','cron','ok',now(),3,3)");
  await expect(db.query("insert into ingest_runs(sport,kind,provider,trigger,status,started_at,records_in,records_valid) values('mlb','schedule','x','cron','ok',now(),1,3)")).rejects.toThrow();
  await expect(db.query("insert into ingest_runs(sport,kind,provider,trigger,status,started_at) values('cricket','schedule','x','cron','ok',now())")).rejects.toThrow();
  await expect(db.exec("update ingest_runs set status='failed'")).rejects.toThrow();
  await expect(db.exec('delete from ingest_runs')).rejects.toThrow();
});
it('ops_health exposes seals and the latest run per sport and kind', async () => {
  const { rows } = await db.query('select ops_health() as h');
  expect(rows[0].h.runs[0]).toMatchObject({ sport: 'mlb', kind: 'schedule', status: 'ok' });
  expect(rows[0].h.seals).toMatchObject({ count: 0 });
});

it('bankroll limit history is private and append-only', async () => {
  await db.exec(readFileSync('supabase/migrations/20261107021249_bankroll_limits.sql', 'utf8'));
  await db.query(`insert into bankroll_limit_events(user_id,request,applied,deferred) values('u','{"pauseDays":7}','{}','{}')`);
  await expect(db.exec('delete from bankroll_limit_events')).rejects.toThrow();
  await expect(db.exec("update bankroll_limit_events set user_id='x'")).rejects.toThrow();
  await db.exec('set role anon');
  try { await expect(db.exec('select * from bankroll_limits')).rejects.toThrow(); } finally { await db.exec('reset role'); }
});
