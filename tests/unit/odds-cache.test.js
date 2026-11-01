import { describe, it, expect, vi } from 'vitest';
import { getNbaTotals, normalizeTotals, median, sameTeam, TOTALS_KEY } from '../../src/lib/server/odds-cache.js';

const event = (books) => ({ id: 'e1', commence_time: '2026-11-01T20:30:00Z', home_team: 'Orlando Magic', away_team: 'Boston Celtics', bookmakers: books });
const book = (key, point, over = 1.91, under = 1.91) => ({ key, title: key, markets: [{ key: 'totals', last_update: '2026-11-01T18:00:00Z', outcomes: [{ name: 'Over', price: over, point }, { name: 'Under', price: under, point }] }] });

function fakeRedis(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    store,
    get: vi.fn(async k => store.get(k) ?? null),
    set: vi.fn(async (k, v, opts) => { if (opts?.nx && store.has(k)) return null; store.set(k, v); return 'OK'; }),
    del: vi.fn(async k => { store.delete(k); return 1; })
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
    expect(await getNbaTotals({ redis: null, apiKey: 'k', fetchImpl })).toEqual({ ok: false, reason: 'cache_unavailable' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('serves a fresh cached copy without spending credits', async () => {
    const now = Date.parse('2026-11-01T20:00:00Z');
    const redis = fakeRedis({ [TOTALS_KEY]: { source: 'The Odds API', fetchedAt: '2026-11-01T18:00:00Z', events: [] } });
    const fetchImpl = vi.fn();
    const r = await getNbaTotals({ redis, apiKey: 'k', fetchImpl, now });
    expect(r.ok).toBe(true);
    expect(r.cached).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('refreshes once when stale and stores the result', async () => {
    const now = Date.parse('2026-11-02T03:00:00Z');
    const redis = fakeRedis({ [TOTALS_KEY]: { fetchedAt: '2026-11-01T18:00:00Z', events: [] } });
    const fetchImpl = vi.fn().mockResolvedValue(okResponse([event([book('a', 228.5)])]));
    const r = await getNbaTotals({ redis, apiKey: 'k', fetchImpl, now });
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
    const r = await getNbaTotals({ redis, apiKey: 'k', fetchImpl, now });
    expect(r.stale).toBe(true);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('reports an upstream failure without inventing lines', async () => {
    const redis = fakeRedis();
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 401 }));
    expect(await getNbaTotals({ redis, apiKey: 'k', fetchImpl })).toEqual({ ok: false, reason: 'upstream_error', upstreamStatus: 401 });
  });

  it('matches team names across providers by nickname', () => {
    expect(sameTeam('Los Angeles Clippers', 'Clippers')).toBe(true);
    expect(sameTeam('Portland Trail Blazers', 'Trail Blazers')).toBe(true);
    expect(sameTeam('Los Angeles Lakers', 'Clippers')).toBe(false);
  });
});
