import { json, error } from '@sveltejs/kit';
import { adminDatabase } from '$lib/server/entitlements.js';
import { supabaseStore } from '$lib/server/odds-cache.js';
import { SPORTS_CONFIG } from '$lib/sports/config.js';
import { ADAPTERS } from '$lib/sports/providers/index.js';
import { freshness } from '$lib/sports/core/freshness.js';

// Serves only what the daily sync stored (with provenance). Never fetches or
// fabricates on request; an empty answer says why.
export async function GET({ params, url }) {
  const cfg = SPORTS_CONFIG[params.sport];
  if (!cfg) error(404, 'Unknown sport');
  const day = url.searchParams.get('day') || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) error(400, 'Invalid day');
  const cached = await supabaseStore(adminDatabase()).get(`sched:${params.sport}:${day}`).catch(() => null);
  if (!cached) return json({ sport: params.sport, day, events: [], reason: 'not_synced' }, { headers: { 'Cache-Control': 'public, max-age=120' } });
  const fresh = freshness(cfg.freshness.schedule, cached.fetchedAt, Date.now());
  const adapter = ADAPTERS[cached.provider];
  return json({ sport: params.sport, day, events: cached.events, provider: cached.provider, providerVerified: !!adapter?.verified, fetchedAt: cached.fetchedAt, stale: !fresh.usable },
    { headers: { 'Cache-Control': 'public, max-age=120' } });
}
