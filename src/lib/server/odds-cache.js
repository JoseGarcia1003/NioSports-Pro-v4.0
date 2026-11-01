// NBA game totals from The Odds API, cached so the free plan (500 credits/month)
// is never spent per visitor. One refresh costs 1 credit (1 market x 1 region);
// with a 6 h TTL that is at most ~120 credits per month.

export const TOTALS_KEY = 'niosports:odds:nba:totals:v1';
const LOCK_KEY = `${TOTALS_KEY}:lock`;
export const TOTALS_TTL_SECONDS = 6 * 3600;
const ODDS_URL = 'https://api.the-odds-api.com/v4/sports/basketball_nba/odds';

export function normalizeTotals(events) {
  if (!Array.isArray(events)) throw new Error('Unexpected odds payload');
  return events.map(event => {
    const books = (event.bookmakers || []).map(book => {
      const market = (book.markets || []).find(m => m.key === 'totals');
      const over = market?.outcomes?.find(o => o.name === 'Over');
      const under = market?.outcomes?.find(o => o.name === 'Under');
      if (!over || !under || !Number.isFinite(over.point) || over.point !== under.point) return null;
      if (!Number.isFinite(over.price) || !Number.isFinite(under.price)) return null;
      return { key: book.key, title: book.title, lastUpdate: market.last_update || book.last_update || null, point: over.point, over: over.price, under: under.price };
    }).filter(Boolean);
    return { id: event.id, commenceTime: event.commence_time, home: event.home_team, away: event.away_team, books, consensus: median(books.map(b => b.point)) };
  });
}

export function median(values) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/**
 * @param {{ redis: any, apiKey: string, fetchImpl?: typeof fetch, now?: number }} deps
 */
export async function getNbaTotals({ redis, apiKey, fetchImpl = fetch, now = Date.now() }) {
  if (!apiKey) return { ok: false, reason: 'not_configured' };
  // Without the cache every visitor would spend credits: refuse instead.
  if (!redis) return { ok: false, reason: 'cache_unavailable' };

  let cached;
  try { cached = await redis.get(TOTALS_KEY); } catch { return { ok: false, reason: 'cache_unavailable' }; }
  if (cached && now - Date.parse(cached.fetchedAt) < TOTALS_TTL_SECONDS * 1000) return { ok: true, ...cached, cached: true };

  // Only one request refreshes; the rest keep serving the previous copy.
  const gotLock = await redis.set(LOCK_KEY, '1', { nx: true, ex: 60 }).catch(() => null);
  if (!gotLock) return cached ? { ok: true, ...cached, cached: true, stale: true } : { ok: false, reason: 'refreshing' };

  try {
    const url = `${ODDS_URL}?${new URLSearchParams({ apiKey, regions: 'us', markets: 'totals', oddsFormat: 'decimal', dateFormat: 'iso' })}`;
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(8000) });
    const remaining = Number(res.headers.get('x-requests-remaining'));
    if (!res.ok) return cached ? { ok: true, ...cached, cached: true, stale: true } : { ok: false, reason: 'upstream_error', upstreamStatus: res.status };
    const payload = {
      source: 'The Odds API',
      fetchedAt: new Date(now).toISOString(),
      quotaRemaining: Number.isFinite(remaining) ? remaining : null,
      events: normalizeTotals(await res.json())
    };
    await redis.set(TOTALS_KEY, payload, { ex: TOTALS_TTL_SECONDS * 4 });
    return { ok: true, ...payload, cached: false };
  } catch {
    return cached ? { ok: true, ...cached, cached: true, stale: true } : { ok: false, reason: 'network_error' };
  } finally {
    await redis.del(LOCK_KEY).catch(() => {});
  }
}

export { sameTeam } from '$lib/product/teams.js';
