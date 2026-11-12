import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { adminDatabase } from '$lib/server/entitlements.js';
import { nbaSchedule } from '$lib/server/nba-schedule.js';
import { dayFor } from '$lib/server/nba-props.js';

// Public NBA schedule for today or tomorrow (New York calendar),
// served from the shared cache. It accepts nothing else, so it cannot be used
// as a relay to the provider. Without a confirmed schedule it answers with an
// explicit error and no data; it never fills in sample games.
function unavailable(status, reason, upstreamStatus) {
  const headers = { 'X-Data-Source': 'unavailable', 'Cache-Control': 'no-store' };
  if (upstreamStatus) headers['X-Upstream-Status'] = String(upstreamStatus);
  return json({ error: 'NBA data source unavailable', reason, data: null }, { status, headers });
}

export async function GET({ url }) {
  const day = url.searchParams.get('day') || dayFor(0);
  if (![dayFor(0), dayFor(1)].includes(day)) return json({ error: 'Day not allowed' }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  let db;
  try { db = adminDatabase(); } catch { return unavailable(503, 'not_configured'); }
  try {
    const s = await nbaSchedule(db, day, env.BALLDONTLIE_API_KEY || '');
    return json({ data: s.games, day, fetchedAt: s.fetchedAt, stale: s.stale }, { headers: { 'X-Data-Source': 'balldontlie', 'Cache-Control': 'public, max-age=30, s-maxage=60' } });
  } catch (e) {
    return unavailable(e?.upstreamStatus ? 502 : 503, e?.upstreamStatus === 401 ? 'unauthorized' : e?.upstreamStatus === 429 ? 'rate_limited' : 'unavailable', e?.upstreamStatus);
  }
}
