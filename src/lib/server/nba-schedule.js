// One cached copy of each day's NBA schedule for the whole site. Every page
// that lists games (landing, Hoy, Partidos, props, signals) reads it, so the
// provider sees a handful of requests per hour however many visitors arrive
// (the free tier allows 5 per minute). If the provider fails, the last copy is
// served and labelled as stale; without any copy the caller gets an error —
// never invented games.
import { supabaseStore } from './odds-cache.js';

const BDL = 'https://api.balldontlie.io/v1/games';
const MIN = 60 * 1000;

/** Freshness window by game state: live scores move, finished days do not. */
export function scheduleTtl(games, now = Date.now()) {
  if (!games.length) return 30 * MIN;
  const state = g => String(g.status_state || g.status || '');
  if (games.every(g => /final/i.test(state(g)))) return 6 * 60 * MIN;
  const started = games.some(g => Date.parse(g.datetime) <= now && !/final/i.test(state(g)));
  return started ? MIN : 10 * MIN;
}

export async function fetchSchedule(day, apiKey, fetchImpl = fetch) {
  const res = await fetchImpl(`${BDL}?${new URLSearchParams({ 'dates[]': day, per_page: '100' })}`, { headers: { Authorization: apiKey }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw Object.assign(new Error(`schedule ${res.status}`), { upstreamStatus: res.status });
  const body = await res.json();
  if (!Array.isArray(body.data) || body.data.some(g => !g || g.id == null || !g.home_team?.abbreviation || !g.visitor_team?.abbreviation)) throw new Error('schedule payload');
  return body.data;
}

/** @returns {{ games: object[], fetchedAt: string, stale: boolean }} raw provider games */
export async function nbaSchedule(db, day, apiKey, { now = Date.now(), fetchImpl = fetch, store = supabaseStore(db) } = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('invalid_day');
  const key = `nba:schedule:${day}`;
  const hit = await store.get(key).catch(() => null);
  const valid = hit && Array.isArray(hit.games) && Number.isFinite(Date.parse(hit.fetchedAt));
  if (valid && now - Date.parse(hit.fetchedAt) < scheduleTtl(hit.games, now)) return { games: hit.games, fetchedAt: hit.fetchedAt, stale: false };
  if (!apiKey) { if (valid) return { games: hit.games, fetchedAt: hit.fetchedAt, stale: true }; throw new Error('schedule_unavailable'); }
  try {
    const games = await fetchSchedule(day, apiKey, fetchImpl);
    const fetchedAt = new Date(now).toISOString();
    await store.put(key, { games, fetchedAt }).catch(() => {});
    return { games, fetchedAt, stale: false };
  } catch (e) {
    // A copy from the last day is better than no schedule; older ones are not trusted.
    if (valid && now - Date.parse(hit.fetchedAt) < 24 * 60 * MIN) return { games: hit.games, fetchedAt: hit.fetchedAt, stale: true };
    throw Object.assign(new Error('schedule_unavailable'), { upstreamStatus: e?.upstreamStatus ?? null });
  }
}
