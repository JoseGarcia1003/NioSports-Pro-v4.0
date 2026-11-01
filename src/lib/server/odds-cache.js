// NBA game totals from The Odds API, cached so the free plan (500 credits/month)
// is never spent per visitor. One refresh costs 1 credit (1 market x 1 region);
// with a 6 h TTL that is at most ~120 credits per month. The cache lives in Supabase.

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
 * Cache store contract: get(key) → payload|null, put(key, payload), lock(key, seconds) → boolean, unlock(key).
 * @param {{ store: any, apiKey: string, fetchImpl?: typeof fetch, now?: number }} deps
 */
export async function getNbaTotals({ store, apiKey, fetchImpl = fetch, now = Date.now() }) {
  if (!apiKey) return { ok: false, reason: 'not_configured' };
  // Without the cache every visitor would spend credits: refuse instead.
  if (!store) return { ok: false, reason: 'cache_unavailable' };

  let cached;
  try { cached = await store.get(TOTALS_KEY); } catch { return { ok: false, reason: 'cache_unavailable' }; }
  if (cached && now - Date.parse(cached.fetchedAt) < TOTALS_TTL_SECONDS * 1000) return { ok: true, ...cached, cached: true };

  // Only one request refreshes; the rest keep serving the previous copy.
  const gotLock = await store.lock(LOCK_KEY, 60).catch(() => false);
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
    await store.put(TOTALS_KEY, payload);
    return { ok: true, ...payload, cached: false };
  } catch {
    return cached ? { ok: true, ...cached, cached: true, stale: true } : { ok: false, reason: 'network_error' };
  } finally {
    await store.unlock(LOCK_KEY).catch(() => {});
  }
}

export { sameTeam } from '$lib/product/teams.js';

// Supabase-backed store (server only, service role; tables provider_cache/provider_locks).
export function supabaseStore(db) {
  return {
    async get(key) {
      const { data, error } = await db.from('provider_cache').select('payload').eq('key', key).maybeSingle();
      if (error) throw error;
      return data?.payload ?? null;
    },
    async put(key, payload) {
      const { error } = await db.from('provider_cache').upsert({ key, payload, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    async lock(key, seconds) {
      const { data, error } = await db.rpc('try_provider_lock', { p_key: key, p_seconds: seconds });
      if (error) throw error;
      return data === true;
    },
    async unlock(key) {
      await db.from('provider_locks').delete().eq('key', key);
    }
  };
}
