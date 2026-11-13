// @vitest-environment node
import { it, expect, vi } from 'vitest';
vi.mock('$env/dynamic/private', () => ({ env: {} }));
import { runDaily, withDeadline } from '../../src/lib/server/daily.js';
import { syncNbaBoxScores } from '../../src/lib/server/nba-boxscore-sync.js';

function fakeDb() {
  const runs = [];
  const chain = () => { const q = { select: () => q, order: () => q, limit: () => q, in: () => q, eq: () => q, gte: () => q, maybeSingle: async () => ({ data: null, error: null }), then: (r) => r({ data: [], error: null }) }; return q; };
  return { runs, rpc: async () => ({ data: [], error: null }), from: t => (t === 'ingest_runs' ? { insert: async r => { runs.push(r); return { error: null }; } } : { ...chain(), upsert: async () => ({ error: null }), insert: async () => ({ error: null }) }) };
}

it('withDeadline returns the fallback instead of waiting for a hung step', async () => {
  expect(await withDeadline(new Promise(() => {}), 20, 'late')).toBe('late');
  expect(await withDeadline(Promise.resolve('ok'), 20, 'late')).toBe('ok');
});

it('a provider that never answers cannot stop the other steps or the run from finishing', async () => {
  const db = fakeDb();
  const hung = () => new Promise(() => {});
  const result = await runDaily(db, {}, { boxScoreBudgetMs: 50, sync: hung, edition: async () => ({ day: '2026-11-13', edition: null, created: false, reason: 'data_stale' }) });
  expect(result.steps.boxScores).toEqual({ status: 'failed', error: 'deadline_exceeded' });
  // Schedules of the four sports were still attempted and recorded (skipped: no providers configured here).
  expect(Object.keys(result.steps.schedules)).toEqual(['nba', 'football', 'tennis', 'mlb']);
  expect(db.runs.filter(r => r.kind === 'schedule').length).toBeGreaterThanOrEqual(3);
  expect(result.steps.edition).toMatchObject({ sealed: false, reason: 'data_stale' });
}, 15000);

it('the box score sync always records its run inside its own budget, even when every request hangs until its timeout', async () => {
  const db = fakeDb(); let t = 0;
  // Each provider call "takes" its whole timeout and then fails, as an unreachable host would.
  const slow = async ({ timeoutMs }) => { t += timeoutMs; throw Object.assign(new Error('timeout'), { code: 'timeout' }); };
  const r = await syncNbaBoxScores(db, { today: '2026-11-13', budgetMs: 25000, now: () => t, provider: { id: 'nba-cdn', limits: { capacity: 100, perMs: 1000 }, schedule: slow, scoreboard: slow, boxScore: slow } });
  expect(r).toMatchObject({ status: 'failed', error_code: 'timeout' });
  expect(t).toBeLessThanOrEqual(25000);
  expect(db.runs).toHaveLength(1); expect(db.runs[0]).toMatchObject({ kind: 'boxscores', status: 'failed' });
});
