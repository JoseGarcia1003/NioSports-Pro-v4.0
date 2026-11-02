import { describe, it, expect, vi } from 'vitest';
import { getNbaTotals, normalizeTotals, median, sameTeam, supabaseStore, TOTALS_KEY } from '../../src/lib/server/odds-cache.js';

const event = (books) => ({ id: 'e1', commence_time: '2026-11-01T20:30:00Z', home_team: 'Orlando Magic', away_team: 'Boston Celtics', bookmakers: books });
const book = (key, point, over = 1.91, under = 1.91) => ({ key, title: key, markets: [{ key: 'totals', last_update: '2026-11-01T18:00:00Z', outcomes: [{ name: 'Over', price: over, point }, { name: 'Under', price: under, point }] }] });

function fakeRedis(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    get: vi.fn(async k => store.get(k) ?? null),
    put: vi.fn(async (k, v) => { store.set(k, v); }),
    lock: vi.fn(async k => { if (store.has(k)) return false; store.set(k, '1'); return true; }),
    unlock: vi.fn(async k => { store.delete(k); })
  };
}
const okResponse = body => new Response(JSON.stringify(body), { status: 200, headers: { 'x-requests-remaining': '499' } });

describe('NBA totals cache', () => {
  it('normalizes totals and computes the consensus line', () => {
    const [e] = normalizeTotals([event([book('a', 227.5), book('b', 228.5), book('c', 228.5)])]);
    expect(e.books).toHaveLength(3);
    expect(e.consensus).toBe(228.5);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
  });

  it('drops bookmakers with inconsistent over/under lines', () => {
    const bad = { key: 'x', title: 'x', markets: [{ key: 'totals', outcomes: [{ name: 'Over', price: 1.9, point: 227.5 }, { name: 'Under', price: 1.9, point: 228.5 }] }] };
    expect(normalizeTotals([event([bad])])[0].books).toEqual([]);
  });

  it('refuses to call the provider without a cache, to protect the credit quota', async () => {
    const fetchImpl = vi.fn();
    expect(await getNbaTotals({ store: null, apiKey: 'k', fetchImpl })).toEqual({ ok: false, reason: 'cache_unavailable' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('serves a fresh cached copy without spending credits', async () => {
    const now = Date.parse('2026-11-01T20:00:00Z');
    const redis = fakeRedis({ [TOTALS_KEY]: { source: 'The Odds API', fetchedAt: '2026-11-01T18:00:00Z', events: [] } });
    const fetchImpl = vi.fn();
    const r = await getNbaTotals({ store: redis, apiKey: 'k', fetchImpl, now });
    expect(r.ok).toBe(true);
    expect(r.cached).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('refreshes once when stale and stores the result', async () => {
    const now = Date.parse('2026-11-02T03:00:00Z');
    const redis = fakeRedis({ [TOTALS_KEY]: { fetchedAt: '2026-11-01T18:00:00Z', events: [] } });
    const fetchImpl = vi.fn().mockResolvedValue(okResponse([event([book('a', 228.5)])]));
    const r = await getNbaTotals({ store: redis, apiKey: 'k', fetchImpl, now });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(fetchImpl.mock.calls[0][0])).toContain('markets=totals');
    expect(r.cached).toBe(false);
    expect(r.quotaRemaining).toBe(499);
    expect(redis.store.get(TOTALS_KEY).events[0].consensus).toBe(228.5);
  });

  it('keeps serving the old copy while another request holds the refresh lock', async () => {
    const now = Date.parse('2026-11-02T03:00:00Z');
    const redis = fakeRedis({ [TOTALS_KEY]: { fetchedAt: '2026-11-01T18:00:00Z', events: [] }, [`${TOTALS_KEY}:lock`]: '1' });
    const fetchImpl = vi.fn();
    const r = await getNbaTotals({ store: redis, apiKey: 'k', fetchImpl, now });
    expect(r.stale).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('reports an upstream failure without inventing lines', async () => {
    const redis = fakeRedis();
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 401 }));
    expect(await getNbaTotals({ store: redis, apiKey: 'k', fetchImpl })).toEqual({ ok: false, reason: 'upstream_error', upstreamStatus: 401 });
  });

  it('matches team names across providers by nickname', () => {
    expect(sameTeam('Los Angeles Clippers', 'Clippers')).toBe(true);
    expect(sameTeam('Portland Trail Blazers', 'Trail Blazers')).toBe(true);
    expect(sameTeam('Los Angeles Lakers', 'Clippers')).toBe(false);
  });

  it('maps the store contract onto Supabase tables and the lock function', async () => {
    const calls = [];
    const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => ({ data: { payload: { x: 1 } }, error: null }), upsert: async row => { calls.push(['upsert', row.key]); return { error: null }; }, delete: () => ({ eq: async () => { calls.push(['delete']); return {}; } }) };
    const db = { from: t => { calls.push(['from', t]); return chain; }, rpc: async (fn, args) => { calls.push(['rpc', fn, args.p_seconds]); return { data: true, error: null }; } };
    const s = supabaseStore(db);
    expect(await s.get('k')).toEqual({ x: 1 });
    expect(await s.lock('k', 60)).toBe(true);
    await s.put('k', {});
    await s.unlock('k');
    expect(calls).toContainEqual(['from', 'provider_cache']);
    expect(calls).toContainEqual(['rpc', 'try_provider_lock', 60]);
    expect(calls).toContainEqual(['from', 'provider_locks']);
  });
});

import { playerKey, normalizePlayerPoints, getNbaPlayerPoints, PROPS_KEY } from '../../src/lib/server/odds-cache.js';
describe('player points lines', () => {
  const ev = { bookmakers: [
    { key: 'a', title: 'A', markets: [{ key: 'player_points', outcomes: [{ name: 'Over', description: 'Luka Dončić', point: 33.5, price: 1.9 }, { name: 'Under', description: 'Luka Dončić', point: 33.5, price: 1.9 }, { name: 'Over', description: 'Jaren Jackson Jr.', point: 18.5, price: 1.8 }, { name: 'Under', description: 'Jaren Jackson Jr.', point: 19.5, price: 1.9 }] }] },
    { key: 'b', title: 'B', markets: [{ key: 'player_points', outcomes: [{ name: 'Over', description: 'Luka Doncic', point: 34.5, price: 1.9 }, { name: 'Under', description: 'Luka Doncic', point: 34.5, price: 1.9 }] }] }
  ] };
  it('matches names regardless of accents and suffixes', () => {
    expect(playerKey('Luka Dončić')).toBe(playerKey('LUKA DONCIC'));
    expect(playerKey('Jaren Jackson Jr.')).toBe('jaren jackson');
  });
  it('builds a consensus per player and drops inconsistent sides', () => {
    const out = normalizePlayerPoints(ev);
    expect(out['luka doncic'].consensus).toBe(34);
    expect(out['luka doncic'].books).toHaveLength(2);
    expect(out['jaren jackson']).toBeUndefined();
  });
  const store = () => { const m = new Map(); return { m, get: async k => m.get(k) ?? null, put: async (k, v) => m.set(k, v), lock: async k => (m.has(k) ? false : (m.set(k, 1), true)), unlock: async k => m.delete(k) }; };
  const now = Date.parse('2026-11-02T15:00:00Z');
  const events = [{ id: 'e1', commenceTime: '2026-11-02T23:00:00Z' }, { id: 'e2', commenceTime: '2026-11-02T10:00:00Z' }];
  it('only queries upcoming games and records quota and cost', async () => {
    const s = store();
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(ev), { headers: { 'x-requests-remaining': '480', 'x-requests-last': '1' } }));
    const r = await getNbaPlayerPoints({ store: s, apiKey: 'k', events, quotaHint: 490, fetchImpl, now });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(fetchImpl.mock.calls[0][0])).toContain('/events/e1/odds');
    expect(String(fetchImpl.mock.calls[0][0])).toContain('markets=player_points');
    expect(r).toMatchObject({ ok: true, quotaRemaining: 480, creditsPerGame: 1, games: 1 });
    expect(s.m.get(PROPS_KEY).players['luka doncic'].eventId).toBe('e1');
  });
  it('keeps a quota reserve for game totals', async () => {
    const fetchImpl = vi.fn();
    expect(await getNbaPlayerPoints({ store: store(), apiKey: 'k', events, quotaHint: 120, fetchImpl, now })).toEqual({ ok: false, reason: 'quota_reserved' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  it('serves the cached copy within 12 hours without spending credits', async () => {
    const s = store(); s.m.set(PROPS_KEY, { fetchedAt: '2026-11-02T08:00:00Z', players: {} });
    const fetchImpl = vi.fn();
    expect((await getNbaPlayerPoints({ store: s, apiKey: 'k', events, quotaHint: 400, fetchImpl, now })).cached).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
