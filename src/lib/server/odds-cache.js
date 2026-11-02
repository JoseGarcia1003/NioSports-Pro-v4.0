// NBA game totals from The Odds API, cached so the free plan (500 credits/month)
// is never spent per visitor. One refresh costs 1 credit (1 market x 1 region);
// with a 6 h TTL that is at most ~120 credits per month. The cache lives in Supabase.

export const TOTALS_KEY = 'niosports:odds:nba:totals:v1';
const LOCK_KEY = `${TOTALS_KEY}:lock`;
export const TOTALS_TTL_SECONDS = 6 * 3600;
export const EMPTY_TTL_SECONDS = 3600;
export const DIAG_KEY = 'niosports:odds:nba:last-error:v1';
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
  const age = cached ? now - Date.parse(cached.fetchedAt) : Infinity;
  // A copy with no game still to start is useless for today's lines: refresh it
  // after an hour instead of waiting for the full TTL (≤ 1 extra credit/hour).
  const upcoming = cached && Array.isArray(cached.events) && cached.events.some(e => Date.parse(e.commenceTime) > now);
  if (cached && age < (upcoming ? TOTALS_TTL_SECONDS : EMPTY_TTL_SECONDS) * 1000) return { ok: true, ...cached, cached: true };

  // Only one request refreshes; the rest keep serving the previous copy.
  const gotLock = await store.lock(LOCK_KEY, 60).catch(() => false);
  if (!gotLock) return cached ? { ok: true, ...cached, cached: true, stale: true } : { ok: false, reason: 'refreshing' };

  try {
    const url = `${ODDS_URL}?${new URLSearchParams({ apiKey, regions: 'us', markets: 'totals', oddsFormat: 'decimal', dateFormat: 'iso' })}`;
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(8000) });
    const remaining = Number(res.headers.get('x-requests-remaining'));
    if (!res.ok) {
      await store.put(DIAG_KEY, { market: 'totals', at: new Date(now).toISOString(), upstreamStatus: res.status, quotaRemaining: Number.isFinite(remaining) ? remaining : null }).catch(() => {});
      return cached ? { ok: true, ...cached, cached: true, stale: true } : { ok: false, reason: 'upstream_error', upstreamStatus: res.status };
    }
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

// ── Player props (points) ──────────────────────────────────────────────────
// One request per upcoming game for the player_points market, refreshed at most
// every 12 h and only while the monthly quota keeps a reserve for game totals.
export const PROPS_KEY = 'niosports:odds:nba:player-points:v1';
const PROPS_LOCK = `${PROPS_KEY}:lock`;
export const PROPS_TTL_SECONDS = 12 * 3600;
export const QUOTA_RESERVE = 150;
const EVENT_URL = id => `https://api.the-odds-api.com/v4/sports/basketball_nba/events/${encodeURIComponent(id)}/odds`;

export { playerKey } from '$lib/product/teams.js';
import { playerKey } from '$lib/product/teams.js';

/** Consensus over/under line per player from one event's bookmakers. */
export function normalizePlayerPoints(eventPayload) {
  const byPlayer = new Map();
  for (const book of eventPayload?.bookmakers || []) {
    const market = (book.markets || []).find(m => m.key === 'player_points');
    if (!market) continue;
    const sides = new Map();
    for (const o of market.outcomes || []) {
      if (!o.description || !Number.isFinite(o.point) || !Number.isFinite(o.price)) continue;
      const k = playerKey(o.description);
      const entry = sides.get(k) || { name: o.description };
      if (o.name === 'Over') entry.over = o; else if (o.name === 'Under') entry.under = o;
      sides.set(k, entry);
    }
    for (const [k, s] of sides) {
      if (!s.over || !s.under || s.over.point !== s.under.point) continue;
      const list = byPlayer.get(k) || { name: s.name, books: [] };
      list.books.push({ key: book.key, title: book.title, point: s.over.point, over: s.over.price, under: s.under.price });
      byPlayer.set(k, list);
    }
  }
  const out = {};
  for (const [k, v] of byPlayer) out[k] = { name: v.name, books: v.books, consensus: median(v.books.map(b => b.point)) };
  return out;
}

/**
 * @param {{ store: any, apiKey: string, events: Array<{id:string, commenceTime:string}>, quotaHint?: number|null, fetchImpl?: typeof fetch, now?: number }} deps
 */
export async function getNbaPlayerPoints({ store, apiKey, events, quotaHint = null, fetchImpl = fetch, now = Date.now() }) {
  if (!apiKey) return { ok: false, reason: 'not_configured' };
  if (!store) return { ok: false, reason: 'cache_unavailable' };
  let cached;
  try { cached = await store.get(PROPS_KEY); } catch { return { ok: false, reason: 'cache_unavailable' }; }
  if (cached && now - Date.parse(cached.fetchedAt) < PROPS_TTL_SECONDS * 1000) return { ok: true, ...cached, cached: true };

  const upcoming = (events || []).filter(e => { const t = Date.parse(e.commenceTime); return t > now && t - now < 36 * 3600 * 1000; });
  if (!upcoming.length) return cached ? { ok: true, ...cached, cached: true, stale: true } : { ok: false, reason: 'no_upcoming_games' };

  if (Number.isFinite(quotaHint) && quotaHint < QUOTA_RESERVE) return cached ? { ok: true, ...cached, cached: true, stale: true } : { ok: false, reason: 'quota_reserved' };
  const gotLock = await store.lock(PROPS_LOCK, 120).catch(() => false);
  if (!gotLock) return cached ? { ok: true, ...cached, cached: true, stale: true } : { ok: false, reason: 'refreshing' };
  try {
    const players = {};
    let remaining = Number.isFinite(quotaHint) ? quotaHint : null, lastCost = null, fetched = 0, lastError = null;
    for (const event of upcoming) {
      if (remaining != null && remaining < QUOTA_RESERVE) break;
      const url = `${EVENT_URL(event.id)}?${new URLSearchParams({ apiKey, regions: 'us', markets: 'player_points', oddsFormat: 'decimal', dateFormat: 'iso' })}`;
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(8000) });
      const r = Number(res.headers.get('x-requests-remaining'));
      const c = Number(res.headers.get('x-requests-last'));
      if (Number.isFinite(r)) remaining = r;
      if (Number.isFinite(c)) lastCost = c;
      if (!res.ok) { lastError = res.status; continue; }
      fetched++;
      for (const [k, v] of Object.entries(normalizePlayerPoints(await res.json()))) players[k] = { ...v, eventId: event.id };
    }
    if (!fetched) {
      // Leave a trace (no key, no payload) so a silent failure can be diagnosed later.
      await store.put(DIAG_KEY, { market: 'player_points', at: new Date(now).toISOString(), upstreamStatus: lastError, quotaRemaining: remaining, games: upcoming.length }).catch(() => {});
      return cached ? { ok: true, ...cached, cached: true, stale: true } : { ok: false, reason: 'upstream_error', upstreamStatus: lastError };
    }
    const payload = { source: 'The Odds API', market: 'player_points', fetchedAt: new Date(now).toISOString(), quotaRemaining: remaining, creditsPerGame: lastCost, games: fetched, players };
    await store.put(PROPS_KEY, payload);
    return { ok: true, ...payload, cached: false };
  } catch {
    return cached ? { ok: true, ...cached, cached: true, stale: true } : { ok: false, reason: 'network_error' };
  } finally {
    await store.unlock(PROPS_LOCK).catch(() => {});
  }
}
