// @vitest-environment node
import { it, expect, describe, vi, afterEach } from 'vitest';
import { nbaSchedule, scheduleTtl } from '../../src/lib/server/nba-schedule.js';
import { loadBoxScores } from '../../src/lib/server/signal-results.js';
import { settle } from '../../src/lib/nba/signals.js';

const game = (id, o = {}) => ({ id, datetime: '2026-11-12T00:30:00Z', status: '2026-11-12T00:30:00Z', home_team: { abbreviation: 'BOS', full_name: 'Boston Celtics' }, visitor_team: { abbreviation: 'ORL', full_name: 'Orlando Magic' }, ...o });
const memory = () => { const m = new Map(); return { m, get: async k => m.get(k) ?? null, put: async (k, v) => { m.set(k, v); } }; };
const ok = games => async () => new Response(JSON.stringify({ data: games }));
const T0 = Date.parse('2026-11-11T18:00:00Z');

describe('shared NBA schedule cache', () => {
  it('asks the provider once and serves everyone else from the cache', async () => {
    const store = memory(); const fetchImpl = vi.fn(ok([game(1)]));
    const a = await nbaSchedule(null, '2026-11-11', 'k', { store, fetchImpl, now: T0 });
    const b = await nbaSchedule(null, '2026-11-11', 'k', { store, fetchImpl, now: T0 + 5 * 60e3 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(b).toMatchObject({ stale: false, fetchedAt: a.fetchedAt }); expect(b.games).toHaveLength(1);
  });
  it('refreshes every minute while games are live and rarely once all are final', () => {
    expect(scheduleTtl([game(1)], T0)).toBe(10 * 60e3);
    expect(scheduleTtl([game(1, { status: '2nd Qtr' })], Date.parse('2026-11-12T01:00:00Z'))).toBe(60e3);
    expect(scheduleTtl([game(1, { status: 'Final' })], T0)).toBe(6 * 3600e3);
    expect(scheduleTtl([], T0)).toBe(30 * 60e3);
  });
  it('serves a labelled stale copy when the provider fails, and nothing when there is no copy', async () => {
    const store = memory();
    await nbaSchedule(null, '2026-11-11', 'k', { store, fetchImpl: ok([game(1)]), now: T0 });
    const down = async () => new Response('{}', { status: 429 });
    expect(await nbaSchedule(null, '2026-11-11', 'k', { store, fetchImpl: down, now: T0 + 3600e3 })).toMatchObject({ stale: true });
    await expect(nbaSchedule(null, '2026-11-11', 'k', { store, fetchImpl: down, now: T0 + 30 * 3600e3 })).rejects.toMatchObject({ message: 'schedule_unavailable', upstreamStatus: 429 });
    await expect(nbaSchedule(null, '2026-11-12', 'k', { store: memory(), fetchImpl: down, now: T0 })).rejects.toThrow('schedule_unavailable');
    await expect(nbaSchedule(null, '2026-11-12', '', { store: memory(), now: T0 })).rejects.toThrow('schedule_unavailable');
  });
  it('rejects malformed provider data and arbitrary input instead of caching it', async () => {
    const store = memory();
    await expect(nbaSchedule(null, '2026-11-11', 'k', { store, fetchImpl: ok([{ id: 1 }]), now: T0 })).rejects.toThrow();
    expect(store.m.size).toBe(0);
    await expect(nbaSchedule(null, "x' or 1=1", 'k', { store })).rejects.toThrow('invalid_day');
  });
});

describe('public schedule endpoint', () => {
  afterEach(() => vi.resetModules());
  it('only accepts today or tomorrow, so it cannot relay arbitrary provider requests', async () => {
    const { GET } = await import('../../src/routes/api/nba/schedule/+server.js');
    for (const q of ['day=2020-01-01', 'day=..%2F..%2Fplayers', 'day=2026-11-12%26per_page%3D100']) {
      const res = await GET({ url: new URL(`http://localhost/api/nba/schedule?${q}`) });
      expect(res.status).toBe(400);
    }
  });
});

describe('results of sealed signals', () => {
  const db = (rows, teams) => ({ from: () => ({ select: () => ({ in: () => ({ in: async () => ({ data: rows, error: null }) }) }) }), rpc: async () => ({ data: teams, error: null }) });
  it('voids a player who did not play when his team did, and keeps unknown games pending', async () => {
    const boxFor = await loadBoxScores(db([{ player_id: 1, game_date: '2026-11-08', pts: 30, minutes: '34.5' }], [{ team: 'BOS', game_date: '2026-11-08' }]),
      [['2026-11-08', [{ playerId: 1, team: 'BOS' }, { playerId: 2, team: 'BOS' }, { playerId: 3, team: 'DEN' }]]]);
    const e = (playerId, team) => ({ playerId, team, side: 'over', line: 24.5 });
    expect(settle(e(1, 'BOS'), boxFor(e(1, 'BOS'), '2026-11-08'))).toMatchObject({ status: 'hit', actual: 30 });
    expect(settle(e(2, 'BOS'), boxFor(e(2, 'BOS'), '2026-11-08'))).toMatchObject({ status: 'void', reason: 'No jugó' });
    expect(settle(e(3, 'DEN'), boxFor(e(3, 'DEN'), '2026-11-08'))).toEqual({ status: 'pending' });
  });
});
